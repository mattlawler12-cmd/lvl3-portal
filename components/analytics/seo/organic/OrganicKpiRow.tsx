import KpiCard from '@/components/ui/KpiCard'
import type { GA4Report } from '@/lib/google-analytics'

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

function dir(pct: number): 'up' | 'down' | 'flat' {
  if (pct > 0) return 'up'
  if (pct < 0) return 'down'
  return 'flat'
}

interface Props {
  ga4: GA4Report
}

export default function OrganicKpiRow({ ga4 }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <KpiCard
        label="Organic Sessions"
        value={fmtNum(ga4.organicSessions)}
        delta={{ direction: dir(ga4.organicSessionsDelta), percent: `${Math.abs(ga4.organicSessionsDelta)}%` }}
        tooltip="Organic search sessions in the last 28 days vs prior 28 days (GA4)"
      />
      <KpiCard
        label="Organic Users"
        value={fmtNum(ga4.organicUsers)}
        delta={{ direction: dir(ga4.organicUsersDelta), percent: `${Math.abs(ga4.organicUsersDelta)}%` }}
        tooltip="Organic search users in the last 28 days vs prior 28 days (GA4)"
      />
      {ga4.organicTransactions > 0 && (
        <KpiCard
          label="Organic Transactions"
          value={fmtNum(ga4.organicTransactions)}
          delta={{ direction: dir(ga4.organicTransactionsDelta), percent: `${Math.abs(ga4.organicTransactionsDelta)}%` }}
          tooltip="Organic search transactions in the last 28 days vs prior 28 days (GA4)"
        />
      )}
    </div>
  )
}
