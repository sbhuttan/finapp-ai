import type { NextApiRequest, NextApiResponse } from 'next'
import { getIndexQuote, IndexSymbol, RangeKey } from '../../lib/market'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const symbol = (req.query.symbol as string) || ''
  const range = (req.query.range as string) || ''

  const allowed: IndexSymbol[] = ['^GSPC', '^IXIC', '^DJI']
  const ranges: RangeKey[] = ['1D', '1W', '1M', '1Y']

  if (!allowed.includes(symbol as IndexSymbol)) return res.status(400).json({ error: 'Invalid symbol' })
  if (!ranges.includes(range as RangeKey)) return res.status(400).json({ error: 'Invalid range' })

  try {
    const quote = await getIndexQuote(symbol as IndexSymbol, range as RangeKey)
    return res.status(200).json(quote)
  } catch (err: any) {
    console.error('API error', err)
    return res.status(500).json({ error: 'Failed to fetch index data' })
  }
}
