// eBay Browse API Client with OAuth 2.0 Client Credentials Grant
// Docs: https://developer.ebay.com/api-docs/buy/browse/overview.html

export interface EbayProduct {
  itemId: string
  title: string
  itemWebUrl: string
  price: {
    value: string
    currency: string
  }
  image?: {
    imageUrl: string
  }
  additionalImages?: Array<{ imageUrl: string }>
  condition: string
  seller?: {
    username: string
    feedbackPercentage: string
    feedbackScore: number
  }
  categories?: Array<{ categoryId: string; categoryName: string }>
  itemLocation?: {
    city: string
    stateOrProvince: string
    country: string
  }
}

export interface EbaySearchResponse {
  href: string
  total: number
  next?: string
  limit: number
  offset: number
  itemSummaries?: EbayProduct[]
}

export interface EbaySearchResult {
  success: boolean
  products: EbayProduct[]
  total: number
  searchQuery: string
  error?: string
}

// Token cache to avoid unnecessary OAuth requests (tokens last 2 hours)
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get OAuth 2.0 access token using Client Credentials Grant
 * Token expires in 2 hours (7200 seconds)
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID
  const clientSecret = process.env.EBAY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'eBay API credentials not configured. Please set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET environment variables. ' +
        'Get your credentials at: https://developer.ebay.com/my/keys'
    )
  }

  // Return cached token if still valid (with 5 minute buffer)
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.token
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  )

  const response = await fetch(
    'https://api.ebay.com/identity/v1/oauth2/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`eBay OAuth failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()

  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }

  return data.access_token
}

/**
 * Search eBay for products matching the query
 * Uses the Browse API item_summary/search endpoint
 */
export async function searchEbay(
  query: string,
  options: {
    limit?: number
    offset?: number
    filter?: string // e.g., "buyingOptions:{FIXED_PRICE}"
    sort?: string // e.g., "price" or "-price"
  } = {}
): Promise<EbaySearchResult> {
  const { limit = 20, offset = 0, filter, sort } = options

  try {
    const accessToken = await getAccessToken()

    // Build query params
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    })

    if (filter) {
      params.append('filter', filter)
    }

    if (sort) {
      params.append('sort', sort)
    }

    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()

      // Handle specific error cases
      if (response.status === 401) {
        // Token expired, clear cache and throw
        cachedToken = null
        throw new Error('eBay access token expired. Please retry.')
      }

      if (response.status === 429) {
        throw new Error('eBay API rate limit exceeded. Please try again later.')
      }

      throw new Error(`eBay search failed (${response.status}): ${errorText}`)
    }

    const data: EbaySearchResponse = await response.json()

    return {
      success: true,
      products: data.itemSummaries || [],
      total: data.total || 0,
      searchQuery: query,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'

    return {
      success: false,
      products: [],
      total: 0,
      searchQuery: query,
      error: message,
    }
  }
}

/**
 * Search for products similar to an invention
 * Generates smart search queries based on invention details
 */
export async function searchSimilarProducts(
  inventionName: string,
  description: string,
  keyFeatures?: string[]
): Promise<EbaySearchResult> {
  // Create a search-optimized query
  // eBay search works best with product-type terms
  const keywords: string[] = []

  // Extract key nouns from invention name (remove common words)
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'dare',
    'ought',
    'used',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'device',
    'system',
    'apparatus',
    'method',
    'invention',
    'product',
    'innovative',
    'new',
    'novel',
    'smart',
    'intelligent',
    'advanced',
    'automatic',
    'automated',
  ])

  const nameWords = inventionName
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
  keywords.push(...nameWords.slice(0, 3))

  // Add key features if provided (first 2)
  if (keyFeatures && keyFeatures.length > 0) {
    const featureWords = keyFeatures
      .slice(0, 2)
      .flatMap((f) =>
        f
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stopWords.has(w))
      )
      .slice(0, 3)
    keywords.push(...featureWords)
  }

  // Build final query (eBay works best with 3-5 terms)
  const searchQuery = [...new Set(keywords)].slice(0, 5).join(' ')

  return searchEbay(searchQuery, { limit: 15 })
}

/**
 * Check if eBay credentials are configured
 */
export function isEbayConfigured(): boolean {
  return !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET)
}

/**
 * Get credential status message
 */
export function getCredentialStatus(): string {
  if (isEbayConfigured()) {
    return 'eBay API credentials configured'
  }

  return (
    'eBay API credentials not configured. ' +
    'To enable real eBay product search, add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to your environment variables. ' +
    'Get your free credentials at: https://developer.ebay.com/my/keys'
  )
}
