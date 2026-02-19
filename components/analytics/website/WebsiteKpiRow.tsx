import KpiCard from '@/components/ui/KpiCard'
import type { GA4Report } from '@/lib/google-analytics'

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

function fmtCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function dir(pct: number): 'up' | 'down' | 'flat' {
  if (pct > 0) return 'up'
  if (pct < 0) return 'down'
  return 'flat'
}

interface Props {
  ga4: GA4Report
}

export default function WebsiteKpiRow({ ga4 }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <KpiCard
        label="Sessions"
        value={fmtNum(ga4.sessions)}
        delta={{ direction: dir(ga4.sessionsDelta), percent: `${Math.abs(ga4.sessionsDelta)}%` }}
        tooltip="Total sessions in the last 28 days vs prior 28 days (GA4)"
      />
      {ga4.purchaseRevenue > 0 && (
        <KpiCard
          label="Revenue"
          value={fmtCurrency(ga4.purchaseRevenue)}
          delta={{ direction: dir(ga4.purchaseRevenueDelta), percent: `${Math.abs(ga4.purchaseRevenueDelta)}%` }}
          tooltip="Purchase revenue in the last 28 days vs prior 28 days (GA4)"
        />
      )}
      {ga4.transactions > 0 && (
        <KpiCard
          label="Transactions"
          value={fmtNum(ga4.transactions)}
          delta={{ direction: dir(ga4.transactionsDelta), percent: `${Math.abs(ga4.transactionsDelta)}%` }}
          tooltip="Transactions in the last 28 days vs prior 28 days (GA4)"
        />
      )}
    </div>
  )
}
