import axios from 'axios'

// Types
import { BACKEND_CONFIG } from './backend-config'

export type PriceRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y'

export interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
  marketCap?: number | null
  peRatio?: number | null
  epsTTM?: number | null
  dividendYield?: number | null
  week52High?: number | null
  week52Low?: number | null
  lastUpdated: number
}

export interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v?: number
}

export interface EarningsQuarter {
  fiscalPeriod: string
  date?: string | null
  epsEstimate?: number | null
  epsActual?: number | null
}

export interface NewsItem {
  id: string
  source: string
  headline: string
  url: string
  publishedAt: string
  summary?: string | null
}

export interface StockOverview {
  quote: Quote
  history: Candle[]
  earnings: EarningsQuarter[]
  news: NewsItem[]
}

export interface SymbolHit {
  symbol: string
  name: string
  exchange?: string
}

// Simple in-memory cache
const CACHE = new Map<string, { ts: number; value: any }>()
const MAX_CACHE = 200
const CACHE_TTL = 1000 * 60 * 5 // 5 min

function getCache<T>(key: string): T | null {
  const entry = CACHE.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    CACHE.delete(key)
    return null
  }
  return entry.value as T
}

function setCache(key: string, value: any) {
  if (CACHE.size > MAX_CACHE) {
    // evict oldest safely
    const it = CACHE.keys()
    const firstKey = it.next().value as string | undefined
    if (firstKey) CACHE.delete(firstKey)
  }
  CACHE.set(key, { ts: Date.now(), value })
}

// Helpers: seeded RNG
function hashStringToInt(s: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}
function mulberry32(seed: number) {
  let t = seed >>> 0
  return function () {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function sanitizeSymbol(raw: string) {
  if (!raw) throw new Error('Missing symbol')
  const s = raw.toUpperCase()
  if (!/^[A-Z0-9.\-]+$/.test(s)) throw new Error('Invalid symbol')
  return s
}

function rangeToMinutes(range: PriceRange): number {
  switch (range) {
    case '1D':
      return 5
    case '5D':
      return 15
    case '1M':
      return 60 * 24
    case '6M':
      return 60 * 24
    case '1Y':
      return 60 * 24
    case '5Y':
      return 60 * 24 * 7
    default:
      return 60 * 24 // Default to daily
  }
}

// MOCK data generators
const BASE_PRICE: Record<string, number> = { AAPL: 175, MSFT: 420, AMZN: 165, TSLA: 260, GOOGL: 150, NVDA: 1100 }

async function generateMockQuote(symbol: string): Promise<Quote> {
  const seed = hashStringToInt(symbol + '|quote')
  const rnd = mulberry32(seed)
  const base = BASE_PRICE[symbol] ?? Math.round(50 + rnd() * 500)
  const drift = (rnd() - 0.5) * 0.02
  const price = Number((base * (1 + drift)).toFixed(2))
  const change = Number(((rnd() - 0.5) * 5).toFixed(2))
  const changePercent = Number(((change / Math.max(1, price - change)) * 100).toFixed(2))
  return {
    symbol,
    name: `${symbol} Corporation`,
    price,
    change,
    changePercent,
    currency: 'USD',
    marketCap: Math.round(price * (1e7 + rnd() * 1e9)),
    peRatio: Number((10 + rnd() * 35).toFixed(2)),
    epsTTM: Number((rnd() * 10).toFixed(2)),
    dividendYield: rnd() > 0.7 ? Number((rnd() * 5).toFixed(2)) : null,
    week52High: Number((price * (1 + rnd() * 0.3)).toFixed(2)),
    week52Low: Number((price * (1 - rnd() * 0.3)).toFixed(2)),
    lastUpdated: Date.now(),
  }
}

async function generateMockHistory(symbol: string, range: PriceRange): Promise<Candle[]> {
  const seed = hashStringToInt(symbol + '|' + range)
  const rnd = mulberry32(seed)
  const minutes = rangeToMinutes(range)
  const now = Date.now()
  const durationMs = (() => {
    switch (range) {
      case '1D':
        return 24 * 60 * 60 * 1000
      case '5D':
        return 5 * 24 * 60 * 60 * 1000
      case '1M':
        return 30 * 24 * 60 * 60 * 1000
      case '3M':
        return 90 * 24 * 60 * 60 * 1000
      case '6M':
        return 180 * 24 * 60 * 60 * 1000
      case '1Y':
        return 365 * 24 * 60 * 60 * 1000
      case '2Y':
        return 2 * 365 * 24 * 60 * 60 * 1000
      case '5Y':
        return 5 * 365 * 24 * 60 * 60 * 1000
      default:
        return 180 * 24 * 60 * 60 * 1000 // Default to 6M
    }
  })()
  const step = minutes * 60 * 1000
  const points = Math.max(10, Math.ceil(durationMs / step))
  let price = (BASE_PRICE[symbol] ?? 100) * (1 + (rnd() - 0.5) * 0.02)
  const candles: Candle[] = []
  for (let i = points; i >= 0; i--) {
    const t = now - i * step
    const o = Number((price * (1 + (rnd() - 0.5) * 0.002)).toFixed(2))
    const c = Number((o * (1 + (rnd() - 0.5) * 0.01)).toFixed(2))
    const h = Math.max(o, c) * (1 + rnd() * 0.002)
    const l = Math.min(o, c) * (1 - rnd() * 0.002)
    const v = Math.round(1000 + rnd() * 1000000)
    candles.push({ t, o, h: Number(h.toFixed(2)), l: Number(l.toFixed(2)), c, v })
    price = c
  }
  return candles
}

async function generateMockEarnings(symbol: string): Promise<EarningsQuarter[]> {
  const seed = hashStringToInt(symbol + '|earn')
  const rnd = mulberry32(seed)
  const quarters: EarningsQuarter[] = []
  const now = new Date()
  for (let i = 0; i < 8; i++) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i * 3)
    const year = d.getFullYear()
    const qnum = Math.ceil((d.getMonth() + 1) / 3)
    const epsEst = Number((rnd() * 3).toFixed(2))
    const epsAct = Number((epsEst + (rnd() - 0.5) * 0.5).toFixed(2))
    quarters.push({ fiscalPeriod: `Q${qnum} ${year}`, date: d.toISOString().slice(0, 10), epsEstimate: epsEst, epsActual: epsAct })
  }
  return quarters.reverse()
}

