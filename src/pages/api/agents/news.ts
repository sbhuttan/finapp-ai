import type { NextApiRequest, NextApiResponse } from 'next'
import { getNewsViaAgent, NewsItem } from '../../../../agents/newsAgent'

function sanitizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if agents are enabled
  if (process.env.AZURE_AI_FOUNDRY_USE_AGENTS !== '1') {
    return res.status(501).json({ 
      error: 'Azure AI Foundry agents are not enabled. Set AZURE_AI_FOUNDRY_USE_AGENTS=1 to use this feature.' 
    })
  }

  // Parse and validate query parameters
  const symbolParam = req.query.symbol
  if (!symbolParam || typeof symbolParam !== 'string') {
    return res.status(400).json({ error: 'symbol parameter is required' })
  }

  const symbol = sanitizeSymbol(symbolParam)
  if (!symbol) {
    return res.status(400).json({ error: 'Invalid symbol format' })
  }

  const limitParam = req.query.limit
  const limit = limitParam ? parseInt(Array.isArray(limitParam) ? limitParam[0] : limitParam, 10) : 10
  const clampedLimit = Math.max(1, Math.min(25, limit))

  const lookbackParam = req.query.lookbackDays
  const lookbackDays = lookbackParam ? parseInt(Array.isArray(lookbackParam) ? lookbackParam[0] : lookbackParam, 10) : 7
  const clampedLookback = Math.max(1, Math.min(30, lookbackDays))

  try {
    const newsItems = await getNewsViaAgent(symbol, clampedLimit, clampedLookback)
    return res.status(200).json(newsItems)
  } catch (error: any) {
    console.error('Agent news API error:', error)
    return res.status(500).json({ error: 'Failed to fetch news via agent' })
  }
}
