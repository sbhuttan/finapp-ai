import type { NextApiRequest, NextApiResponse } from 'next'
import { getNews } from '../../../lib/stocks'
import { BACKEND_CONFIG } from '../../../lib/backend-config'

function sanitizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '')
}

async function proxyToPythonBackend(req: NextApiRequest, res: NextApiResponse) {
  const { symbol, limit, lookbackDays } = req.query
  
  try {
    const pythonUrl = `${BACKEND_CONFIG.pythonUrl}/api/stock/news`
    const params = new URLSearchParams({
      symbol: symbol as string,
      ...(limit && { limit: limit as string }),
      ...(lookbackDays && { lookbackDays: lookbackDays as string }),
    })
    
    const response = await fetch(`${pythonUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`)
    }
    
    const data = await response.json()
    res.setHeader('X-News-Source', 'python-backend')
    return res.status(200).json(data)
    
  } catch (error) {
    console.error('❌ Python backend proxy failed:', error)
    throw error
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  
  const symbolParam = typeof req.query.symbol === 'string' ? req.query.symbol : ''
  const symbol = sanitizeSymbol(symbolParam)
  
  if (!symbol) return res.status(400).json({ error: 'symbol is required' })
  
  // Route to Python backend if configured
  if (BACKEND_CONFIG.type === 'python') {
    try {
      console.log('🐍 Routing to Python backend...')
      return await proxyToPythonBackend(req, res)
    } catch (error) {
      console.warn('⚠️ Python backend failed, falling back to Next.js handler:', error)
      // Continue to Next.js handler below
    }
  }
  
  const limit = req.query.limit ? parseInt(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit as string, 10) : 10
  const clampedLimit = Math.max(1, Math.min(50, limit))
  
  try {
    // Fallback to existing provider logic
    const news = await getNews(symbol, clampedLimit)
    res.setHeader('X-News-Source', 'provider')
    return res.status(200).json(news)
    
  } catch (err: any) {
    console.error('news error', err)
    return res.status(500).json({ error: 'failed to fetch news' })
  }
}
