import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Navbar from '../components/Navbar'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto p-4">
        <Component {...pageProps} />
      </main>
    </div>
  )
}
