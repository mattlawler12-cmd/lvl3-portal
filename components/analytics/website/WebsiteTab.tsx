import type { GA4Report } from '@/lib/google-analytics'
import SectionHeader from '@/components/analytics/shared/SectionHeader'
import WebsiteKpiRow from './WebsiteKpiRow'
import ChannelBarChart from './ChannelBarChart'
import MonthlySessionsChart from './MonthlySessionsChart'
import SourceMediumTable from './SourceMediumTable'

interface Props {
  ga4: GA4Report | null
}

export default function WebsiteTab({ ga4 }: Props) {
  if (!ga4) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-8 text-center">
          <p className="text-sm text-zinc-500 italic">No GA4 data available. Configure a GA4 Property ID in client settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl space-y-8">
      {/* KPI Row */}
      <div>
        <SectionHeader title="Website Performance" period="Last 28 days vs prior 28 days" />
        <WebsiteKpiRow ga4={ga4} />
      </div>

      {/* Channel chart + Source/Medium table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChannelBarChart channels={ga4.topChannels} />
        <SourceMediumTable rows={ga4.topSourceMediums} />
      </div>

      {/* Monthly trend */}
      {ga4.monthlyTrend.length > 0 && (
        <div>
          <SectionHeader title="Sessions Trend" period="Last 6 months" />
          <MonthlySessionsChart data={ga4.monthlyTrend} />
        </div>
      )}
    </div>
  )
}
