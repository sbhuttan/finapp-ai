import type { NextApiRequest, NextApiResponse } from 'next'
import { searchSymbols } from '../../../lib/stocks'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const limit = req.query.limit ? parseInt(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit as string, 10) : 10
  
  if (!q || q.length < 1 || q.length > 50) {
    return res.status(400).json({ error: 'q must be 1-50 characters' })
  }
  
  const clampedLimit = Math.max(1, Math.min(25, limit))
  
  try {
    const results = await searchSymbols(q, clampedLimit)
    return res.status(200).json(results)
  } catch (err: any) {
    console.error('search error', err)
    return res.status(500).json({ error: 'search failed' })
  }
}
