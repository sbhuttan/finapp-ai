import React from 'react'
import Link from 'next/link'
import { EarningsResult } from '../lib/earnings'
import { formatPercent, formatNumberCompact, formatDateLabel, formatCurrency } from '../lib/format'

interface Props {
  data: EarningsResult
  loading?: boolean
  onPageChange?: (page: number) => void
  onPerPageChange?: (n: number) => void
}

export default function EarningsTable({ data, loading, onPageChange, onPerPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.perPage))

  function prev() {
    if (data.page > 1 && onPageChange) onPageChange(data.page - 1)
  }
  function next() {
    if (data.page < totalPages && onPageChange) onPageChange(data.page + 1)
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" role="table" aria-label="Earnings calendar">
          <thead className="text-left text-xs text-gray-500">
            <tr>
              <th className="py-2">Date</th>
              <th className="py-2">Time</th>
              <th className="py-2">Symbol</th>
              <th className="py-2">Company</th>
              <th className="py-2">EPS (Est / Actual)</th>
              <th className="py-2">Surprise %</th>
              <th className="py-2">Revenue (Est / Actual)</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">
                  No earnings found for the selected range.
                </td>
              </tr>
            )}

            {data.items.map((row) => (
              <tr
                key={`${row.symbol}-${row.date}`}
                className="border-t hover:bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-200"
              >
                <td className="py-2 align-top">{formatDateLabel(row.date)}</td>
                <td className="py-2 align-top">{row.timeOfDay ?? '—'}</td>
                <td className="py-2 align-top font-mono">
                  <Link href={`/stock/${row.symbol}`}>{row.symbol}</Link>
                </td>
                <td className="py-2 align-top text-gray-700">{row.companyName}</td>
                <td className="py-2 align-top">
                  {row.epsEstimate ?? '—'} / {row.epsActual ?? '—'}
                </td>
                <td className={`py-2 align-top ${row.surprisePercent && row.surprisePercent > 0 ? 'text-green-600' : row.surprisePercent && row.surprisePercent < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {row.surprisePercent != null ? formatPercent(row.surprisePercent) : '—'}
                </td>
                <td className="py-2 align-top">
                  {row.revenueEstimate != null ? formatNumberCompact(row.revenueEstimate) : '—'} / {row.revenueActual != null ? formatNumberCompact(row.revenueActual) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={prev} disabled={data.page <= 1} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">
            Prev
          </button>
          <div className="text-sm text-gray-600">Page {data.page} of {totalPages}</div>
          <button onClick={next} disabled={data.page >= totalPages} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">
            Next
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Per page</label>
          <select
            value={data.perPage}
            onChange={(e) => onPerPageChange && onPerPageChange(parseInt(e.target.value, 10))}
            className="rounded border-gray-200"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
        </div>
      )}
    </div>
  )
}
