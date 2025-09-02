import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between">
          <div className="flex space-x-4">
            <div>
              <Link href="/" className="flex items-center py-5 px-2 text-gray-700">
                <span className="font-bold">MarketAnalysis AI</span>
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <Link href="/" className="py-5 px-3 text-gray-700 hover:text-gray-900">Home</Link>
              <Link href="/earnings" className="py-5 px-3 text-gray-700 hover:text-gray-900">Earnings</Link>
              <Link href="/stock" className="py-5 px-3 text-gray-700 hover:text-gray-900">Search Stocks</Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
