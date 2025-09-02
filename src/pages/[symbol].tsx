import { useRouter } from 'next/router'

export default function StockAnalysis() {
  const router = useRouter()
  const { symbol } = router.query

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Stock Analysis: {symbol}</h1>
      <div className="p-6 bg-white rounded shadow">
        <p className="text-gray-600">Placeholder for price charts, indicators, and fundamentals for {symbol}.</p>
      </div>
    </div>
  )
}
