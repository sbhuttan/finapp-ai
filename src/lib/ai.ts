import { StockOverview, PriceRange, Quote, EarningsQuarter } from './stocks'

export interface StockContext {
  asOf: string
  symbol: string
  name: string
  quote: Quote
  keyStats: {
    marketCap?: number | null
    peRatio?: number | null
    epsTTM?: number | null
    dividendYield?: number | null
    week52High?: number | null
    week52Low?: number | null
  }
  recentPerformance: {
    range: PriceRange
    startPrice: number
    endPrice: number
    absChange: number
    pctChange: number
  }
  latestEarnings?: EarningsQuarter | null
  earningsTrend?: { period: string; epsActual?: number | null; epsEstimate?: number | null }[]
  newsBrief?: { headline: string; source: string; publishedAt: string }[]
}

export function buildStockContext(input: StockOverview, range: PriceRange): StockContext {
  const { quote, history, earnings, news } = input
  const asOf = new Date().toISOString()
  const startPrice = history && history.length > 0 ? history[0].c : quote.price
  const endPrice = history && history.length > 0 ? history[history.length - 1].c : quote.price
  const absChange = Number((endPrice - startPrice).toFixed(2))
  const pctChange = startPrice ? Number(((absChange / startPrice) * 100).toFixed(2)) : 0

  const latestEarnings = earnings && earnings.length ? earnings[earnings.length - 1] : null
  const trend = (earnings || [])
    .slice(-8)
    .map((q) => ({ period: q.fiscalPeriod, epsActual: q.epsActual ?? null, epsEstimate: q.epsEstimate ?? null }))

  const newsBrief = (news || [])
    .slice(0, 5)
    .map((n) => ({ headline: n.headline, source: n.source, publishedAt: n.publishedAt }))

  return {
    asOf,
    symbol: quote.symbol,
    name: quote.name,
    quote,
    keyStats: {
      marketCap: quote.marketCap ?? null,
      peRatio: quote.peRatio ?? null,
      epsTTM: quote.epsTTM ?? null,
      dividendYield: quote.dividendYield ?? null,
      week52High: quote.week52High ?? null,
      week52Low: quote.week52Low ?? null,
    },
    recentPerformance: {
      range,
      startPrice,
      endPrice,
      absChange,
      pctChange,
    },
    latestEarnings,
    earningsTrend: trend,
    newsBrief,
  }
}

export function buildStockQAPrompt(question: string, ctx: StockContext) {
  const system = `You are a factual, cautious financial research assistant. Base your answer ONLY on the provided context. Do NOT give financial advice. If the context is insufficient, state that briefly. Be concise.`
  const user = `CONTEXT_JSON:\n${JSON.stringify(ctx)}\n\nQUESTION:\n${question}`
  return { system, user }
}
