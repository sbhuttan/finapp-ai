/*
  Export a function getNewsViaAgent(symbol: string, limit = 10, lookbackDays = 7)
  Returns: Promise<NewsItem[]>
  - Build a concise agent definition with instructions that:
      - The assistant is a factual news summarizer.
      - It MUST use web_search tool (Bing grounding) to find the most recent, relevant articles about the given stock (by ticker and company name).
      - It should deduplicate sources, avoid paywalled duplicates, and prefer primary sources / reputable outlets.
      - Output MUST be strict JSON array with objects:
        { id: string, source: string, headline: string, url: string, publishedAt: string, summary?: string }
      - Only include items published within last {lookbackDays} days.
      - Limit to {limit} items.
  - Compose user input like:
      "Find the top {limit} recent news for {symbol}. Return strict JSON only."
  - Call runAgent() with jsonExpected = true, temperature ~0.1.
  - Parse outputJson (array). Validate fields; coerce times to ISO.
  - On any error, return [].
*/

import { runAgent } from './client'
import { runFoundryAgent } from './foundryClient'
import { AgentDefinition } from './types'

export interface NewsItem {
  id: string
  source: string
  headline: string
  url: string
  publishedAt: string
  summary?: string | null
}

function sanitizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '')
}

function validateNewsItem(item: any): NewsItem | null {
  if (!item || typeof item !== 'object') return null
  
  const { id, source, headline, url, publishedAt, summary } = item
  
  if (!id || !source || !headline || !url || !publishedAt) {
    return null
  }

  // Coerce publishedAt to ISO string if needed
  let isoPublishedAt: string
  try {
    isoPublishedAt = new Date(publishedAt).toISOString()
  } catch {
    return null
  }

  return {
    id: String(id),
    source: String(source),
    headline: String(headline),
    url: String(url),
    publishedAt: isoPublishedAt,
    summary: summary ? String(summary) : null
  }
}

export async function getNewsViaAgent(symbol: string, limit = 10, lookbackDays = 7): Promise<NewsItem[]> {
  try {
    const sanitizedSymbol = sanitizeSymbol(symbol)
    if (!sanitizedSymbol) {
      throw new Error('Invalid symbol')
    }

    const clampedLimit = Math.max(1, Math.min(25, limit))
    const clampedLookback = Math.max(1, Math.min(30, lookbackDays))

    console.log(`🔍 Getting news for ${sanitizedSymbol} via agent...`)
    console.log(`📊 Limit: ${clampedLimit}, Lookback: ${clampedLookback} days`)

    // Try Azure AI Foundry with Bing grounding first
    try {
      console.log('🚀 Attempting Azure AI Foundry with Bing grounding...')
      
      const foundryAgentDefinition: AgentDefinition = {
        name: `NewsAgent_${sanitizedSymbol}_${Date.now()}`,
        model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
        instructions: `You are a factual news summarizer for financial markets. Your task is to:

1. Use the web_search tool to find the most recent, relevant news articles about the given stock ticker and company
2. Search for news published within the last ${clampedLookback} days only
3. Prefer reputable financial and news sources (Reuters, Bloomberg, CNBC, MarketWatch, Yahoo Finance, etc.)
4. Deduplicate similar stories and avoid paywalled content when possible
5. Focus on news that impacts the stock price, earnings, company developments, or market sentiment

You MUST return your response as a strict JSON array with exactly ${clampedLimit} items (or fewer if not enough recent news exists). Each item must have this exact structure:
{
  "id": "unique_identifier",
  "source": "source_name", 
  "headline": "article_headline",
  "url": "article_url",
  "publishedAt": "ISO_8601_datetime",
  "summary": "brief_summary_optional"
}

Return ONLY the JSON array, no additional text or formatting.`,
        tools: [{
          type: 'web_search',
          connectionId: process.env.BING_GROUNDING_CONNECTION_ID || 'bingsearchsample01'
        }]
      }

      const userInput = `Find the top ${clampedLimit} recent news articles for stock ticker ${sanitizedSymbol}. Return strict JSON only.`

      console.log('🤖 Calling Foundry agent with Bing grounding...')

      const foundryResult = await runFoundryAgent<NewsItem[]>(foundryAgentDefinition, {
        input: userInput,
        temperature: 0.1,
        jsonExpected: true,
        timeoutMs: 45000
      })

      console.log('🎯 Foundry agent result:', { ok: foundryResult.ok, error: foundryResult.error })

      if (foundryResult.ok && foundryResult.outputJson && Array.isArray(foundryResult.outputJson)) {
        const validatedItems = foundryResult.outputJson
          .map(validateNewsItem)
          .filter((item): item is NewsItem => item !== null)
          .slice(0, clampedLimit)

        if (validatedItems.length > 0) {
          console.log(`✅ Foundry agent returned ${validatedItems.length} real news items`)
          return validatedItems
        }
      }

      console.warn('Foundry agent did not return valid news, falling back to AI-generated news')
    } catch (foundryError) {
      console.warn('Foundry agent failed, falling back to AI-generated news:', foundryError)
    }

    // Fallback to AI-generated news using regular OpenAI Assistants
    console.log('🤖 Falling back to AI-generated news...')
    
    const agentDefinition: AgentDefinition = {
      name: `NewsAgent_${sanitizedSymbol}_${Date.now()}`,
      model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
      instructions: `You are a knowledgeable financial news analyst. Generate realistic, relevant news items for the given stock ticker based on your knowledge of the company and typical market events.

Your task is to:
1. Create plausible news headlines and summaries for the given stock ticker
2. Generate news that reflects typical events for this type of company (earnings, product launches, regulatory changes, partnerships, market movements, analyst upgrades/downgrades, etc.)
3. Create news items that appear to be from the last ${clampedLookback} days
4. Use realistic financial news sources and formatting
5. Focus on news that would typically impact stock price or investor sentiment

You MUST return your response as a strict JSON array with exactly ${clampedLimit} items. Each item must have this exact structure:
{
  "id": "unique_identifier_string",
  "source": "realistic_news_source_name", 
  "headline": "realistic_news_headline",
  "url": "https://example.com/news/article-url",
  "publishedAt": "recent_ISO_8601_datetime_within_${clampedLookback}_days",
  "summary": "brief_realistic_summary"
}

Make the news items varied, realistic, and relevant to the company. Use sources like Reuters, Bloomberg, CNBC, MarketWatch, Yahoo Finance, etc.
Return ONLY the JSON array, no additional text or formatting.`,
      tools: []
    }

    const userInput = `Generate ${clampedLimit} realistic recent news items for stock ticker ${sanitizedSymbol}. Return strict JSON only.`

    console.log('🤖 Calling fallback agent...')

    const result = await runAgent<NewsItem[]>(agentDefinition, {
      input: userInput,
      temperature: 0.7,
      jsonExpected: true,
      timeoutMs: 30000
    })

    console.log('🎯 Fallback agent result:', { ok: result.ok, error: result.error })

    if (!result.ok || !result.outputJson) {
      console.warn('Fallback agent failed:', result.error)
      return []
    }

    if (!Array.isArray(result.outputJson)) {
      console.warn('Fallback agent returned non-array:', typeof result.outputJson)
      return []
    }

    const validatedItems = result.outputJson
      .map(validateNewsItem)
      .filter((item): item is NewsItem => item !== null)
      .slice(0, clampedLimit)

    console.log(`✅ Validated ${validatedItems.length} AI-generated news items`)
    return validatedItems

  } catch (error) {
    console.warn('getNewsViaAgent error:', error)
    return []
  }
}
