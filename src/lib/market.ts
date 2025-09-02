import axios from 'axios'

export type IndexSymbol = '^GSPC' | '^IXIC' | '^DJI'
export interface IndexPoint { t: number; c: number }
export interface IndexQuote {
  symbol: IndexSymbol
  name: string
  price: number
  change: number
  changePercent: number
  lastUpdated: number
  history: IndexPoint[]
}

export interface IndexTileQuote {
  symbol: IndexSymbol          // "^GSPC" | "^IXIC" | "^DJI"
  name: string                 // "S&P 500" | "NASDAQ Composite" | "Dow Jones"
  price: number
  change: number
  changePercent: number
  lastUpdated: number          // unix ms
}

export type RangeKey = '1D' | '1W' | '1M' | '1Y'

const SYMBOL_NAMES: Record<IndexSymbol, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ Composite',
  '^DJI': 'Dow Jones Industrial Average',
}

const BASE_PRICES: Record<IndexSymbol, number> = {
  '^GSPC': 4500,
  '^IXIC': 15000,
  '^DJI': 35000,
}

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

function rangeToMs(range: RangeKey) {
  switch (range) {
    case '1D':
      return 24 * 60 * 60 * 1000
    case '1W':
      return 7 * 24 * 60 * 60 * 1000
    case '1M':
      return 30 * 24 * 60 * 60 * 1000
    case '1Y':
      return 365 * 24 * 60 * 60 * 1000
  }
}

function resolutionMinutesForRange(range: RangeKey) {
  switch (range) {
    case '1D':
      return 5
    case '1W':
      return 30
    case '1M':
      return 60 * 24 // daily
    case '1Y':
      return 60 * 24 // daily
  }
}

function generateDeterministicHistory(symbol: IndexSymbol, range: RangeKey): IndexPoint[] {
  const now = Date.now()
  const duration = rangeToMs(range)
  const resMin = resolutionMinutesForRange(range)
  const step = resMin * 60 * 1000
  const points = Math.max(8, Math.ceil(duration / step))
  const start = now - duration

  const seed = hashStringToInt(symbol + '|' + range)
  const rnd = mulberry32(seed)

  const base = BASE_PRICES[symbol] || 1000
  // small deterministic drift
  let value = base * (1 + (rnd() - 0.5) * 0.01)
  const volatility = 0.002 + rnd() * 0.003

  const history: IndexPoint[] = []
  for (let i = 0; i <= points; i++) {
    // simple random-walk
    const changePct = (rnd() - 0.5) * volatility
    value = Math.max(1, value * (1 + changePct))
    const t = start + i * step
    history.push({ t, c: Number(value.toFixed(2)) })
  }
  return history
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestWithRetry(url: string, params: any, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.get(url, { params, timeout: 10_000 })
      return res
    } catch (err: any) {
      const status = err?.response?.status
      if (i === retries) throw err
      // basic backoff for rate limits
      if (status === 429) await delay(500 * Math.pow(2, i))
      else await delay(250 * (i + 1))
    }
  }
  throw new Error('Unreachable')
}

