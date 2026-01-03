// Retail Search Agent - Uses real eBay API data for novelty checking
// Phase 1: Fetch real products from eBay Browse API
// Phase 2: Pass real data to Claude for novelty analysis

import Anthropic from '@anthropic-ai/sdk'
import type { NoveltyResult, NoveltyCheckRequest, NoveltyFinding } from './types'
import {
  searchSimilarProducts,
  isEbayConfigured,
  getCredentialStatus,
  type EbayProduct,
} from '../search/ebay'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Convert eBay product to NoveltyFinding format
 */
function ebayProductToFinding(product: EbayProduct): NoveltyFinding {
  return {
    title: product.title,
    description: `${product.condition || 'New'} - ${product.title}`,
    url: product.itemWebUrl,
    similarity_score: 0, // Will be set by Claude analysis
    source: 'eBay',
    metadata: {
      item_id: product.itemId,
      price: product.price
        ? `${product.price.currency} ${product.price.value}`
        : 'Price not available',
      condition: product.condition,
      image_url: product.image?.imageUrl,
      seller_username: product.seller?.username,
      seller_feedback: product.seller?.feedbackPercentage
        ? `${product.seller.feedbackPercentage}%`
        : undefined,
      categories: product.categories?.map((c) => c.categoryName).join(', '),
      location: product.itemLocation
        ? `${product.itemLocation.city || ''}, ${product.itemLocation.stateOrProvince || ''}, ${product.itemLocation.country || ''}`
            .replace(/^, /, '')
            .replace(/, $/, '')
        : undefined,
    },
  }
}

const ANALYSIS_PROMPT = {
  role: `You are a retail market analyst specializing in product discovery. You analyze real eBay product listings to determine if similar products already exist commercially.`,

  task: `Given an invention description and actual eBay search results, analyze how novel the invention is compared to what's already available for purchase.`,

  howTo: `
1. Review the invention details (name, description, problem it solves, key features)
2. Analyze each eBay product listing to determine similarity to the invention
3. For each product, assess:
   - Feature overlap (how many key features are shared)
   - Problem-solving approach (does it solve the same problem?)
   - Target use case (is it for the same audience/purpose?)
4. Assign similarity scores (0-1) to each product:
   - 0.8-1.0: Essentially the same product, near-identical
   - 0.6-0.8: Very similar, solves same problem similarly
   - 0.4-0.6: Moderately similar, some overlap
   - 0.2-0.4: Somewhat related, different approach
   - 0.0-0.2: Barely related, only superficial similarity
5. Determine overall novelty based on highest similarity found
6. Consider market positioning and differentiation opportunities
`,

  output: `Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
  "is_novel": boolean,
  "confidence": number,
  "product_analyses": [
    {
      "item_id": "string (from input)",
      "similarity_score": number,
      "analysis": "1-2 sentence explanation"
    }
  ],
  "summary": "2-3 sentences on retail availability and competition",
  "truth_scores": {
    "objective_truth": number,
    "practical_truth": number,
    "completeness": number,
    "contextual_scope": number
  }
}`,
}

