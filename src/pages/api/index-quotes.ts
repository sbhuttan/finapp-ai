import type { NextApiRequest, NextApiResponse } from 'next'
import { getIndexTileQuotes, IndexTileQuote, IndexSymbol } from '../../lib/market'

const DEFAULT_SYMBOLS = ['^GSPC', '^IXIC', '^DJI'] as const
const ALLOWED_SYMBOLS = ['^GSPC', '^IXIC', '^DJI'] as const

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse and validate symbols
    const symbolsParam = req.query.symbols as string | undefined
    let symbols: IndexSymbol[]

    if (symbolsParam) {
      const rawSymbols = symbolsParam.split(',').map(s => s.trim())
      symbols = rawSymbols.filter(s => ALLOWED_SYMBOLS.includes(s as any)) as IndexSymbol[]
      
      if (symbols.length === 0) {
        return res.status(400).json({ error: 'No valid symbols provided' })
      }
    } else {
      symbols = [...DEFAULT_SYMBOLS]
    }

    // Get mode from environment
    const mode = (process.env.MARKET_INDEX_MODE === 'ETF_PROXY' ? 'ETF_PROXY' : 'INDEX') as 'INDEX' | 'ETF_PROXY'

    // Fetch quotes
    const quotes = await getIndexTileQuotes(symbols, { mode })

    // Set cache headers for short-term caching
    res.setHeader('Cache-Control', 'public, max-age=1, stale-while-revalidate=5')
    res.status(200).json(quotes)

  } catch (error: any) {
    console.error('Error fetching index quotes:', error)
    
    // Return a safe error message
    const message = error.message?.includes('rate limit') 
      ? 'Rate limit exceeded, please try again later'
      : 'Failed to fetch index quotes'
      
    res.status(500).json({ error: message })
  }
}
