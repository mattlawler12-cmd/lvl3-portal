export type DateRange = {
  startDate: string
  endDate: string
  compareStart: string
  compareEnd: string
  label: string
  compareLabel: string
  period: string
  compare: string
}

const PERIOD_DAYS: Record<string, number> = {
  '7d': 7,
  '28d': 28,
  '90d': 90,
  '180d': 180,
  '365d': 365,
}

const PERIOD_LABELS: Record<string, string> = {
  '7d': 'Last 7 days',
  '28d': 'Last 28 days',
  '90d': 'Last 3 months',
  '180d': 'Last 6 months',
  '365d': 'Last 12 months',
}

const PERIOD_SHORT: Record<string, string> = {
  '7d': '7 days',
  '28d': '28 days',
  '90d': '3 months',
  '180d': '6 months',
  '365d': '12 months',
}

export function buildDateRange(period = '28d', compare = 'prior'): DateRange {
  const days = PERIOD_DAYS[period] ?? 28
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const today = new Date()
  // endDate = yesterday
  const endDate = fmt(new Date(today.getTime() - 86400000))
  // startDate = today − days (inclusive window of `days` days ending yesterday)
  const startDate = fmt(new Date(today.getTime() - days * 86400000))

  let compareStart: string
  let compareEnd: string
  let compareLabel: string

  if (compare === 'yoy') {
    compareEnd = fmt(new Date(today.getTime() - 365 * 86400000 - 86400000))
    compareStart = fmt(new Date(today.getTime() - 365 * 86400000 - days * 86400000))
    compareLabel = `vs. prior year`
  } else {
    // prior: immediately preceding equal-length window (no gap)
    compareEnd = fmt(new Date(today.getTime() - (days + 1) * 86400000))
    compareStart = fmt(new Date(today.getTime() - (days * 2) * 86400000))
    compareLabel = `vs. prior ${PERIOD_SHORT[period] ?? `${days} days`}`
  }

  return {
    startDate,
    endDate,
    compareStart,
    compareEnd,
    label: PERIOD_LABELS[period] ?? `Last ${days} days`,
    compareLabel,
    period,
    compare,
  }
}
