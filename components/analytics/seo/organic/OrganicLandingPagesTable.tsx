import MetricTable, { ColumnDef } from '@/components/analytics/shared/MetricTable'
import DeltaChip from '@/components/ui/DeltaChip'
import type { LandingPageRow } from '@/lib/google-analytics'

type Row = LandingPageRow & Record<string, unknown>

const columns: ColumnDef<Row>[] = [
  {
    key: 'page',
    label: 'Landing Page',
    render: (v) => (
      <span className="text-zinc-300 block max-w-xs truncate" title={String(v)}>
        {String(v).slice(0, 60)}
      </span>
    ),
  },
  {
    key: 'sessions',
    label: 'Sessions',
    align: 'right',
    render: (v) => <span className="text-zinc-300">{Number(v).toLocaleString()}</span>,
  },
  {
    key: 'sessionsDelta',
    label: 'Δ',
    align: 'right',
    render: (v) => {
      const n = Number(v)
      return (
        <DeltaChip
          direction={n > 0 ? 'up' : n < 0 ? 'down' : 'flat'}
          percent={`${Math.abs(n)}%`}
        />
      )
    },
  },
]

interface Props {
  rows: LandingPageRow[]
}

export default function OrganicLandingPagesTable({ rows }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-white mb-4">Top Organic Landing Pages</p>
      <MetricTable columns={columns} rows={rows as Row[]} maxRows={25} />
    </div>
  )
}
