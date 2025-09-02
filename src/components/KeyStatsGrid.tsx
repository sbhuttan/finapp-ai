import React from 'react'
import { Quote } from '../lib/stocks'
import { formatCurrency, formatNumberCompact, formatPercent } from '../lib/format'

interface Props { quote: Quote }

export default function KeyStatsGrid({ quote }: Props) {
  return (
    <div className="bg-white rounded p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-gray-500">Market Cap</div>
        <div className="font-medium">{quote.marketCap ? formatNumberCompact(quote.marketCap) : '—'}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">P/E (TTM)</div>
        <div className="font-medium">{quote.peRatio ?? '—'}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">EPS (TTM)</div>
        <div className="font-medium">{quote.epsTTM ?? '—'}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Dividend Yield</div>
        <div className="font-medium">{quote.dividendYield != null ? formatPercent(quote.dividendYield) : '—'}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">52W High</div>
        <div className="font-medium">{quote.week52High ? formatCurrency(quote.week52High) : '—'}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">52W Low</div>
        <div className="font-medium">{quote.week52Low ? formatCurrency(quote.week52Low) : '—'}</div>
      </div>
    </div>
  )
}
