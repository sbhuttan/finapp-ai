import { formatDateLabel } from './format'

export interface EarningsEvent {
  symbol: string
  companyName: string
  date: string // ISO date or datetime
  timeOfDay?: 'BMO' | 'AMC' | 'TAS' | 'Unspecified'
  epsEstimate?: number | null
  epsActual?: number | null
  surprisePercent?: number | null
  revenueEstimate?: number | null
  revenueActual?: number | null
  fiscalPeriod?: string | null
}

export interface EarningsQuery {
  start: string
  end: string
  q?: string
  page?: number
  perPage?: number
}

export interface EarningsResult {
  total: number
  page: number
  perPage: number
  items: EarningsEvent[]
  generatedAt: number
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function parseISODate(s: string) {
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  // return yyyy-mm-dd
  return d.toISOString().slice(0, 10)
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

const SAMPLE_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.' },
  { symbol: 'BA', name: 'Boeing Co.' },
  { symbol: 'PFE', name: 'Pfizer Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'C', name: 'Citigroup Inc.' },
]

function daysBetween(a: string, b: string) {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  const diff = Math.round((db.getTime() - da.getTime()) / (24 * 60 * 60 * 1000))
  return diff
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function computeSurprise(epsActual?: number | null, epsEstimate?: number | null) {
  if (epsActual == null || epsEstimate == null) return null
  if (epsEstimate === 0) return null
  return Number((((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 100).toFixed(2))
}

export async function getEarnings(q: EarningsQuery): Promise<EarningsResult> {
  const page = q.page && q.page > 0 ? Math.floor(q.page) : 1
  const perPage = clamp(q.perPage ? Math.floor(q.perPage) : 25, 1, 50)
  const startIso = parseISODate(q.start)
  const endIso = parseISODate(q.end)
  if (!startIso || !endIso) throw new Error('Invalid start or end date')
  if (new Date(startIso) > new Date(endIso)) throw new Error('start must be <= end')

  const mock = process.env.EARNINGS_DATA_MOCK === '1'

  if (!mock) {
    // In a real implementation call provider and map results.
    // Placeholder: return empty result with metadata.
    return {
      total: 0,
      page,
      perPage,
      items: [],
      generatedAt: Date.now(),
    }
  }

  // MOCK mode deterministic generator
  const dayCount = daysBetween(startIso, endIso) + 1
  const seed = hashStringToInt(`${startIso}|${endIso}|${q.q || ''}`)
  const rnd = mulberry32(seed)

  const events: EarningsEvent[] = []

  for (let d = 0; d < dayCount; d++) {
    const date = addDaysIso(startIso, d)
    // generate 1-4 events per day
    const perDay = 1 + Math.floor(rnd() * 4)
    for (let i = 0; i < perDay; i++) {
      const idx = Math.floor(rnd() * SAMPLE_SYMBOLS.length)
      const s = SAMPLE_SYMBOLS[idx]
      const hasEps = rnd() > 0.3
      const epsEstimate = hasEps ? Number((rnd() * 3).toFixed(2)) : null
      const epsActual = hasEps && rnd() > 0.5 ? Number((epsEstimate! + (rnd() - 0.5) * 0.5).toFixed(2)) : null
      const revenueEstimate = rnd() > 0.5 ? Math.round(rnd() * 10_000_000_000) : null
      const revenueActual = revenueEstimate && rnd() > 0.5 ? Math.round(revenueEstimate * (0.95 + rnd() * 0.1)) : null
      const timeOfDay = rnd() > 0.5 ? (rnd() > 0.5 ? 'BMO' : 'AMC') : 'Unspecified'
      events.push({
        symbol: s.symbol,
        companyName: s.name,
        date,
        timeOfDay: timeOfDay as any,
        epsEstimate,
        epsActual,
        surprisePercent: computeSurprise(epsActual ?? null, epsEstimate ?? null),
        revenueEstimate: revenueEstimate ?? null,
        revenueActual: revenueActual ?? null,
        fiscalPeriod: `Q${Math.ceil((new Date(date).getMonth() + 1) / 3)} ${new Date(date).getFullYear()}`,
      })
    }
  }

  // simple search filter by symbol or company name if q provided
  const qLower = q.q ? q.q.toLowerCase() : ''
  const filtered = qLower
    ? events.filter((e) => e.symbol.toLowerCase().includes(qLower) || e.companyName.toLowerCase().includes(qLower))
    : events

  const total = filtered.length
  const startIdx = (page - 1) * perPage
  const items = filtered.slice(startIdx, startIdx + perPage)

  return {
    total,
    page,
    perPage,
    items,
    generatedAt: Date.now(),
  }
}
