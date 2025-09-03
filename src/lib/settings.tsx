import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface VisibilitySettings {
  // Navigation tabs
  showHome: boolean
  showEarnings: boolean
  showHeatmap: boolean
  showSearchStocks: boolean
  
  // Stock page sections
  showPriceChart: boolean
  showEarningsChart: boolean
  showNewsList: boolean
  showKeyStats: boolean
  showStockQA: boolean
  showDeeperAnalysis: boolean
  
  // Home page sections
  showMarketOverview: boolean
}

const defaultSettings: VisibilitySettings = {
  // Navigation tabs
  showHome: true,
  showEarnings: true,
  showHeatmap: true,
  showSearchStocks: true,
  
  // Stock page sections
  showPriceChart: true,
  showEarningsChart: true,
  showNewsList: true,
  showKeyStats: true,
  showStockQA: true,
  showDeeperAnalysis: true,
  
  // Home page sections
  showMarketOverview: true,
}

interface SettingsContextType {
  settings: VisibilitySettings
  updateSettings: (newSettings: Partial<VisibilitySettings>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<VisibilitySettings>(defaultSettings)

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('finapp-visibility-settings')
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          setSettings({ ...defaultSettings, ...parsed })
        } catch (error) {
          console.error('Failed to parse saved settings:', error)
        }
      }
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('finapp-visibility-settings', JSON.stringify(settings))
    }
  }, [settings])

  const updateSettings = (newSettings: Partial<VisibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
