import Head from 'next/head'
import type { GetServerSideProps, NextPage } from 'next'
import MarketOverview from '../components/MarketOverview'
import { getMultipleIndexQuotes, IndexQuote, RangeKey } from '../lib/market'

interface Props {
  initialData: IndexQuote[]
  initialRange: RangeKey
}

const Home: NextPage<Props> = ({ initialData, initialRange }) => {
  return (
    <>
      <Head>
        <title>MarketAnalysis AI — Market Overview</title>
        <meta name="description" content="US market overview: S&P 500, NASDAQ, Dow — live snapshots and charts." />
      </Head>

      <MarketOverview initialData={initialData} initialRange={initialRange} />
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
