import Link from 'next/link'
import React, { useState } from 'react'
import { useSettings } from '../lib/settings'
import SettingsModal from './SettingsModal'

export default function Navbar() {
  const { settings } = useSettings()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
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
                {settings.showHome && (
                  <Link href="/" className="py-5 px-3 text-gray-700 hover:text-gray-900">Home</Link>
                )}
                {settings.showEarnings && (
                  <Link href="/earnings" className="py-5 px-3 text-gray-700 hover:text-gray-900">Earnings</Link>
                )}
                {settings.showHeatmap && (
                  <Link href="/heatmap" className="py-5 px-3 text-gray-700 hover:text-gray-900">Heatmap</Link>
                )}
                {settings.showSearchStocks && (
                  <Link href="/stock" className="py-5 px-3 text-gray-700 hover:text-gray-900">Stock Analysis</Link>
                )}
              </div>
            </div>
            
            {/* Right side - Settings and Mobile Menu */}
            <div className="flex items-center space-x-2">
              {/* Settings Icon */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Display Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-2">
              {settings.showHome && (
                <Link href="/" className="block py-2 px-4 text-gray-700 hover:bg-gray-100">Home</Link>
              )}
              {settings.showEarnings && (
                <Link href="/earnings" className="block py-2 px-4 text-gray-700 hover:bg-gray-100">Earnings</Link>
              )}
              {settings.showHeatmap && (
                <Link href="/heatmap" className="block py-2 px-4 text-gray-700 hover:bg-gray-100">Heatmap</Link>
              )}
              {settings.showSearchStocks && (
                <Link href="/stock" className="block py-2 px-4 text-gray-700 hover:bg-gray-100">Stock Analysis</Link>
              )}
            </div>
          )}
        </div>
      </nav>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  )
}
