import React from 'react'
import { PriceRange } from '../lib/stocks'

const OPTIONS: PriceRange[] = ['1D','5D','1M','6M','1Y','5Y']

interface Props { range: PriceRange; onChange: (r: PriceRange) => void }

export default function PriceRangeToggle({ range, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md bg-gray-100 p-1" role="tablist" aria-label="Price ranges">
      {OPTIONS.map((o) => (
        <button key={o} onClick={() => onChange(o)} aria-pressed={o===range} className={`px-3 py-1 text-sm rounded ${o===range ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}
