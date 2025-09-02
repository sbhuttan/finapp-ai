export function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v)
}

export function formatSigned(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '-' : ''
  const abs = Math.abs(v)
  return `${sign}${abs.toFixed(2)}`
}

export function formatPercent(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '-' : ''
  return `${sign}${Math.abs(v).toFixed(2)}%`
}

export function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })
  } catch (e) {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
}

export function formatNumberCompact(v: number) {
  try {
    return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 2 }).format(v)
  } catch (e) {
    return String(v)
  }
}

export function formatDateLabel(isoDate: string) {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  } catch (e) {
    return isoDate
  }
}