async function fetchFromProvider(symbol: IndexSymbol, range: RangeKey): Promise<IndexQuote> {
  const provider = (process.env.MARKET_DATA_PROVIDER || '').toUpperCase()
  if (!provider) throw new Error('No market data provider configured')

  // For Finnhub, use ETF proxies since they don't support index symbols well
  const actualSymbol = provider === 'FINNHUB' ? ETF_PROXY_MAP[symbol] : symbol

  // provider placeholders - skeletons only
  if (provider === 'FINNHUB') {
    const key = process.env.FINNHUB_API_KEY
    if (!key) throw new Error('FINNHUB_API_KEY missing')
    // Finnhub expects UNIX timestamps in seconds
    const to = Math.floor(Date.now() / 1000)
    const from = Math.floor((Date.now() - rangeToMs(range)) / 1000)
    // resolution mapping
    const resolution = (() => {
      switch (range) {
        case '1D':
          return '5'
        case '1W':
          return '30'
        default:
          return 'D'
      }
    })()
    const url = 'https://finnhub.io/api/v1/stock/candle'
    const params = { symbol: actualSymbol, resolution, from, to, token: key }
    const res = await requestWithRetry(url, params)
    const d = res.data
    if (!d || !d.c || d.s === 'no_data') throw new Error('Invalid provider response or no data')
    // map to IndexQuote
    const history: IndexPoint[] = d.t.map((ts: number, i: number) => ({ t: ts * 1000, c: Number(d.c[i].toFixed(2)) }))
    const price = history[history.length - 1].c
    const first = history[0].c
    const change = Number((price - first).toFixed(2))
    const changePercent = Number(((change / first) * 100).toFixed(2))
    return {
      symbol,
      name: SYMBOL_NAMES[symbol],
      price,
      change,
      changePercent,
      lastUpdated: history[history.length - 1].t,
      history,
    }
  }

  if (provider === 'POLYGON') {
    const key = process.env.POLYGON_API_KEY
    if (!key) throw new Error('POLYGON_API_KEY missing')
    // Polygon examples omitted - placeholder
    throw new Error('POLYGON provider integration not implemented in this skeleton')
  }

  throw new Error('Unsupported MARKET_DATA_PROVIDER: ' + provider)
}

export async function getIndexQuote(symbol: IndexSymbol, range: RangeKey): Promise<IndexQuote> {
  const mock = process.env.MARKET_DATA_MOCK === '1'
  if (mock) {
    const history = generateDeterministicHistory(symbol, range)
    const price = history[history.length - 1].c
    const first = history[0].c
    const change = Number((price - first).toFixed(2))
    const changePercent = Number(((change / first) * 100).toFixed(2))
    return {
      symbol,
      name: SYMBOL_NAMES[symbol],
      price,
      change,
      changePercent,
      lastUpdated: Date.now(),
      history,
    }
  }

  try {
    // try provider
    const quote = await fetchFromProvider(symbol, range)
    return quote
  } catch (err) {
    // fallback to mock when provider fails
    const history = generateDeterministicHistory(symbol, range)
    const price = history[history.length - 1].c
    const first = history[0].c
    const change = Number((price - first).toFixed(2))
    const changePercent = Number(((change / first) * 100).toFixed(2))
    return {
      symbol,
      name: SYMBOL_NAMES[symbol],
      price,
      change,
      changePercent,
      lastUpdated: Date.now(),
      history,
    }
  }
}

export async function getMultipleIndexQuotes(symbols: IndexSymbol[], range: RangeKey): Promise<IndexQuote[]> {
  const promises = symbols.map((s) => getIndexQuote(s, range))
  return Promise.all(promises)
}

// ETF proxy mapping for when provider doesn't support index tickers
const ETF_PROXY_MAP: Record<IndexSymbol, string> = {
  '^GSPC': 'SPY',  // S&P 500 SPDR ETF
  '^IXIC': 'QQQ',  // Invesco QQQ Trust
  '^DJI': 'DIA',   // SPDR Dow Jones Industrial Average ETF
}

// Finnhub symbol mapping (Finnhub doesn't use ^ prefix)
const FINNHUB_SYMBOL_MAP: Record<IndexSymbol, string> = {
  '^GSPC': 'SPX',  // S&P 500 Index (some providers use SPX)
  '^IXIC': 'IXIC', // NASDAQ Composite (no ^ prefix)
  '^DJI': 'DJI',   // Dow Jones (no ^ prefix)
}

// In-memory cache to avoid hitting rate limits on burst calls
const tileQuoteCache = new Map<string, { data: IndexTileQuote[], timestamp: number }>()
const CACHE_TTL_MS = 1000 // 1 second cache

