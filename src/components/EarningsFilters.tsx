import React, { useState } from 'react'

interface Props {
  initialStart: string
  initialEnd: string
  initialQ?: string
  onChange: (next: { start: string; end: string; q?: string }) => void
}

export default function EarningsFilters({ initialStart, initialEnd, initialQ, onChange }: Props) {
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [q, setQ] = useState(initialQ ?? '')

  function apply() {
    onChange({ start, end, q: q || undefined })
  }

  function reset() {
    setStart(initialStart)
    setEnd(initialEnd)
    setQ(initialQ ?? '')
    onChange({ start: initialStart, end: initialEnd, q: initialQ })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
      className="w-full bg-white p-4 rounded shadow-sm mb-4"
    >
      <div className="flex flex-col md:flex-row md:items-end md:space-x-4 gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Start date</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded border-gray-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            aria-label="Start date"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">End date</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded border-gray-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            aria-label="End date"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Symbol / Company</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="AAPL or Apple"
            className="mt-1 w-full rounded border-gray-200 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            aria-label="Search symbol or company"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded shadow-sm text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  )
}
