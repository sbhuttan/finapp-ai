import type { NextApiRequest, NextApiResponse } from 'next'
import { getStockOverview, PriceRange } from '../../../lib/stocks'

const ALLOWED_RANGES: PriceRange[] = ['1D', '5D', '1M', '6M', '1Y', '5Y']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol : ''
  const range = (typeof req.query.range === 'string' ? (req.query.range as PriceRange) : '6M')
  if (!symbol) return res.status(400).json({ error: 'symbol is required' })
  if (!ALLOWED_RANGES.includes(range)) return res.status(400).json({ error: 'invalid range' })

  try {
    const overview = await getStockOverview(symbol, range)
    return res.status(200).json(overview)
  } catch (err: any) {
    console.error('overview error', err)
    return res.status(500).json({ error: 'failed to fetch overview' })
  }
}
