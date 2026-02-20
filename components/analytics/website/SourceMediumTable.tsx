import MetricTable, { ColumnDef } from '@/components/analytics/shared/MetricTable'
import type { SourceMediumRow } from '@/lib/google-analytics'

const columns: ColumnDef<SourceMediumRow & Record<string, unknown>>[] = [
  {
    key: 'sourceMedium',
    label: 'Source / Medium',
    render: (v) => <span className="text-surface-300">{String(v)}</span>,
  },
  {
    key: 'sessions',
    label: 'Sessions',
    align: 'right',
    render: (v) => <span className="text-surface-300">{Number(v).toLocaleString()}</span>,
  },
  {
    key: 'users',
    label: 'Users',
    align: 'right',
    render: (v) => <span className="text-surface-300">{Number(v).toLocaleString()}</span>,
  },
]

interface Props {
  rows: SourceMediumRow[]
}

export default function SourceMediumTable({ rows }: Props) {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-5">
      <p className="text-sm font-semibold text-surface-100 mb-4">Top Source / Medium</p>
      <MetricTable
        columns={columns}
        rows={rows as (SourceMediumRow & Record<string, unknown>)[]}
        maxRows={25}
      />
    </div>
  )
}
