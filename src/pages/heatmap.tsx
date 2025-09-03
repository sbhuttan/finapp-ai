import Head from 'next/head'
import type { NextPage } from 'next'
import Heatmap from '../components/Heatmap'

const HeatmapPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>S&P 500 Heatmap | MarketAnalysis AI</title>
        <meta name="description" content="Interactive heatmap of top 50 S&P 500 stocks by market capitalization weight" />
      </Head>

      <div className="max-w-7xl mx-auto p-4">
        <Heatmap />
      </div>
    </>
  )
}

export default HeatmapPage
