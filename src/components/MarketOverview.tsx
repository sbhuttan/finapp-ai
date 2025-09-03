import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import axios from 'axios'
import { IndexQuote, IndexSymbol, RangeKey, getIndexQuote, IndexTileQuote } from '../lib/market'
import IndexSummaryCard from './IndexSummaryCard'
import { formatCurrency } from '../lib/format'

const Line = dynamic(() => import('react-chartjs-2').then((m) => m.Line), { ssr: false })

interface TopMover {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

interface Props {
  initialData: IndexQuote[]
  initialRange: RangeKey
}

const SYMBOLS: IndexSymbol[] = ['^GSPC', '^IXIC', '^DJI']

// Realtime configuration
const REFRESH_MS = Number(process.env.NEXT_PUBLIC_MARKET_REFRESH_MS || 5000)
const REALTIME_ENABLED = process.env.NEXT_PUBLIC_MARKET_REALTIME_ENABLED === "1"

export default function MarketOverview({ initialData, initialRange }: Props) {
  const [dataMap, setDataMap] = useState<Record<string, IndexQuote>>(() => {
    const map: Record<string, IndexQuote> = {}
    for (const q of initialData) map[q.symbol] = q
    return map
  })
  const [selected, setSelected] = useState<IndexSymbol>('^GSPC')
  const [range, setRange] = useState<RangeKey>(initialRange)
  const [loading, setLoading] = useState(false)
  const [chartReady, setChartReady] = useState(false)
  const [realtimeLoading, setRealtimeLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  // State for top movers
  const [topMovers, setTopMovers] = useState<{ gainers: TopMover[]; losers: TopMover[] }>({
    gainers: [],
    losers: []
  })
  const [moversLoading, setMoversLoading] = useState(true)

  useEffect(() => {
    // register Chart.js client-side
    let mounted = true
    ;(async () => {
      try {
        const mod = await import('../lib/chartjs')
        mod.registerChartJs()
      } catch (e) {
        // ignore
      }
      if (mounted) setChartReady(true)
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Real-time polling effect
  useEffect(() => {
    if (!REALTIME_ENABLED) return

    let alive = true
    let interval: NodeJS.Timeout

    const fetchQuotes = async () => {
      try {
        setRealtimeLoading(true)
        const symbolsParam = encodeURIComponent(SYMBOLS.join(','))
        const res = await fetch(`/api/index-quotes?symbols=${symbolsParam}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })

        if (!res.ok) {
          if (res.status === 429) {
            // Rate limit - backoff temporarily
            throw new Error('RATE_LIMIT')
          }
          throw new Error(`HTTP ${res.status}`)
        }

        const tileQuotes: IndexTileQuote[] = await res.json()
        
        if (alive) {
          // Update the existing dataMap with new price data, preserving history
          setDataMap(prev => {
            const updated = { ...prev }
            tileQuotes.forEach(tileQuote => {
              const existing = updated[tileQuote.symbol]
              if (existing) {
                // Update price data while keeping existing history
                updated[tileQuote.symbol] = {
                  ...existing,
                  price: tileQuote.price,
                  change: tileQuote.change,
                  changePercent: tileQuote.changePercent,
                  lastUpdated: tileQuote.lastUpdated
                }
              }
            })
            return updated
          })
          setRetryCount(0) // Reset retry count on success
        }
      } catch (error: any) {
        console.warn('Failed to fetch realtime quotes:', error)
        
        if (error.message === 'RATE_LIMIT') {
          // Exponential backoff for rate limits
          setRetryCount(prev => prev + 1)
        }
      } finally {
        if (alive) {
          setRealtimeLoading(false)
        }
      }
    }

    // Initial fetch
    fetchQuotes()

    // Set up interval with backoff logic
    const getIntervalMs = () => {
      if (retryCount > 0) {
        // Exponential backoff: 15s, 30s, 60s max
        return Math.min(15000 * Math.pow(2, retryCount - 1), 60000)
      }
      return REFRESH_MS
    }

    const scheduleNext = () => {
      if (alive) {
        interval = setTimeout(() => {
          fetchQuotes()
          scheduleNext()
        }, getIntervalMs())
      }
    }

    scheduleNext()

    return () => {
      alive = false
      if (interval) {
        clearTimeout(interval)
      }
    }
  }, [retryCount]) // Re-run when retryCount changes for backoff

  // Fetch top movers on component mount and periodically
  useEffect(() => {
    const fetchTopMovers = async () => {
      try {
        setMoversLoading(true)
        const response = await axios.get('/api/market/top-movers')
        setTopMovers(response.data)
      } catch (error) {
        console.error('Failed to fetch top movers:', error)
        // Keep existing data on error
      } finally {
        setMoversLoading(false)
      }
    }

    // Initial fetch
    fetchTopMovers()

    // Set up periodic refresh (every 5 minutes)
    const interval = setInterval(fetchTopMovers, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const selectedQuote = useMemo(() => dataMap[selected], [dataMap, selected])

  async function fetchRangeForSymbol(symbol: IndexSymbol, newRange: RangeKey) {
    setLoading(true)
    try {
      const res = await axios.get('/api/index-quote', { params: { symbol, range: newRange } })
      const quote: IndexQuote = res.data
      setDataMap((prev) => ({ ...prev, [symbol]: quote }))
    } catch (err) {
      // keep existing data; optionally show toast
      console.error('Failed to refresh range', err)
    } finally {
      setLoading(false)
    }
  }

  function handleRangeClick(r: RangeKey) {
    setRange(r)
    fetchRangeForSymbol(selected, r)
  }

  function handleCardClick(symbol: IndexSymbol) {
    setSelected(symbol)
  }

  const mainChartData = useMemo(() => {
    if (!selectedQuote) return null
    return {
      datasets: [
        {
          label: selectedQuote.name,
          data: selectedQuote.history.map((p) => ({ x: p.t, y: p.c })),
          borderColor: selected === '^GSPC' ? '#3b82f6' : selected === '^IXIC' ? '#8b5cf6' : '#14b8a6',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        },
      ],
    }
  }, [selectedQuote, selected])

  const mainChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { tooltip: { callbacks: { label: (ctx: any) => formatCurrency(ctx.parsed.y) } }, legend: { display: false } },
    scales: {
      x: { type: 'time' as const, time: { unit: range === '1D' ? 'hour' : range === '1W' ? 'day' : 'month' }, grid: { color: 'rgba(150,150,150,0.06)' } },
      y: { grid: { color: 'rgba(150,150,150,0.06)' }, ticks: { callback: (v: any) => formatCurrency(Number(v)) } },
    },
  }), [range])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Market Overview</h1>
        <div className="flex items-center space-x-2">
          {REALTIME_ENABLED && (
            <div className="flex items-center space-x-1 text-sm">
              <div className={`w-2 h-2 rounded-full ${realtimeLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
              <span className="text-gray-500">
                {realtimeLoading ? 'Updating...' : 'Live'}
              </span>
            </div>
          )}
          <div className="text-sm text-gray-500">
            {REALTIME_ENABLED ? 'Real-time index snapshots' : 'Index snapshots'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SYMBOLS.map((s) => (
          <IndexSummaryCard
            key={s}
            quote={dataMap[s]}
            onClick={() => handleCardClick(s)}
            selected={selected === s}
            chartReady={chartReady}
            loading={realtimeLoading}
          />
        ))}
      </div>

      <div className="mt-6 bg-white rounded shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-gray-500">{selectedQuote?.name}</div>
            <div className="text-2xl font-semibold">{selectedQuote ? formatCurrency(selectedQuote.price) : '—'}</div>
          </div>

          <div className="flex items-center space-x-2">
            {(['1D', '1W', '1M', '1Y'] as RangeKey[]).map((r) => (
              <button
                key={r}
                onClick={() => handleRangeClick(r)}
                aria-pressed={r === range}
                className={`px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  r === range ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="relative h-96">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur flex items-center justify-center z-10">
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
            </div>
          )}

          {chartReady && mainChartData ? (
            <Line data={mainChartData as any} options={mainChartOptions as any} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No chart available</div>
          )}
        </div>

        {/* Top movers: responsive accessible tables */}
        <section aria-labelledby="top-movers" className="mt-4">
          <h2 id="top-movers" className="sr-only">Top movers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded" aria-labelledby="gainers-heading">
              <h3 id="gainers-heading" className="font-semibold mb-2">
                Top Gainers
                {moversLoading && <span className="ml-2 text-xs text-gray-500">Loading...</span>}
              </h3>
              <div className="overflow-auto">
                <table className="min-w-full text-sm" role="table" aria-label="Top gainers">
                  <thead className="text-left text-xs text-gray-500">
                    <tr>
                      <th className="py-2">Symbol</th>
                      <th className="py-2">Name</th>
                      <th className="py-2 text-right">Price</th>
                      <th className="py-2 text-right">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moversLoading ? (
                      // Loading skeleton
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-t animate-pulse">
                          <td className="py-2"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                          <td className="py-2"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                          <td className="py-2 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="py-2 text-right"><div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div></td>
                        </tr>
                      ))
                    ) : (
                      topMovers.gainers.map((row) => (
                        <tr key={row.symbol} className="border-t">
                          <td className="py-2 font-mono">
                            <Link href={`/stock/${row.symbol}`} className="hover:text-blue-600">
                              {row.symbol}
                            </Link>
                          </td>
                          <td className="py-2 text-gray-700">{row.name}</td>
                          <td className="py-2 text-right">${row.price.toFixed(2)}</td>
                          <td className="py-2 text-right text-green-600">
                            +{row.changePercent.toFixed(2)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded" aria-labelledby="losers-heading">
              <h3 id="losers-heading" className="font-semibold mb-2">
                Top Losers
                {moversLoading && <span className="ml-2 text-xs text-gray-500">Loading...</span>}
              </h3>
              <div className="overflow-auto">
                <table className="min-w-full text-sm" role="table" aria-label="Top losers">
                  <thead className="text-left text-xs text-gray-500">
                    <tr>
                      <th className="py-2">Symbol</th>
                      <th className="py-2">Name</th>
                      <th className="py-2 text-right">Price</th>
                      <th className="py-2 text-right">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moversLoading ? (
                      // Loading skeleton
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-t animate-pulse">
                          <td className="py-2"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                          <td className="py-2"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                          <td className="py-2 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="py-2 text-right"><div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div></td>
                        </tr>
                      ))
                    ) : (
                      topMovers.losers.map((row) => (
                        <tr key={row.symbol} className="border-t">
                          <td className="py-2 font-mono">
                            <Link href={`/stock/${row.symbol}`} className="hover:text-blue-600">
                              {row.symbol}
                            </Link>
                          </td>
                          <td className="py-2 text-gray-700">{row.name}</td>
                          <td className="py-2 text-right">${row.price.toFixed(2)}</td>
                          <td className="py-2 text-right text-red-600">
                            {row.changePercent.toFixed(2)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