export async function getIndexTileQuotes(
  symbols: IndexSymbol[],
  opts?: { mode?: "INDEX" | "ETF_PROXY" }
): Promise<IndexTileQuote[]> {
  const mode = opts?.mode ?? (process.env.MARKET_INDEX_MODE === "ETF_PROXY" ? "ETF_PROXY" : "INDEX")
  const mock = process.env.MARKET_DATA_MOCK === '1'
  
  // Create cache key
  const cacheKey = `${symbols.join(',')}-${mode}-${mock}`
  const cached = tileQuoteCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  let quotes: IndexTileQuote[]

  if (mock) {
    // Generate mock data that changes slightly over time
    quotes = symbols.map(symbol => {
      const basePrice = BASE_PRICES[symbol]
      const seed = hashStringToInt(symbol + Math.floor(Date.now() / 60000)) // Change every minute
      const rng = mulberry32(seed)
      
      // Generate realistic intraday movement
      const changePercent = (rng() - 0.5) * 4 // ±2% range
      const change = basePrice * (changePercent / 100)
      const price = Number((basePrice + change).toFixed(2))
      
      return {
        symbol,
        name: SYMBOL_NAMES[symbol],
        price,
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        lastUpdated: Date.now()
      }
    })
  } else {
    // Real provider data
    const provider = process.env.MARKET_DATA_PROVIDER || 'FINNHUB'
    
    let tickersToFetch: string[]
    if (mode === "ETF_PROXY") {
      tickersToFetch = symbols.map(s => ETF_PROXY_MAP[s])
    } else if (provider === 'FINNHUB') {
      // Finnhub has different index symbols, and some indices may not be available
      // Use ETF proxies for Finnhub as they have better data coverage
      tickersToFetch = symbols.map(s => ETF_PROXY_MAP[s])
    } else {
      tickersToFetch = symbols
    }

    try {
      const quotePromises = tickersToFetch.map(async (ticker, index) => {
        try {
          const quote = await fetchQuoteFromProvider(ticker)
          const originalSymbol = symbols[index]
          
          return {
            symbol: originalSymbol,
            name: SYMBOL_NAMES[originalSymbol],
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            lastUpdated: Date.now()
          }
        } catch (error) {
          console.warn(`Failed to fetch quote for ${ticker}:`, error)
          // Fallback to mock for this symbol
          return generateMockTileQuote(symbols[index])
        }
      })
      
      quotes = await Promise.all(quotePromises)
    } catch (error) {
      console.warn('Failed to fetch provider quotes, falling back to mock:', error)
      quotes = symbols.map(generateMockTileQuote)
    }
  }

  // Cache the result
  tileQuoteCache.set(cacheKey, { data: quotes, timestamp: Date.now() })
  
  return quotes
}

// Helper function to generate mock tile quote for a single symbol
function generateMockTileQuote(symbol: IndexSymbol): IndexTileQuote {
  const basePrice = BASE_PRICES[symbol]
  const seed = hashStringToInt(symbol + Math.floor(Date.now() / 60000))
  const rng = mulberry32(seed)
  
  const changePercent = (rng() - 0.5) * 4 // ±2% range
  const change = basePrice * (changePercent / 100)
  const price = Number((basePrice + change).toFixed(2))
  
  return {
    symbol,
    name: SYMBOL_NAMES[symbol],
    price,
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    lastUpdated: Date.now()
  }
}

// Helper function to fetch a single quote from provider
async function fetchQuoteFromProvider(symbol: string): Promise<{ price: number; change: number; changePercent: number }> {
  const provider = process.env.MARKET_DATA_PROVIDER
  
  switch (provider) {
    case 'FINNHUB': {
      const apiKey = process.env.FINNHUB_API_KEY
      if (!apiKey) throw new Error('FINNHUB_API_KEY not configured')
      
      const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
      const data = response.data
      
      return {
        price: data.c || 0,
        change: data.d || 0,
        changePercent: data.dp || 0
      }
    }
    
    case 'POLYGON': {
      const apiKey = process.env.POLYGON_API_KEY
      if (!apiKey) throw new Error('POLYGON_API_KEY not configured')
      
      const response = await axios.get(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apikey=${apiKey}`)
      const data = response.data?.results?.[0]
      
      if (!data) throw new Error('No data returned from Polygon')
      
      const prevClose = data.prevDay?.c || data.value || 100
      const current = data.value || data.lastQuote?.P || prevClose
      const change = current - prevClose
      const changePercent = (change / prevClose) * 100
      
      return {
        price: current,
        change,
        changePercent
      }
    }
    
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}
