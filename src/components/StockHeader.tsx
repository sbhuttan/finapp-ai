import React from 'react'
import { Quote } from '../lib/stocks'
import { formatCurrency, formatTime, formatPercent } from '../lib/format'

interface Props { quote: Quote }

export default function StockHeader({ quote }: Props) {
  const isUp = quote.change >= 0
  return (
    <header className="bg-white rounded p-4 flex items-center justify-between">
      <div>
        <div className="flex items-baseline space-x-3">
          <div className="text-lg font-bold">{quote.symbol}</div>
          <div className="text-sm text-gray-500">{quote.name}</div>
        </div>
        <div className="mt-2 flex items-end space-x-4">
          <div className="text-2xl font-semibold">{formatCurrency(quote.price)}{quote.currency !== 'USD' ? ` ${quote.currency}` : ''}</div>
          <div className={`text-sm font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>{quote.change >= 0 ? `+${quote.change}` : quote.change} ({formatPercent(quote.changePercent)})</div>
        </div>
      </div>
      <div className="text-sm text-gray-500">Updated {formatTime(quote.lastUpdated)} ET</div>
    </header>
  )
}
