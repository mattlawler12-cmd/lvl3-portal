import KpiCard from '@/components/ui/KpiCard'
import type { GSCReport } from '@/lib/google-search-console'

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
  gsc: GSCReport
}

export default function GscKpiRow({ gsc }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <KpiCard
        label="Clicks"
        value={fmtNum(gsc.clicks)}
        delta={{ direction: dir(gsc.clicksDelta), percent: `${Math.abs(gsc.clicksDelta)}%` }}
        tooltip="Organic search clicks in the last 28 days vs prior 28 days (Search Console)"
      />
      <KpiCard
        label="Impressions"
        value={fmtNum(gsc.impressions)}
        delta={{ direction: dir(gsc.impressionsDelta), percent: `${Math.abs(gsc.impressionsDelta)}%` }}
        tooltip="Search impressions in the last 28 days vs prior 28 days (Search Console)"
      />
      <KpiCard
        label="Avg. Position"
        value={gsc.position.toFixed(1)}
        delta={{ direction: dir(gsc.positionDelta), percent: `${Math.abs(gsc.positionDelta)}%` }}
        tooltip="Average search ranking position in the last 28 days vs prior 28 days (Search Console)"
      />
    </div>
  )
}
