import KpiCard from '@/components/ui/KpiCard'
import type { GA4Metrics, GSCMetrics } from '@/app/actions/analytics'

interface AnalyticsKpiStripProps {
  ga4: GA4Metrics | null
  gsc: GSCMetrics | null
  compact?: boolean
}

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

function deltaDir(pct: number): 'up' | 'down' | 'flat' {
  if (pct > 0) return 'up'
  if (pct < 0) return 'down'
  return 'flat'
}

export default function AnalyticsKpiStrip({
  ga4,
  gsc,
  compact = false,
}: AnalyticsKpiStripProps) {
  if (!ga4 && !gsc) return null

  if (compact) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ga4 && (
          <KpiCard
            label="Sessions"
            value={fmtNum(ga4.sessions)}
            delta={
              ga4.sessionsDelta !== 0
                ? {
                    direction: deltaDir(ga4.sessionsDelta),
                    percent: `${Math.abs(ga4.sessionsDelta)}%`,
                  }
                : undefined
            }
            tooltip="Website sessions in the last 30 days vs prior 30 days (GA4)"
          />
        )}
        {gsc && (
          <KpiCard
            label="Organic Clicks"
            value={fmtNum(gsc.clicks)}
            tooltip="Organic search clicks in the last 28 days (Search Console)"
          />
        )}
        {gsc && (
          <KpiCard
            label="Avg. Position"
            value={gsc.position.toFixed(1)}
            tooltip="Average search ranking position (Search Console)"
          />
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {ga4 && (
        <>
          <KpiCard
            label="Sessions"
            value={fmtNum(ga4.sessions)}
            delta={{
              direction: deltaDir(ga4.sessionsDelta),
              percent: `${Math.abs(ga4.sessionsDelta)}%`,
            }}
            tooltip="Website sessions in the last 30 days vs prior 30 days (GA4)"
          />
          <KpiCard
            label="Users"
            value={fmtNum(ga4.users)}
            delta={{
              direction: deltaDir(ga4.usersDelta),
              percent: `${Math.abs(ga4.usersDelta)}%`,
            }}
            tooltip="Total users in the last 30 days vs prior 30 days (GA4)"
          />
          <KpiCard
            label="Pageviews"
            value={fmtNum(ga4.pageviews)}
            delta={{
              direction: deltaDir(ga4.pageviewsDelta),
              percent: `${Math.abs(ga4.pageviewsDelta)}%`,
            }}
            tooltip="Page views in the last 30 days vs prior 30 days (GA4)"
          />
          <KpiCard
            label="Bounce Rate"
            value={`${(ga4.bounceRate * 100).toFixed(1)}%`}
            tooltip="Bounce rate over the last 30 days (GA4)"
          />
        </>
      )}
      {gsc && (
        <>
          <KpiCard
            label="Organic Clicks"
            value={fmtNum(gsc.clicks)}
            tooltip="Organic search clicks in the last 28 days (Search Console)"
          />
          <KpiCard
            label="Impressions"
            value={fmtNum(gsc.impressions)}
            tooltip="Search impressions in the last 28 days (Search Console)"
          />
          <KpiCard
            label="CTR"
            value={`${gsc.ctr.toFixed(1)}%`}
            tooltip="Click-through rate from search in the last 28 days (Search Console)"
          />
          <KpiCard
            label="Avg. Position"
            value={gsc.position.toFixed(1)}
            tooltip="Average search ranking position in the last 28 days (Search Console)"
          />
        </>
      )}
    </div>
  )
}
