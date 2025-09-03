import Head from 'next/head'
import React, { useState } from 'react'
import { useRouter } from 'next/router'

function sanitizeSymbol(s: string) {
  return s.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '')
}

export default function StockAnalysisPage() {
  const router = useRouter()
  const [ticker, setTicker] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    const cleanTicker = sanitizeSymbol(ticker)
    
    if (!cleanTicker) {
      setError('Please enter a valid stock ticker symbol')
      return
    }
    
    if (cleanTicker.length > 10) {
      setError('Ticker symbol should be 10 characters or less')
      return
    }
    
    // Navigate to the stock analysis page
    router.push(`/stock/${cleanTicker}`)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTicker(e.target.value)
    setError('') // Clear error when user starts typing
  }

  // Popular stock suggestions
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  ]

  return (
    <>
      <Head>
        <title>Stock Analysis | MarketAnalysis AI</title>
        <meta name="description" content="Enter a stock ticker symbol to view detailed analysis" />
      </Head>

      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock Analysis</h1>
          <p className="text-gray-600">Enter a stock ticker symbol to view detailed analysis and insights</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-2">
                Stock Ticker Symbol
              </label>
              <div className="flex space-x-3">
                <input
                  id="ticker"
                  type="text"
                  value={ticker}
                  onChange={handleInputChange}
                  placeholder="e.g., AAPL, MSFT, GOOGL"
                  className={`flex-1 px-4 py-3 text-lg font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
                    error ? 'border-red-300' : 'border-gray-300'
                  }`}
                  aria-label="Stock ticker symbol"
                  autoComplete="off"
                  maxLength={10}
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!ticker.trim()}
                >
                  Analyze
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Popular Stocks Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Stocks</h2>
          <p className="text-sm text-gray-600 mb-4">Click on any stock below for quick analysis</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularStocks.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => router.push(`/stock/${stock.symbol}`)}
                className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-left group"
              >
                <div className="font-mono font-bold text-blue-600 group-hover:text-blue-700">
                  {stock.symbol}
                </div>
                <div className="text-xs text-gray-500 mt-1 leading-tight">
                  {stock.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Enter any stock ticker symbol (e.g., AAPL for Apple, TSLA for Tesla) to view:
          </p>
          <div className="mt-2 space-x-4">
            <span>📈 Price Charts</span>
            <span>📊 Key Statistics</span>
            <span>📰 Latest News</span>
            <span>🤖 AI Analysis</span>
          </div>
        </div>
      </div>
    </>
  )
}
