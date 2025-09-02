import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { EarningsQuarter } from '../lib/stocks'
import { formatNumberCompact } from '../lib/format'

const Bar = dynamic(() => import('react-chartjs-2').then(m => m.Bar), { ssr: false })

interface Props { data: EarningsQuarter[] }

export default function EarningsMiniChart({ data }: Props) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try { const mod = await import('../lib/chartjs'); mod.registerChartJs() } catch (e) {}
      if (mounted) setReady(true)
    })()
    return () => { mounted = false }
  }, [])

  const labels = data.map(d => d.fiscalPeriod)
  const est = data.map(d => d.epsEstimate ?? 0)
  const act = data.map(d => d.epsActual ?? 0)

  const chartData = { labels, datasets: [ { label: 'Estimate', data: est, backgroundColor: '#94a3b8' }, { label: 'Actual', data: act, backgroundColor: '#3b82f6' } ] }
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }

  return (
    <div className="bg-white rounded p-4 h-56">
      <h3 className="font-semibold mb-2">Earnings (EPS)</h3>
      {ready ? <Bar data={chartData as any} options={options as any} /> : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
    </div>
  )
}
