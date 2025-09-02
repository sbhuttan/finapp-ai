import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Candle } from '../lib/stocks'
import { formatCurrency } from '../lib/format'

const Line = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false })

interface Props { data: Candle[]; color?: string; loading?: boolean }

export default function PriceChart({ data, color = '#3b82f6', loading }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const mod = await import('../lib/chartjs')
        mod.registerChartJs()
      } catch (e) {}
      if (mounted) setReady(true)
    })()
    return () => { mounted = false }
  }, [])

  const chartData = {
    datasets: [
      {
        label: 'Price',
        data: data.map(d => ({ x: d.t, y: d.c })),
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => formatCurrency(ctx.parsed.y) } } },
    scales: { x: { type: 'time' as const, time: { unit: 'day' } }, y: { ticks: { callback: (v: any) => formatCurrency(Number(v)) } } }
  }

  return (
    <div className="relative bg-white rounded p-4 h-80">
      {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">Loading...</div>}
      {ready ? <Line data={chartData as any} options={options as any} /> : <div className="h-full flex items-center justify-center text-gray-400">Chart not available</div>}
    </div>
  )
}
