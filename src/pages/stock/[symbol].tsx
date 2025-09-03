import Head from 'next/head'
import type { GetServerSideProps, NextPage } from 'next'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { getStockOverview, getStockNews, PriceRange, StockOverview, NewsItem } from '../../lib/stocks'
import { useSettings } from '../../lib/settings'
import StockHeader from '../../components/StockHeader'
import PriceRangeToggle from '../../components/PriceRangeToggle'
import PriceChart from '../../components/PriceChart'
import KeyStatsGrid from '../../components/KeyStatsGrid'
import EarningsMiniChart from '../../components/EarningsMiniChart'
import NewsList from '../../components/NewsList'
import StockQA from '../../components/StockQA'

interface Props { initial: StockOverview; initialRange: PriceRange; symbol: string }

const StockPage: NextPage<Props> = ({ initial, initialRange, symbol }) => {
  const { settings } = useSettings()
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
          {settings.showDeeperAnalysis && (
            <Link
              href={`/analysis/${symbol}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              🔍 Deeper Analysis
            </Link>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mt-4">
          {/* Left column - Main content */}
          {(settings.showPriceChart || settings.showEarningsChart || settings.showNewsList) && (
            <div className={`${(settings.showKeyStats || settings.showStockQA) ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
              {settings.showPriceChart && (
                <PriceChart data={history} loading={loadingHistory} />
              )}
              {settings.showEarningsChart && (
                <EarningsMiniChart data={overview.earnings} />
              )}
              {settings.showNewsList && (
                <NewsList news={news} loading={loadingNews} />
              )}
            </div>
          )}

          {/* Right column - Sidebar */}
          {(settings.showKeyStats || settings.showStockQA) && (
            <div className="space-y-6">
              {settings.showKeyStats && (
                <KeyStatsGrid quote={overview.quote} />
              )}
              {settings.showStockQA && (
                <StockQA symbol={symbol} range={range} />
              )}
            </div>
          )}
          
          {/* Show message if all sections are hidden */}
          {!settings.showPriceChart && !settings.showEarningsChart && !settings.showNewsList && !settings.showKeyStats && !settings.showStockQA && (
            <div className="lg:col-span-3 text-center py-16">
              <h3 className="text-xl font-medium text-gray-900 mb-4">All sections are currently hidden</h3>
              <p className="text-gray-600 mb-6">You can enable sections in the display settings to customize your view.</p>
              <p className="text-sm text-gray-500">Click the settings icon in the top right to show content.</p>
            </div>
          )}
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