export async function runRetailSearchAgent(
  request: NoveltyCheckRequest
): Promise<NoveltyResult> {
  // Check if eBay is configured
  if (!isEbayConfigured()) {
    return {
      agent_type: 'retail_search',
      is_novel: false,
      confidence: 0,
      findings: [],
      summary: getCredentialStatus(),
      truth_scores: {
        objective_truth: 0,
        practical_truth: 0,
        completeness: 0,
        contextual_scope: 0,
      },
      search_query_used: request.invention_name,
      timestamp: new Date(),
    }
  }

  // PHASE 1: Fetch real products from eBay
  const ebayResult = await searchSimilarProducts(
    request.invention_name,
    request.description,
    request.key_features
  )

  if (!ebayResult.success) {
    return {
      agent_type: 'retail_search',
      is_novel: false,
      confidence: 0,
      findings: [],
      summary: `eBay API error: ${ebayResult.error}`,
      truth_scores: {
        objective_truth: 0,
        practical_truth: 0,
        completeness: 0,
        contextual_scope: 0,
      },
      search_query_used: ebayResult.searchQuery,
      timestamp: new Date(),
    }
  }

  // If no products found, the invention may be very novel
  if (ebayResult.products.length === 0) {
    return {
      agent_type: 'retail_search',
      is_novel: true,
      confidence: 0.7, // Moderate confidence since absence != novelty
      findings: [],
      summary: `No similar products found on eBay for "${ebayResult.searchQuery}". This suggests the invention may be novel in the retail marketplace, though further research on other platforms is recommended.`,
      truth_scores: {
        objective_truth: 0.8,
        practical_truth: 0.7,
        completeness: 0.5, // Only checked eBay
        contextual_scope: 0.8,
      },
      search_query_used: ebayResult.searchQuery,
      timestamp: new Date(),
    }
  }

  // Convert to findings format (without similarity scores yet)
  const findings = ebayResult.products.map(ebayProductToFinding)

  // PHASE 2: Use Claude to analyze similarity of real products
  const analysisPrompt = `${ANALYSIS_PROMPT.role}

${ANALYSIS_PROMPT.task}

## How to Analyze:
${ANALYSIS_PROMPT.howTo}

## Invention to Check:
- **Name**: ${request.invention_name}
- **Description**: ${request.description}
- **Problem Statement**: ${request.problem_statement || 'Not provided'}
- **Target Audience**: ${request.target_audience || 'Not provided'}
- **Key Features**: ${request.key_features?.join(', ') || 'Not provided'}

## Real eBay Products Found (${ebayResult.products.length} results):
${ebayResult.products
  .map(
    (p, i) => `
${i + 1}. **${p.title}**
   - Item ID: ${p.itemId}
   - Price: ${p.price?.currency || 'USD'} ${p.price?.value || 'N/A'}
   - Condition: ${p.condition || 'Not specified'}
   - URL: ${p.itemWebUrl}
   - Categories: ${p.categories?.map((c) => c.categoryName).join(', ') || 'N/A'}
`
  )
  .join('\n')}

${ANALYSIS_PROMPT.output}

CRITICAL: Your analysis MUST be based on these REAL eBay listings. Do not invent or imagine products.
Products with higher similarity scores indicate the invention is LESS novel.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{ role: 'user', content: analysisPrompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Extract JSON from response
    let jsonText = content.text.trim()
    const jsonMatch =
      jsonText.match(/```json\n([\s\S]*?)\n```/) ||
      jsonText.match(/```\n([\s\S]*?)\n```/)

    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    const analysisResult = JSON.parse(jsonText)

    // Update findings with Claude's similarity scores
    const productAnalysisMap = new Map(
      analysisResult.product_analyses?.map(
        (a: { item_id: string; similarity_score: number; analysis: string }) => [
          a.item_id,
          a,
        ]
      ) || []
    )

    const updatedFindings = findings.map((finding) => {
      const analysis = productAnalysisMap.get(finding.metadata?.item_id)
      if (analysis) {
        return {
          ...finding,
          similarity_score: (analysis as { similarity_score: number }).similarity_score,
          description:
            (analysis as { analysis: string }).analysis || finding.description,
        }
      }
      return finding
    })

    // Sort by similarity score (highest first)
    updatedFindings.sort((a, b) => b.similarity_score - a.similarity_score)

    return {
      agent_type: 'retail_search',
      is_novel: analysisResult.is_novel,
      confidence: analysisResult.confidence,
      findings: updatedFindings,
      summary: analysisResult.summary,
      truth_scores: analysisResult.truth_scores,
      search_query_used: ebayResult.searchQuery,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Retail Search Agent analysis error:', error)

    // Return findings without AI analysis if Claude fails
    return {
      agent_type: 'retail_search',
      is_novel: false,
      confidence: 0.3,
      findings: findings,
      summary: `Found ${findings.length} potentially similar products on eBay, but analysis failed. Manual review recommended.`,
      truth_scores: {
        objective_truth: 0.6, // Real data, but no analysis
        practical_truth: 0.5,
        completeness: 0.4,
        contextual_scope: 0.5,
      },
      search_query_used: ebayResult.searchQuery,
      timestamp: new Date(),
    }
  }
}
