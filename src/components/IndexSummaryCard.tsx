import React from 'react'
import dynamic from 'next/dynamic'
import { IndexQuote } from '../lib/market'
import { formatCurrency, formatPercent, formatTime } from '../lib/format'

const Sparkline = dynamic(() => import('react-chartjs-2').then((m) => m.Line), { ssr: false })

interface Props {
  quote: IndexQuote
  onClick?: () => void
  selected?: boolean
  chartReady?: boolean
  loading?: boolean
}

export default function IndexSummaryCard({ quote, onClick, selected, chartReady, loading }: Props) {
  const isUp = quote.change >= 0
  const changeClass = isUp ? 'text-green-600' : 'text-red-600'

  const sparkData = {
    labels: quote.history.map((p) => p.t),
    datasets: [
      {
        data: quote.history.map((p) => p.c),
        borderWidth: 1,
        borderColor: isUp ? '#3b82f6' : '#ef4444',
        backgroundColor: 'transparent',
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  }

  const sparkOptions = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { point: { radius: 0 } },
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative w-full text-left p-4 bg-white rounded shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        selected ? 'ring-2 ring-indigo-400' : ''
      }`}
    >
      {loading && (
        <div className="absolute inset-0 bg-blue-50/50 rounded pointer-events-none">
          <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-500">{quote.name}</div>
          <div className="text-lg font-semibold">{formatCurrency(quote.price)}</div>
        </div>
        <div className="text-right">
          <div className={`${changeClass} font-medium`}>{formatSigned(quote.change)}</div>
          <div className={`${changeClass} text-sm`}>{formatPercent(quote.changePercent)}</div>
        </div>
      </div>
      <div className="mt-2 h-8">
        {chartReady ? <div className="w-full h-8"><Sparkline data={sparkData} options={sparkOptions} /></div> : <div className="w-full h-8 bg-gray-50 rounded" />}
      </div>
      <div className="mt-2 text-xs text-gray-400">Updated {formatTime(quote.lastUpdated)} ET</div>
    </button>
  )
}

// helper used in template
function formatSigned(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '-' : ''
  return `${sign}${Math.abs(v).toFixed(2)}`
}
