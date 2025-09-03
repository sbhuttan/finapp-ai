import type { NextApiRequest, NextApiResponse } from 'next'

export interface TopMover {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

interface TopMoversResponse {
  gainers: TopMover[]
  losers: TopMover[]
}

// Mock data with realistic movement for demonstration
// In production, this would connect to a real financial data provider
const generateMockMovers = (): TopMoversResponse => {
  // Simulate realistic market movements
  const randomChange = () => (Math.random() - 0.5) * 10 // -5% to +5%
  const randomPrice = () => 50 + Math.random() * 200 // $50-$250

  const stocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway' },
    { symbol: 'LLY', name: 'Eli Lilly and Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'UNH', name: 'UnitedHealth Group' },
    { symbol: 'XOM', name: 'Exxon Mobil Corp.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble Co.' },
    { symbol: 'MA', name: 'Mastercard Inc.' },
    { symbol: 'HD', name: 'The Home Depot Inc.' },
    { symbol: 'BAC', name: 'Bank of America Corp.' },
    { symbol: 'ABBV', name: 'AbbVie Inc.' }
  ]

  // Generate movements for all stocks
  const movers = stocks.map(stock => {
    const price = randomPrice()
    const changePercent = randomChange()
    const change = (price * changePercent) / 100
    
    return {
      symbol: stock.symbol,
      name: stock.name,
      price: Number(price.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2))
    }
  })

  // Sort by percentage change
  const sorted = movers.sort((a, b) => b.changePercent - a.changePercent)
  
  return {
    gainers: sorted.slice(0, 5), // Top 5 gainers
    losers: sorted.slice(-5).reverse() // Top 5 losers (reverse to show worst first)
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<TopMoversResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ gainers: [], losers: [] })
  }

  try {
    // For now, return mock data with realistic movements
    // TODO: Connect to real financial data provider (Alpha Vantage, Polygon, etc.)
    const data = generateMockMovers()
    
    // Add cache headers to prevent too frequent requests
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600') // 5 min cache
    
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching top movers:', error)
    return res.status(500).json({ gainers: [], losers: [] })
  }
}
