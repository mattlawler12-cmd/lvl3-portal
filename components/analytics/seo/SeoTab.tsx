import type { GA4Report } from '@/lib/google-analytics'
import type { GSCReport } from '@/lib/google-search-console'
import SectionHeader from '@/components/analytics/shared/SectionHeader'
import OrganicKpiRow from './organic/OrganicKpiRow'
import DeviceDonutChart from './organic/DeviceDonutChart'
import OrganicLandingPagesTable from './organic/OrganicLandingPagesTable'
import GscKpiRow from './searchconsole/GscKpiRow'
import GscTrendChart from './searchconsole/GscTrendChart'
import GscQueriesTable from './searchconsole/GscQueriesTable'
import GscUrlsTable from './searchconsole/GscUrlsTable'

interface Props {
  ga4: GA4Report | null
  gsc: GSCReport | null
}

export default function SeoTab({ ga4, gsc }: Props) {
  if (!ga4 && !gsc) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-surface-700 bg-surface-900/50 px-5 py-8 text-center">
          <p className="text-sm text-surface-500 italic">No SEO data available. Configure GA4 and/or GSC in client settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl space-y-10">
      {/* Organic Search (GA4) section */}
      {ga4 && (
        <div className="space-y-5">
          <SectionHeader title="Organic Search (GA4)" period="Last 28 days vs prior 28 days" />
          <OrganicKpiRow ga4={ga4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <DeviceDonutChart
              mobile={ga4.deviceBreakdown.mobile}
              desktop={ga4.deviceBreakdown.desktop}
              tablet={ga4.deviceBreakdown.tablet}
            />
            <OrganicLandingPagesTable rows={ga4.organicLandingPages} />
          </div>
        </div>
      )}

      {/* Search Console section */}
      {gsc && (
        <div className="space-y-5">
          <SectionHeader title="Search Console" period="Last 28 days vs prior 28 days" />
          <GscKpiRow gsc={gsc} />
          {gsc.monthlyTrend.length > 0 && <GscTrendChart data={gsc.monthlyTrend} />}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GscQueriesTable rows={gsc.topQueries} />
            <GscUrlsTable rows={gsc.topUrls} />
          </div>
        </div>
      )}
    </div>
  )
}
