import Head from 'next/head'
import type { GetServerSideProps, NextPage } from 'next'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import MarkdownRenderer from '../../components/MarkdownRenderer'

interface TechnicalIndicators {
  RSI?: number
  MACD?: number
  Support?: number
  Resistance?: number
  '50_day_ma'?: number
  '200_day_ma'?: number
}

interface MarketAnalysis {
  symbol: string
  analysis: string
  technical_indicators: TechnicalIndicators
  sector_analysis: string
  competitive_position: string
  market_outlook: string
  generated_at: string
}

interface SentimentData {
  sentiment: string
  score: number
  summary: string
}

interface SentimentAnalysis {
  symbol: string
  overall_sentiment: string
  sentiment_score: number
  news_sentiment: SentimentData
  social_sentiment: SentimentData
  analyst_sentiment: SentimentData
  sentiment_drivers: string[]
  sentiment_summary: string
  generated_at: string
}

interface RiskData {
  rating: string
  score: number
  summary: string
  key_risks: string[]
}

interface RiskAnalysis {
  symbol: string
  overall_risk_rating: string
  risk_score: number
  financial_risks: RiskData
  market_risks: RiskData
  operational_risks: RiskData
  regulatory_risks: RiskData
  risk_factors: string[]
  risk_mitigation: string[]
  risk_summary: string
  generated_at: string
}

interface Props {
  symbol: string
}

