import type { NextApiRequest, NextApiResponse } from 'next'
import { getEarnings, EarningsResult } from '../../lib/earnings'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { start, end, q, page, perPage } = req.query
  if (!start || !end) return res.status(400).json({ error: 'start and end are required (YYYY-MM-DD)' })

  const query = {
    start: Array.isArray(start) ? start[0] : start,
    end: Array.isArray(end) ? end[0] : end,
    q: Array.isArray(q) ? q[0] : (q as string | undefined),
    page: page ? parseInt(Array.isArray(page) ? page[0] : page as string, 10) : 1,
    perPage: perPage ? parseInt(Array.isArray(perPage) ? perPage[0] : perPage as string, 10) : 25,
  }

  try {
    const data: EarningsResult = await getEarnings(query)
    return res.status(200).json(data)
  } catch (err: any) {
    console.error('earnings api error', err)
    return res.status(500).json({ error: 'Failed to fetch earnings' })
  }
}
