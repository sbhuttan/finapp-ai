import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Navbar from '../components/Navbar'
import { SettingsProvider } from '../lib/settings'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SettingsProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-6xl mx-auto p-4">
          <Component {...pageProps} />
        </main>
      </div>
    </SettingsProvider>
  )
}
