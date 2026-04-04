// Google Patents Search via SerpApi
// Searches 100+ patent offices worldwide via Google Patents
//
// Authentication: API key from serpapi.com
// Rate limits: Depends on plan (~5k searches/mo at $75/mo)
// Cached searches are free (don't count against quota)
//
// Docs: https://serpapi.com/google-patents-api

import type { PatentReference } from './uspto'

// SerpApi Google Patents response types

export interface SerpApiPatentResult {
  position: number
  rank: number
  patent_id?: string
  patent_link?: string
  serpapi_link?: string
  title: string
  snippet: string
  priority_date?: string
  filing_date?: string
  grant_date?: string
  publication_date?: string
  inventor?: string
  assignee?: string
  publication_number?: string
  language?: string
  thumbnail?: string
  pdf?: string
  figures?: Array<{ thumbnail: string; full: string }>
  country_status?: Record<string, 'ACTIVE' | 'NOT_ACTIVE' | 'UNKNOWN'>
  is_scholar?: boolean
}

export interface SerpApiSearchInformation {
  total_results: number
  total_pages: number
  page_number: number
}

export interface SerpApiGooglePatentsResponse {
  search_metadata: {
    id: string
    status: string
    total_time_taken: number
    error?: string
  }
  search_parameters: Record<string, string>
  search_information: SerpApiSearchInformation
  organic_results?: SerpApiPatentResult[]
  error?: string
}

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json'

/**
 * Google Patents search client via SerpApi
 */
export class GooglePatentsClient {
  private apiKey: string
  private lastRequestTime = 0
  private readonly minRequestInterval = 500 // conservative spacing

  constructor(apiKey?: string) {
    const key = (apiKey || process.env.SERPAPI_API_KEY)?.trim()
    if (!key) {
      throw new Error('SERPAPI_API_KEY required. Get one at https://serpapi.com')
    }
    this.apiKey = key
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      )
    }
    this.lastRequestTime = Date.now()
  }

  /**
   * Search Google Patents via SerpApi
   */
  async searchPatents(params: {
    query: string
    num?: number
    sort?: 'new' | 'old'
    country?: string
    language?: string
    status?: 'GRANT' | 'APPLICATION'
    type?: 'PATENT' | 'DESIGN'
    before?: string // e.g. "filing:20231231"
    after?: string  // e.g. "filing:20200101"
  }): Promise<{
    results: SerpApiPatentResult[]
    totalResults: number
    error?: string
  }> {
    await this.enforceRateLimit()

    try {
      const searchParams = new URLSearchParams({
        engine: 'google_patents',
        q: params.query,
        api_key: this.apiKey,
        num: String(params.num || 10),
      })

      if (params.sort) searchParams.set('sort', params.sort)
      if (params.country) searchParams.set('country', params.country)
      if (params.language) searchParams.set('language', params.language)
      if (params.status) searchParams.set('status', params.status)
      if (params.type) searchParams.set('type', params.type)
      if (params.before) searchParams.set('before', params.before)
      if (params.after) searchParams.set('after', params.after)

      // Only include patent results, not scholar
      searchParams.set('patents', 'true')
      searchParams.set('scholar', 'false')

      const url = `${SERPAPI_BASE_URL}?${searchParams.toString()}`
      console.log(`[Google Patents] Searching: "${params.query}"`)

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('SerpApi authentication failed. Check SERPAPI_API_KEY.')
        }
        if (response.status === 429) {
          throw new Error('SerpApi rate limit exceeded. Please wait or upgrade plan.')
        }
        const errorBody = await response.text()
        throw new Error(`SerpApi error ${response.status}: ${errorBody}`)
      }

      const data = await response.json() as SerpApiGooglePatentsResponse

      if (data.error) {
        throw new Error(`SerpApi error: ${data.error}`)
      }

      if (data.search_metadata?.error) {
        throw new Error(`SerpApi error: ${data.search_metadata.error}`)
      }

      // Filter out scholar results (safety check)
      const patentResults = (data.organic_results || []).filter(r => !r.is_scholar)

      console.log(`[Google Patents] Found ${patentResults.length} results (${data.search_information?.total_results || 0} total)`)

      return {
        results: patentResults,
        totalResults: data.search_information?.total_results || 0,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Google Patents] Search failed:', errorMessage)
      return {
        results: [],
        totalResults: 0,
        error: errorMessage,
      }
    }
  }
}

/**
 * Converts SerpApi patent result to standardized PatentReference format
 */
export function serpApiToPatentReference(result: SerpApiPatentResult): PatentReference {
  const patentNumber = result.publication_number || result.patent_id?.replace('patent/', '').replace('/en', '') || 'Unknown'

  // Determine status from grant_date presence and country_status
  let status = 'Published'
  if (result.grant_date) {
    status = 'Granted'
  }
  // Check country_status for more detail
  if (result.country_status) {
    const usStatus = result.country_status['US']
    if (usStatus === 'ACTIVE') status = 'Active'
    else if (usStatus === 'NOT_ACTIVE') status = 'Expired/Inactive'
  }

  return {
    patentNumber,
    title: result.title || 'Title not available',
    filingDate: result.filing_date || result.priority_date || '',
    status,
    source: 'GOOGLE_PATENTS' as PatentReference['source'],
    url: result.patent_link || `https://patents.google.com/patent/${patentNumber}`,
    abstract: result.snippet,
    assignee: result.assignee,
    relevanceContext: result.assignee
      ? `Google Patents - Assignee: ${result.assignee}`
      : 'Patent from Google Patents (international coverage)',
  }
}

/**
 * Search Google Patents with multiple queries
 * Returns aggregated, deduplicated results
 */
export async function searchGooglePatentsWithQueries(
  queries: string[],
  options?: {
    maxResultsPerQuery?: number
    country?: string
  }
): Promise<{
  patents: PatentReference[]
  totalCount: number
  errors: string[]
  queriesUsed: string[]
}> {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) {
    return {
      patents: [],
      totalCount: 0,
      errors: ['SERPAPI_API_KEY not configured. Get one at https://serpapi.com'],
      queriesUsed: queries,
    }
  }

  const client = new GooglePatentsClient(apiKey)
  const maxResults = options?.maxResultsPerQuery || 10
  const allPatents: PatentReference[] = []
  const errors: string[] = []
  let totalCount = 0

  // Execute searches for each query (limit to 5 to conserve API credits)
  for (const queryText of queries.slice(0, 5)) {
    console.log(`[Google Patents] Searching: "${queryText}"`)

    const result = await client.searchPatents({
      query: queryText,
      num: maxResults,
      sort: 'new',
      country: options?.country,
    })

    if (result.error) {
      errors.push(`Google Patents (${queryText}): ${result.error}`)
    } else {
      allPatents.push(...result.results.map(serpApiToPatentReference))
      totalCount += result.totalResults
    }
  }

  // Deduplicate by patent number
  const seen = new Set<string>()
  const uniquePatents = allPatents.filter(p => {
    const normalized = p.patentNumber.replace(/[\s-]/g, '').toUpperCase()
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })

  console.log(`[Google Patents] Found ${uniquePatents.length} unique patents from ${queries.length} queries`)

  return {
    patents: uniquePatents,
    totalCount,
    errors,
    queriesUsed: queries,
  }
}
