import Head from 'next/head'
import type { GetServerSideProps, NextPage } from 'next'
import React, { useState } from 'react'
import axios from 'axios'
import EarningsFilters from '../components/EarningsFilters'
import EarningsTable from '../components/EarningsTable'
import { getEarnings, EarningsResult } from '../lib/earnings'

interface Props {
  initialData: EarningsResult
  initialStart: string
  initialEnd: string
  initialQ?: string
}

function localIsoDate(d = new Date()) {
  const tz = d.getTimezoneOffset() * 60000
  const local = new Date(d.getTime() - tz)
  return local.toISOString().slice(0, 10)
}

const EarningsPage: NextPage<Props> = ({ initialData, initialStart, initialEnd, initialQ }) => {
  const [data, setData] = useState<EarningsResult>(initialData)
  const [loading, setLoading] = useState(false)
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [q, setQ] = useState(initialQ ?? '')
  const [tab, setTab] = useState<'upcoming' | 'recent'>('upcoming')

  async function fetch(query: { start: string; end: string; q?: string; page?: number; perPage?: number }) {
    setLoading(true)
    try {
      const params: any = { start: query.start, end: query.end, page: query.page ?? 1, perPage: query.perPage ?? data.perPage }
      if (query.q) params.q = query.q
      const res = await axios.get('/api/earnings', { params })
      const payload: EarningsResult = res.data
      // If Recent tab is active, sort items descending by date
      if (tab === 'recent' && payload.items && payload.items.length > 0) {
        payload.items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }
      setData(payload)
    } catch (err) {
      console.error('Failed to fetch earnings', err)
      // non-blocking error: keep last good data
    } finally {
      setLoading(false)
    }
  }

  function handleFilters(next: { start: string; end: string; q?: string }) {
    setStart(next.start)
    setEnd(next.end)
    setQ(next.q ?? '')
    fetch({ start: next.start, end: next.end, q: next.q, page: 1 })
  }

  function handlePageChange(page: number) {
    fetch({ start, end, q, page })
  }

  function handlePerPageChange(n: number) {
    fetch({ start, end, q, page: 1, perPage: n })
  }

  function changeTab(t: 'upcoming' | 'recent') {
    if (t === tab) return
    setTab(t)
    if (t === 'recent') {
      const newEnd = localIsoDate()
      const newStart = localIsoDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      setStart(newStart)
      setEnd(newEnd)
      setQ('')
      fetch({ start: newStart, end: newEnd, page: 1 })
    } else {
      const newStart = localIsoDate()
      const newEnd = localIsoDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      setStart(newStart)
      setEnd(newEnd)
      setQ('')
      fetch({ start: newStart, end: newEnd, page: 1 })
    }
  }

  return (
    <>
      <Head>
        <title>Earnings Calendar</title>
        <meta name="description" content="Upcoming earnings calendar" />
      </Head>

      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Earnings Calendar</h1>

        {/* Tabs */}
        <div className="mb-4">
          <div role="tablist" aria-label="Earnings view" className="inline-flex rounded-md bg-gray-100 p-1">
            <button
              role="tab"
              aria-selected={tab === 'upcoming'}
              onClick={() => changeTab('upcoming')}
              className={`px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                tab === 'upcoming' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Upcoming
            </button>
            <button
              role="tab"
              aria-selected={tab === 'recent'}
              onClick={() => changeTab('recent')}
              className={`ml-1 px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                tab === 'recent' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Recent
            </button>
          </div>
        </div>

        {/* remount filters when start/end change so inputs reflect the tab selection */}
        <EarningsFilters key={`${tab}-${start}-${end}`} initialStart={start} initialEnd={end} initialQ={q} onChange={handleFilters} />

        <div className="relative">
          <EarningsTable data={data} loading={loading} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
          {loading && <div className="absolute inset-0 bg-white/50" aria-hidden />}
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  const start = localIsoDate()
  const end = localIsoDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  try {
    const data = await getEarnings({ start, end, page: 1, perPage: 25 })
    return { props: { initialData: data, initialStart: start, initialEnd: end } }
  } catch (err) {
    console.error('SSR earnings error', err)
    return { props: { initialData: { total: 0, page: 1, perPage: 25, items: [], generatedAt: Date.now() }, initialStart: start, initialEnd: end } }
  }
}

export default EarningsPage