const DeeperAnalysisPage: NextPage<Props> = ({ symbol }) => {
  const router = useRouter()
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null)
  const [sentimentAnalysis, setSentimentAnalysis] = useState<SentimentAnalysis | null>(null)
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null)
  
  // Individual loading states for each analysis
  const [marketLoading, setMarketLoading] = useState(true)
  const [sentimentLoading, setSentimentLoading] = useState(true)
  const [riskLoading, setRiskLoading] = useState(true)
  
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('market')

  useEffect(() => {
    if (symbol) {
      loadAnalysesAsync()
    }
  }, [symbol])

  const loadAnalysesAsync = async () => {
    setError(null)

    // Load Market Analysis first (priority)
    loadMarketAnalysis()
    
    // Load other analyses in background
    setTimeout(() => loadSentimentAnalysis(), 100)
    setTimeout(() => loadRiskAnalysis(), 200)
  }

  const loadMarketAnalysis = async () => {
    try {
      setMarketLoading(true)
      console.log(`📊 Loading market analysis for ${symbol}...`)
      const response = await axios.get(`/api/analysis/market/${symbol}`)
      setMarketAnalysis(response.data)
      console.log(`✅ Market analysis loaded for ${symbol}`)
    } catch (err) {
      console.error('Failed to load market analysis:', err)
      setError('Failed to load market analysis. Please try again.')
    } finally {
      setMarketLoading(false)
    }
  }

  const loadSentimentAnalysis = async () => {
    try {
      setSentimentLoading(true)
      console.log(`💭 Loading sentiment analysis for ${symbol}...`)
      const response = await axios.get(`/api/analysis/sentiment/${symbol}`)
      setSentimentAnalysis(response.data)
      console.log(`✅ Sentiment analysis loaded for ${symbol}`)
    } catch (err) {
      console.error('Failed to load sentiment analysis:', err)
    } finally {
      setSentimentLoading(false)
    }
  }

  const loadRiskAnalysis = async () => {
    try {
      setRiskLoading(true)
      console.log(`⚠️ Loading risk analysis for ${symbol}...`)
      const response = await axios.get(`/api/analysis/risk/${symbol}`)
      setRiskAnalysis(response.data)
      console.log(`✅ Risk analysis loaded for ${symbol}`)
    } catch (err) {
      console.error('Failed to load risk analysis:', err)
    } finally {
      setRiskLoading(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'very bullish': return 'text-green-600'
      case 'bullish': return 'text-green-500'
      case 'bearish': return 'text-red-500'
      case 'very bearish': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getRiskColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'very low': return 'text-green-600'
      case 'low': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'high': return 'text-red-500'
      case 'very high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getScoreColor = (score: number, isRisk: boolean = false) => {
    if (isRisk) {
      if (score <= 3) return 'text-green-600'
      if (score <= 6) return 'text-yellow-500'
      return 'text-red-500'
    } else {
      if (score >= 7) return 'text-green-600'
      if (score >= 4) return 'text-yellow-500'
      return 'text-red-500'
    }
  }

  const isInitialLoading = marketLoading && !marketAnalysis

  if (isInitialLoading) {
    return (
      <>
        <Head>
          <title>{symbol} - Deeper Analysis | MarketAnalysis AI</title>
          <meta name="description" content={`Comprehensive analysis for ${symbol} including market, sentiment, and risk analysis`} />
        </Head>
        
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to {symbol} Details
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Deeper Analysis: {symbol}
          </h1>
          <p className="text-gray-600 mt-2">
            Loading comprehensive market, sentiment, and risk analysis...
          </p>
        </div>

        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={loadAnalysesAsync}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{symbol} - Deeper Analysis | MarketAnalysis AI</title>
        <meta name="description" content={`Comprehensive analysis for ${symbol} including market, sentiment, and risk analysis`} />
      </Head>
      
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
        >
            ← Back to {symbol} Details
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Deeper Analysis: {symbol}
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive market, sentiment, and risk analysis powered by Azure AI
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'market', label: 'Market Analysis', icon: '📊', loading: marketLoading, data: marketAnalysis },
              { id: 'sentiment', label: 'Sentiment Analysis', icon: '💭', loading: sentimentLoading, data: sentimentAnalysis },
              { id: 'risk', label: 'Risk Analysis', icon: '⚠️', loading: riskLoading, data: riskAnalysis }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon} {tab.label}</span>
                {tab.loading && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {!tab.loading && tab.data && (
                  <span className="text-green-500 text-xs">✓</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Market Analysis Tab */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            {marketLoading ? (
              <div className="animate-pulse space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i}>
                          <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                          <div className="h-5 bg-gray-200 rounded w-12"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : marketAnalysis ? (
              <div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Technical Indicators */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Technical Indicators</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {marketAnalysis.technical_indicators.RSI && (
                        <div>
                          <div className="text-sm text-gray-600">RSI</div>
                          <div className="font-semibold">{marketAnalysis.technical_indicators.RSI}</div>
                        </div>
                      )}
                      {marketAnalysis.technical_indicators.Support && (
                        <div>
                          <div className="text-sm text-gray-600">Support</div>
                          <div className="font-semibold">${marketAnalysis.technical_indicators.Support}</div>
                        </div>
                      )}
                      {marketAnalysis.technical_indicators.Resistance && (
                        <div>
                          <div className="text-sm text-gray-600">Resistance</div>
                          <div className="font-semibold">${marketAnalysis.technical_indicators.Resistance}</div>
                        </div>
                      )}
                      {marketAnalysis.technical_indicators['50_day_ma'] && (
                        <div>
                          <div className="text-sm text-gray-600">50-Day MA</div>
                          <div className="font-semibold">${marketAnalysis.technical_indicators['50_day_ma']}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Market Outlook */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Market Outlook</h3>
                    <MarkdownRenderer 
                      content={marketAnalysis.market_outlook || 'No specific outlook data available.'} 
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Sector Analysis */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Sector Analysis</h3>
                  <MarkdownRenderer 
                    content={marketAnalysis.sector_analysis || 'No specific sector analysis available.'} 
                    className="text-sm"
                  />
                </div>

                {/* Competitive Position */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Competitive Position</h3>
                  <MarkdownRenderer 
                    content={marketAnalysis.competitive_position || 'No competitive position data available.'} 
                    className="text-sm"
                  />
                </div>

                {/* Full Analysis */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Complete Market Analysis</h3>
                  <MarkdownRenderer 
                    content={marketAnalysis.analysis} 
                    className="text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">Failed to load market analysis. Please try refreshing the page.</p>
              </div>
            )}
          </div>
        )}

        {/* Sentiment Analysis Tab */}
        {activeTab === 'sentiment' && (
          <div className="space-y-6">
            {sentimentLoading ? (
              <div className="animate-pulse space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-6">
                      <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="text-center">
                        <div className="h-8 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-16 mx-auto"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : sentimentAnalysis ? (
              <div>
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Overall Sentiment */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Overall Sentiment</h3>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getSentimentColor(sentimentAnalysis.overall_sentiment)}`}>
                        {sentimentAnalysis.overall_sentiment}
                      </div>
                      <div className={`text-lg ${getScoreColor(sentimentAnalysis.sentiment_score)}`}>
                        {sentimentAnalysis.sentiment_score.toFixed(1)}/10
                      </div>
                    </div>
                  </div>

                  {/* News Sentiment */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">News Sentiment</h3>
                    <div className={`font-semibold ${getSentimentColor(sentimentAnalysis.news_sentiment.sentiment)}`}>
                      {sentimentAnalysis.news_sentiment.sentiment}
                    </div>
                    <div className={`text-sm ${getScoreColor(sentimentAnalysis.news_sentiment.score)}`}>
                      Score: {sentimentAnalysis.news_sentiment.score.toFixed(1)}/10
                    </div>
                  </div>

                  {/* Analyst Sentiment */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Analyst Sentiment</h3>
                    <div className={`font-semibold ${getSentimentColor(sentimentAnalysis.analyst_sentiment.sentiment)}`}>
                      {sentimentAnalysis.analyst_sentiment.sentiment}
                    </div>
                    <div className={`text-sm ${getScoreColor(sentimentAnalysis.analyst_sentiment.score)}`}>
                      Score: {sentimentAnalysis.analyst_sentiment.score.toFixed(1)}/10
                    </div>
                  </div>
                </div>

                {/* Sentiment Drivers */}
                {sentimentAnalysis.sentiment_drivers.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Key Sentiment Drivers</h3>
                    <ul className="space-y-2">
                      {sentimentAnalysis.sentiment_drivers.map((driver, index) => (
                        <li key={index} className="flex items-start">
                          <span className="flex-shrink-0 h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
                          <span className="text-gray-700">{driver}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sentiment Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Sentiment Summary</h3>
                  <MarkdownRenderer 
                    content={sentimentAnalysis.sentiment_summary} 
                    className="text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">Loading sentiment analysis in the background...</p>
              </div>
            )}
          </div>
        )}

        {/* Risk Analysis Tab */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            {riskLoading ? (
              <div className="animate-pulse space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="text-center">
                      <div className="h-8 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-16 mx-auto"></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : riskAnalysis ? (
              <div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Overall Risk */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Overall Risk Assessment</h3>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getRiskColor(riskAnalysis.overall_risk_rating)}`}>
                        {riskAnalysis.overall_risk_rating} Risk
                      </div>
                      <div className={`text-lg ${getScoreColor(riskAnalysis.risk_score, true)}`}>
                        {riskAnalysis.risk_score.toFixed(1)}/10
                      </div>
                    </div>
                  </div>

                  {/* Risk Categories */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Risk Categories</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Financial Risk</span>
                        <span className={`font-semibold ${getRiskColor(riskAnalysis.financial_risks.rating)}`}>
                          {riskAnalysis.financial_risks.rating}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Market Risk</span>
                        <span className={`font-semibold ${getRiskColor(riskAnalysis.market_risks.rating)}`}>
                          {riskAnalysis.market_risks.rating}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Operational Risk</span>
                        <span className={`font-semibold ${getRiskColor(riskAnalysis.operational_risks.rating)}`}>
                          {riskAnalysis.operational_risks.rating}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Regulatory Risk</span>
                        <span className={`font-semibold ${getRiskColor(riskAnalysis.regulatory_risks.rating)}`}>
                          {riskAnalysis.regulatory_risks.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                {riskAnalysis.risk_factors.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Key Risk Factors</h3>
                    <ul className="space-y-2">
                      {riskAnalysis.risk_factors.map((factor, index) => (
                        <li key={index} className="flex items-start">
                          <span className="flex-shrink-0 h-2 w-2 bg-red-500 rounded-full mt-2 mr-3"></span>
                          <span className="text-gray-700">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Mitigation */}
                {riskAnalysis.risk_mitigation.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Risk Mitigation Strategies</h3>
                    <ul className="space-y-2">
                      {riskAnalysis.risk_mitigation.map((strategy, index) => (
                        <li key={index} className="flex items-start">
                          <span className="flex-shrink-0 h-2 w-2 bg-green-500 rounded-full mt-2 mr-3"></span>
                          <span className="text-gray-700">{strategy}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Risk Analysis Summary</h3>
                  <MarkdownRenderer 
                    content={riskAnalysis.risk_summary} 
                    className="text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">Loading risk analysis in the background...</p>
              </div>
            )}
          </div>
        )}

        {/* Analysis Metadata */}
        <div className="text-center text-sm text-gray-500 mt-8">
          Analysis generated at: {new Date(
            (activeTab === 'market' ? marketAnalysis?.generated_at :
            activeTab === 'sentiment' ? sentimentAnalysis?.generated_at :
            riskAnalysis?.generated_at) || new Date().toISOString()
          ).toLocaleString()}
        </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const symbolRaw = ctx.params?.symbol as string | undefined
  if (!symbolRaw) return { notFound: true }
  const symbol = symbolRaw.toUpperCase()
  
  return { props: { symbol } }
}

export default DeeperAnalysisPage
