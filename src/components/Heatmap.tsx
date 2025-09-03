import React, { useMemo } from 'react'
import Link from 'next/link'

// Top 50 S&P 500 stocks by market cap with approximate weights
const SP500_TOP_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', weight: 7.1, sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', weight: 6.8, sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 3.4, sector: 'Consumer Discretionary' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', weight: 3.2, sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', weight: 2.8, sector: 'Communication Services' },
  { symbol: 'GOOG', name: 'Alphabet Inc.', weight: 2.4, sector: 'Communication Services' },
  { symbol: 'TSLA', name: 'Tesla Inc.', weight: 2.1, sector: 'Consumer Discretionary' },
  { symbol: 'META', name: 'Meta Platforms Inc.', weight: 2.0, sector: 'Communication Services' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', weight: 1.8, sector: 'Financials' },
  { symbol: 'UNH', name: 'UnitedHealth Group', weight: 1.5, sector: 'Healthcare' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', weight: 1.3, sector: 'Healthcare' },
  { symbol: 'JPM', name: 'JPMorgan Chase', weight: 1.2, sector: 'Financials' },
  { symbol: 'V', name: 'Visa Inc.', weight: 1.1, sector: 'Financials' },
  { symbol: 'PG', name: 'Procter & Gamble', weight: 1.0, sector: 'Consumer Staples' },
  { symbol: 'HD', name: 'Home Depot', weight: 0.9, sector: 'Consumer Discretionary' },
  { symbol: 'MA', name: 'Mastercard', weight: 0.9, sector: 'Financials' },
  { symbol: 'CVX', name: 'Chevron Corporation', weight: 0.8, sector: 'Energy' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', weight: 0.8, sector: 'Healthcare' },
  { symbol: 'BAC', name: 'Bank of America', weight: 0.7, sector: 'Financials' },
  { symbol: 'KO', name: 'Coca-Cola Company', weight: 0.7, sector: 'Consumer Staples' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 0.7, sector: 'Technology' },
  { symbol: 'PFE', name: 'Pfizer Inc.', weight: 0.6, sector: 'Healthcare' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific', weight: 0.6, sector: 'Healthcare' },
  { symbol: 'COST', name: 'Costco Wholesale', weight: 0.6, sector: 'Consumer Staples' },
  { symbol: 'MRK', name: 'Merck & Co.', weight: 0.6, sector: 'Healthcare' },
  { symbol: 'ORCL', name: 'Oracle Corporation', weight: 0.5, sector: 'Technology' },
  { symbol: 'ACN', name: 'Accenture plc', weight: 0.5, sector: 'Technology' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', weight: 0.5, sector: 'Consumer Staples' },
  { symbol: 'LLY', name: 'Eli Lilly and Company', weight: 0.5, sector: 'Healthcare' },
  { symbol: 'ADBE', name: 'Adobe Inc.', weight: 0.5, sector: 'Technology' },
  { symbol: 'NFLX', name: 'Netflix Inc.', weight: 0.4, sector: 'Communication Services' },
  { symbol: 'WMT', name: 'Walmart Inc.', weight: 0.4, sector: 'Consumer Staples' },
  { symbol: 'CRM', name: 'Salesforce Inc.', weight: 0.4, sector: 'Technology' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', weight: 0.4, sector: 'Energy' },
  { symbol: 'DHR', name: 'Danaher Corporation', weight: 0.4, sector: 'Healthcare' },
  { symbol: 'VZ', name: 'Verizon Communications', weight: 0.4, sector: 'Communication Services' },
  { symbol: 'NKE', name: 'Nike Inc.', weight: 0.4, sector: 'Consumer Discretionary' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', weight: 0.4, sector: 'Communication Services' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', weight: 0.4, sector: 'Technology' },
  { symbol: 'ABT', name: 'Abbott Laboratories', weight: 0.3, sector: 'Healthcare' },
  { symbol: 'TXN', name: 'Texas Instruments', weight: 0.3, sector: 'Technology' },
  { symbol: 'LIN', name: 'Linde plc', weight: 0.3, sector: 'Materials' },
  { symbol: 'COP', name: 'ConocoPhillips', weight: 0.3, sector: 'Energy' },
  { symbol: 'NEE', name: 'NextEra Energy', weight: 0.3, sector: 'Utilities' },
  { symbol: 'QCOM', name: 'QUALCOMM Incorporated', weight: 0.3, sector: 'Technology' },
  { symbol: 'PM', name: 'Philip Morris International', weight: 0.3, sector: 'Consumer Staples' },
  { symbol: 'T', name: 'AT&T Inc.', weight: 0.3, sector: 'Communication Services' },
  { symbol: 'RTX', name: 'Raytheon Technologies', weight: 0.3, sector: 'Industrials' },
  { symbol: 'UPS', name: 'United Parcel Service', weight: 0.3, sector: 'Industrials' },
  { symbol: 'LOW', name: 'Lowe\'s Companies', weight: 0.3, sector: 'Consumer Discretionary' }
]

const SECTOR_COLORS = {
  'Technology': '#3B82F6', // Blue
  'Healthcare': '#10B981', // Green
  'Financials': '#F59E0B', // Yellow
  'Consumer Discretionary': '#EF4444', // Red
  'Communication Services': '#8B5CF6', // Purple
  'Consumer Staples': '#06B6D4', // Cyan
  'Energy': '#F97316', // Orange
  'Industrials': '#6B7280', // Gray
  'Materials': '#84CC16', // Lime
  'Utilities': '#14B8A6', // Teal
}

interface HeatmapProps {
  // For now we'll use mock data, but this could be enhanced with real market data
  mockPerformanceData?: { [symbol: string]: number }
}

export default function Heatmap({ mockPerformanceData }: HeatmapProps) {
  // Generate mock performance data if not provided
  const performanceData = useMemo(() => {
    if (mockPerformanceData) return mockPerformanceData
    
    // Generate random performance data for demo purposes
    const data: { [symbol: string]: number } = {}
    SP500_TOP_STOCKS.forEach(stock => {
      // Generate random performance between -5% and +5%
      data[stock.symbol] = (Math.random() - 0.5) * 10
    })
    return data
  }, [mockPerformanceData])

  const getPerformanceColor = (performance: number) => {
    if (performance > 2) return 'bg-green-500'
    if (performance > 1) return 'bg-green-400'
    if (performance > 0) return 'bg-green-300'
    if (performance > -1) return 'bg-red-300'
    if (performance > -2) return 'bg-red-400'
    return 'bg-red-500'
  }

  const getTextColor = (performance: number) => {
    return Math.abs(performance) > 1 ? 'text-white' : 'text-gray-900'
  }

  const getBoxSize = (weight: number) => {
    // Size boxes based on weight - larger weight = larger box
    if (weight >= 5) return 'w-32 h-24'
    if (weight >= 3) return 'w-28 h-20'
    if (weight >= 2) return 'w-24 h-16'
    if (weight >= 1) return 'w-20 h-14'
    if (weight >= 0.5) return 'w-16 h-12'
    return 'w-14 h-10'
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">S&P 500 Heatmap</h1>
        <p className="text-gray-600 mb-4">Top 50 stocks by market capitalization weight</p>
        
        {/* Legend */}
        <div className="flex justify-center items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Strong Gain (+2%+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-300 rounded"></div>
            <span>Gain (0% to +2%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-300 rounded"></div>
            <span>Loss (0% to -2%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Strong Loss (-2%+)</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex flex-wrap gap-2 justify-center max-w-7xl mx-auto">
        {SP500_TOP_STOCKS.map((stock) => {
          const performance = performanceData[stock.symbol] || 0
          const sectorColor = SECTOR_COLORS[stock.sector as keyof typeof SECTOR_COLORS] || '#6B7280'
          
          return (
            <Link
              key={stock.symbol}
              href={`/stock/${stock.symbol}`}
              className={`${getBoxSize(stock.weight)} ${getPerformanceColor(performance)} 
                         rounded-lg p-2 shadow-sm hover:shadow-md transition-all duration-200 
                         hover:scale-105 cursor-pointer border-2 border-transparent
                         hover:border-blue-300 group relative`}
              title={`${stock.name} - ${stock.sector}`}
            >
              <div className={`${getTextColor(performance)} text-center h-full flex flex-col justify-between`}>
                <div className="font-bold text-xs lg:text-sm">{stock.symbol}</div>
                <div className="text-xs opacity-90">{performance.toFixed(1)}%</div>
                <div className="text-xs font-medium">{stock.weight}%</div>
              </div>
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {stock.name}
                  <br />
                  {stock.sector}
                  <br />
                  Weight: {stock.weight}% | Change: {performance.toFixed(2)}%
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Sector Summary */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Sector Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
          {Object.entries(SECTOR_COLORS).map(([sector, color]) => {
            const sectorStocks = SP500_TOP_STOCKS.filter(stock => stock.sector === sector)
            const totalWeight = sectorStocks.reduce((sum, stock) => sum + stock.weight, 0)
            const avgPerformance = sectorStocks.reduce((sum, stock) => sum + (performanceData[stock.symbol] || 0), 0) / sectorStocks.length
            
            return (
              <div key={sector} className="text-center p-3 bg-white rounded-lg shadow">
                <div 
                  className="w-6 h-6 rounded mx-auto mb-2"
                  style={{ backgroundColor: color }}
                ></div>
                <div className="text-sm font-medium text-gray-900">{sector}</div>
                <div className="text-xs text-gray-600">
                  {totalWeight.toFixed(1)}% weight
                </div>
                <div className={`text-xs font-medium ${avgPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {avgPerformance.toFixed(1)}% avg
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 mt-6">
        <p>Click on any stock to view detailed analysis. Box size represents market cap weight in S&P 500.</p>
        <p className="mt-1">Performance data is simulated for demonstration purposes.</p>
      </div>
    </div>
  )
}
