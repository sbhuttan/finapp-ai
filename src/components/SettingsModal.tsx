import React from 'react'
import { useSettings, VisibilitySettings } from '../lib/settings'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, resetSettings } = useSettings()
  const [notification, setNotification] = React.useState('')

  if (!isOpen) return null

  const handleToggle = (key: keyof VisibilitySettings) => {
    // Prevent hiding all navigation tabs
    if (key === 'showHome' || key === 'showEarnings' || key === 'showSearchStocks') {
      const navTabsCount = [settings.showHome, settings.showEarnings, settings.showSearchStocks].filter(Boolean).length
      if (navTabsCount === 1 && settings[key]) {
        // Don't allow hiding the last navigation tab
        setNotification('At least one navigation tab must remain visible')
        setTimeout(() => setNotification(''), 3000)
        return
      }
    }
    
    updateSettings({ [key]: !settings[key] })
  }

  const handleReset = () => {
    resetSettings()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Display Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">Customize which sections and tabs are visible in the application</p>
          {notification && (
            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
              {notification}
            </div>
          )}
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Navigation Tabs Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Navigation Tabs</h3>
            <div className="space-y-3">
              <SettingToggle
                label="Home"
                description="Market overview and main dashboard"
                checked={settings.showHome}
                onChange={() => handleToggle('showHome')}
              />
              <SettingToggle
                label="Earnings"
                description="Earnings calendar and data"
                checked={settings.showEarnings}
                onChange={() => handleToggle('showEarnings')}
              />
              <SettingToggle
                label="Search Stocks"
                description="Stock search and individual analysis"
                checked={settings.showSearchStocks}
                onChange={() => handleToggle('showSearchStocks')}
              />
            </div>
          </div>

          {/* Stock Page Sections */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Stock Page Sections</h3>
            <div className="space-y-3">
              <SettingToggle
                label="Price Chart"
                description="Interactive price and volume charts"
                checked={settings.showPriceChart}
                onChange={() => handleToggle('showPriceChart')}
              />
              <SettingToggle
                label="Earnings Chart"
                description="Historical earnings data visualization"
                checked={settings.showEarningsChart}
                onChange={() => handleToggle('showEarningsChart')}
              />
              <SettingToggle
                label="News List"
                description="Latest financial news for the stock"
                checked={settings.showNewsList}
                onChange={() => handleToggle('showNewsList')}
              />
              <SettingToggle
                label="Key Statistics"
                description="Important financial metrics and ratios"
                checked={settings.showKeyStats}
                onChange={() => handleToggle('showKeyStats')}
              />
              <SettingToggle
                label="Stock Q&A"
                description="AI-powered stock analysis chat"
                checked={settings.showStockQA}
                onChange={() => handleToggle('showStockQA')}
              />
              <SettingToggle
                label="Deeper Analysis"
                description="Comprehensive AI analysis button"
                checked={settings.showDeeperAnalysis}
                onChange={() => handleToggle('showDeeperAnalysis')}
              />
            </div>
          </div>

          {/* Home Page Sections */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Home Page Sections</h3>
            <div className="space-y-3">
              <SettingToggle
                label="Market Overview"
                description="S&P 500, NASDAQ, and Dow Jones data"
                checked={settings.showMarketOverview}
                onChange={() => handleToggle('showMarketOverview')}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

interface SettingToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900 cursor-pointer" onClick={onChange}>
          {label}
        </label>
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </div>
      <div className="ml-3">
        <button
          type="button"
          onClick={onChange}
          className={`${
            checked ? 'bg-blue-600' : 'bg-gray-200'
          } relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        >
          <span
            className={`${
              checked ? 'translate-x-4' : 'translate-x-0'
            } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>
    </div>
  )
}
