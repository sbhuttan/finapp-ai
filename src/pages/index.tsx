import Head from 'next/head'
import type { GetServerSideProps, NextPage } from 'next'
import MarketOverview from '../components/MarketOverview'
import { getMultipleIndexQuotes, IndexQuote, RangeKey } from '../lib/market'
import { useSettings } from '../lib/settings'

interface Props {
  initialData: IndexQuote[]
  initialRange: RangeKey
}

const Home: NextPage<Props> = ({ initialData, initialRange }) => {
  const { settings } = useSettings()
  
  return (
    <>
      <Head>
        <title>MarketAnalysis AI — Market Overview</title>
        <meta name="description" content="US market overview: S&P 500, NASDAQ, Dow — live snapshots and charts." />
      </Head>

      {settings.showMarketOverview ? (
        <MarketOverview initialData={initialData} initialRange={initialRange} />
      ) : (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to MarketAnalysis AI</h2>
          <p className="text-gray-600 mb-8">Market overview is currently hidden. You can enable it in the settings.</p>
          <p className="text-sm text-gray-500">Click the settings icon in the top right to customize your view.</p>
        </div>
      )}
    </>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const initialData = await getMultipleIndexQuotes(['^GSPC', '^IXIC', '^DJI'], '1D')
    return { props: { initialData, initialRange: '1D' } }
  } catch (err) {
    // fallback to empty mock data if something fails
    const initialData: IndexQuote[] = []
    return { props: { initialData, initialRange: '1D' } }
  }
}

export default Home