async function generateMockNews(symbol: string, limit = 5): Promise<NewsItem[]> {
  const seed = hashStringToInt(symbol + '|news')
  const rnd = mulberry32(seed)
  const sources = ['Reuters', 'Bloomberg', 'WSJ', 'CNBC', 'MarketWatch']
  const items: NewsItem[] = []
  for (let i = 0; i < limit; i++) {
    const publishedAt = new Date(Date.now() - i * 3600 * 1000 * (1 + Math.floor(rnd() * 48))).toISOString()
    items.push({
      id: `${symbol}-news-${i}`,
      source: sources[Math.floor(rnd() * sources.length)],
      headline: `${symbol} news headline ${i + 1}`,
      url: `https://example.com/${symbol}/news/${i}`,
      publishedAt,
      summary: `Summary for ${symbol} news ${i + 1}`,
    })
  }
  return items
}

// Provider placeholder - real implementation would call FINNHUB or POLYGON and normalize
async function fetchFromProvider(_symbol: string, _range?: PriceRange): Promise<any> {
  throw new Error('Provider integration not implemented in this skeleton')
}

// Public API
export async function getQuote(symbolRaw: string): Promise<Quote> {
  const symbol = sanitizeSymbol(symbolRaw)
  const key = `quote:${symbol}`
  const cached = getCache<Quote>(key)
  if (cached) return cached

  const mock = process.env.STOCK_DATA_MOCK === '1'
  if (mock) {
    const q = await generateMockQuote(symbol)
    setCache(key, q)
    return q
  }

  try {
    const q = await fetchFromProvider(symbol)
    setCache(key, q)
    return q
  } catch (err) {
    // fallback to mock for resilience
    const q = await generateMockQuote(symbol)
    setCache(key, q)
    return q
  }
}

export async function getPriceHistory(symbolRaw: string, range: PriceRange): Promise<Candle[]> {
  const symbol = sanitizeSymbol(symbolRaw)
  const key = `hist:${symbol}:${range}`
  const cached = getCache<Candle[]>(key)
  if (cached) return cached

  const mock = process.env.STOCK_DATA_MOCK === '1'
  if (mock) {
    const h = await generateMockHistory(symbol, range)
    setCache(key, h)
    return h
  }

  try {
    const h = await fetchFromProvider(symbol, range)
    setCache(key, h)
    return h
  } catch (err) {
    const h = await generateMockHistory(symbol, range)
    setCache(key, h)
    return h
  }
}

