import Head from 'next/head'
import type { GetServerSideProps, NextPage } from 'next'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { getStockOverview, getStockNews, PriceRange, StockOverview, NewsItem } from '../../lib/stocks'
import StockHeader from '../../components/StockHeader'
import PriceRangeToggle from '../../components/PriceRangeToggle'
import PriceChart from '../../components/PriceChart'
import KeyStatsGrid from '../../components/KeyStatsGrid'
import EarningsMiniChart from '../../components/EarningsMiniChart'
import NewsList from '../../components/NewsList'
import StockQA from '../../components/StockQA'

interface Props { initial: StockOverview; initialRange: PriceRange; symbol: string }

const StockPage: NextPage<Props> = ({ initial, initialRange, symbol }) => {
  const [overview, setOverview] = useState<StockOverview>(initial)
  const [range, setRange] = useState<PriceRange>(initialRange)
  const [history, setHistory] = useState(initial.history)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [news, setNews] = useState<NewsItem[]>(initial.news)
  const [loadingNews, setLoadingNews] = useState(true)

  // Load news separately after page loads
  useEffect(() => {
    async function loadNews() {
      try {
        setLoadingNews(true)
        const newsData = await getStockNews(symbol, 10)
        setNews(newsData)
      } catch (error) {
        console.error('Failed to load news:', error)
      } finally {
        setLoadingNews(false)
      }
    }
    
    loadNews()
  }, [symbol])

  async function handleRangeChange(r: PriceRange) {
    setRange(r)
    setLoadingHistory(true)
    try {
      const res = await axios.get('/api/stock/history', { params: { symbol, range: r } })
      setHistory(res.data)
    } catch (err) {
      console.error('failed to load history', err)
    } finally { setLoadingHistory(false) }
  }

  return (
    <>
      <Head>
        <title>{symbol} Analysis | MarketAnalysis AI</title>
        <meta name="description" content={`${symbol} stock analysis`} />
      </Head>

      <div className="max-w-6xl mx-auto p-4">
        <StockHeader quote={overview.quote} />

        <div className="mt-4 flex items-center justify-between">
          <PriceRangeToggle range={range} onChange={handleRangeChange} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mt-4">
          <div className="lg:col-span-2 space-y-6">
            <PriceChart data={history} loading={loadingHistory} />
            <EarningsMiniChart data={overview.earnings} />
            <NewsList news={news} loading={loadingNews} />
          </div>

          <div className="space-y-6">
            <KeyStatsGrid quote={overview.quote} />
            <StockQA symbol={symbol} range={range} />
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const symbolRaw = ctx.params?.symbol as string | undefined
  if (!symbolRaw) return { notFound: true }
  const symbol = symbolRaw.toUpperCase()
  const range: PriceRange = '6M'
  try {
    const overview = await getStockOverview(symbol, range)
    return { props: { initial: overview, initialRange: range, symbol } }
  } catch (err) {
    return { notFound: true }
  }
}

export default StockPage
