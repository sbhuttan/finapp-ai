import type { NextApiRequest, NextApiResponse } from 'next'
import { BACKEND_CONFIG } from '../../../../lib/backend-config'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol } = req.query

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Symbol parameter is required' })
  }

  try {
    console.log(`💭 Proxying sentiment analysis request for ${symbol} to Python backend...`)
    
    const response = await fetch(`${BACKEND_CONFIG.baseUrl}/api/analysis/sentiment/${symbol.toUpperCase()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`❌ Python backend returned ${response.status}: ${response.statusText}`)
      const errorText = await response.text()
      console.error(`Error details: ${errorText}`)
      return res.status(response.status).json({ 
        error: `Backend error: ${response.statusText}`,
        details: errorText
      })
    }

    const data = await response.json()
    console.log(`✅ Sentiment analysis received for ${symbol}`)
    
    res.status(200).json(data)
  } catch (error) {
    console.error('❌ Error calling Python backend for sentiment analysis:', error)
    res.status(500).json({ 
      error: 'Failed to get sentiment analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