export async function getEarningsHistory(symbolRaw: string): Promise<EarningsQuarter[]> {
  const symbol = sanitizeSymbol(symbolRaw)
  const key = `earn:${symbol}`
  const cached = getCache<EarningsQuarter[]>(key)
  if (cached) return cached
  const mock = process.env.STOCK_DATA_MOCK === '1'
  if (mock) {
    const e = await generateMockEarnings(symbol)
    setCache(key, e)
    return e
  }
  try {
    // provider placeholder
    const e = await generateMockEarnings(symbol)
    setCache(key, e)
    return e
  } catch (err) {
    const e = await generateMockEarnings(symbol)
    setCache(key, e)
    return e
  }
}

export async function getNews(symbolRaw: string, limit = 5): Promise<NewsItem[]> {
  const symbol = sanitizeSymbol(symbolRaw)
  const key = `news:${symbol}:${limit}`
  const cached = getCache<NewsItem[]>(key)
  if (cached) return cached
  const mock = process.env.STOCK_DATA_MOCK === '1'
  if (mock) {
    const n = await generateMockNews(symbol, limit)
    setCache(key, n)
    return n
  }
  try {
    // provider placeholder
    const n = await generateMockNews(symbol, limit)
    setCache(key, n)
    return n
  } catch (err) {
    const n = await generateMockNews(symbol, limit)
    setCache(key, n)
    return n
  }
}

export async function getStockOverview(symbol: string, range: PriceRange): Promise<StockOverview> {
  const s = sanitizeSymbol(symbol)
  
  // Load core data first (quote, history, earnings) without news
  const [quote, history, earnings] = await Promise.all([
    getQuote(s),
    getPriceHistory(s, range),
    getEarningsHistory(s),
  ])
  
  // Return with empty news array - news will be loaded separately
  return { quote, history, earnings, news: [] }
}

// New function to load news separately
export async function getStockNews(symbol: string, limit: number = 10): Promise<NewsItem[]> {
  const s = sanitizeSymbol(symbol)
  
  try {
    if (BACKEND_CONFIG.type === 'python') {
      const response = await fetch(`${BACKEND_CONFIG.pythonUrl}/api/stock/news?symbol=${s}&limit=${limit}`)
      if (!response.ok) throw new Error(`Backend returned ${response.status}`)
      return await response.json()
    } else {
      return getNews(s, limit)
    }
  } catch (err) {
    console.warn('Failed to fetch news, falling back to mock:', err)
    return getNews(s, limit)
  }
}

const SEARCH_SYMBOLS: SymbolHit[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', exchange: 'NYSE' },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', exchange: 'NYSE' },
]

export async function searchSymbols(q: string, limit = 10): Promise<SymbolHit[]> {
  if (!q) return []
  const query = q.toLowerCase().trim()
  const mock = process.env.STOCK_DATA_MOCK === '1'
  
  if (mock) {
    const matches = SEARCH_SYMBOLS.filter(
      (s) => s.symbol.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
    )
    // Simple relevance: exact symbol match first, then symbol prefix, then name match
    matches.sort((a, b) => {
      const aSymExact = a.symbol.toLowerCase() === query ? 1000 : 0
      const bSymExact = b.symbol.toLowerCase() === query ? 1000 : 0
      const aSymPrefix = a.symbol.toLowerCase().startsWith(query) ? 100 : 0
      const bSymPrefix = b.symbol.toLowerCase().startsWith(query) ? 100 : 0
      const aNameMatch = a.name.toLowerCase().includes(query) ? 10 : 0
      const bNameMatch = b.name.toLowerCase().includes(query) ? 10 : 0
      const scoreA = aSymExact + aSymPrefix + aNameMatch
      const scoreB = bSymExact + bSymPrefix + bNameMatch
      return scoreB - scoreA
    })
    return matches.slice(0, Math.min(limit, 25))
  }

  try {
    // Provider placeholder for symbol search
    // Real implementation would call FINNHUB/POLYGON/YAHOO search endpoints
    return []
  } catch (err) {
    return []
  }
}
