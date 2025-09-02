import Head from 'next/head'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { SymbolHit } from '../../lib/stocks'

function sanitizeSymbol(s: string) {
  return s.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '')
}

export default function StockSearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SymbolHit[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Handle query param redirect
  useEffect(() => {
    const symbolParam = router.query.symbol
    if (typeof symbolParam === 'string' && symbolParam.trim()) {
      const sym = sanitizeSymbol(symbolParam)
      if (sym) {
        router.replace(`/stock/${sym}`)
      }
    }
  }, [router])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await axios.get('/api/stock/search', { params: { q: query, limit: 10 } })
        setResults(res.data)
        setSelectedIndex(-1)
      } catch (err) {
        console.error('search failed', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIndex >= 0 && results[selectedIndex]) {
      navigate(results[selectedIndex].symbol)
    } else if (query.trim()) {
      const sym = sanitizeSymbol(query)
      if (sym) navigate(sym)
    }
  }

  function navigate(symbol: string) {
    router.push(`/stock/${symbol.toUpperCase()}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(Math.max(selectedIndex - 1, -1))
    } else if (e.key === 'Escape') {
      setSelectedIndex(-1)
    }
  }

  return (
    <>
      <Head>
        <title>Search Stocks | MarketAnalysis AI</title>
        <meta name="description" content="Search for stocks by ticker or company name" />
      </Head>

      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Search stocks</h1>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter ticker symbol or company name..."
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              aria-label="Stock search"
              autoComplete="off"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </form>

        <div className="space-y-2">
          {!query && (
            <div className="text-gray-500 text-center py-8">
              Start typing to search for a ticker or company
            </div>
          )}

          {query && !loading && results.length === 0 && (
            <div className="text-gray-500 text-center py-8">
              No matches for "{query}"
            </div>
          )}

          {results.map((hit, i) => (
            <button
              key={hit.symbol}
              onClick={() => navigate(hit.symbol)}
              className={`w-full text-left p-4 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                i === selectedIndex
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              aria-label={`Select ${hit.symbol} ${hit.name}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono font-semibold text-lg">{hit.symbol}</div>
                  <div className="text-gray-600">{hit.name}</div>
                </div>
                {hit.exchange && (
                  <div className="text-sm text-gray-400">{hit.exchange}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
