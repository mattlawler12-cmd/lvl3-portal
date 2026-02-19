import MetricTable, { ColumnDef } from '@/components/analytics/shared/MetricTable'
import type { UrlRow } from '@/lib/google-search-console'

type Row = UrlRow & Record<string, unknown>

const columns: ColumnDef<Row>[] = [
  {
    key: 'page',
    label: 'Page',
    render: (v) => (
      <span className="text-zinc-300 block max-w-xs truncate" title={String(v)}>
        {String(v).slice(0, 60)}
      </span>
    ),
  },
  {
    key: 'clicks',
    label: 'Clicks',
    align: 'right',
    render: (v) => <span className="text-zinc-300">{Number(v).toLocaleString()}</span>,
  },
  {
    key: 'clicksDelta',
    label: 'Δ Clicks',
    align: 'right',
    render: (v) => {
      const n = Number(v)
      return (
        <span className={`text-xs ${n > 0 ? 'text-emerald-400' : n < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
          {n > 0 ? '+' : ''}{n.toLocaleString()}
        </span>
      )
    },
  },
  {
    key: 'impressions',
    label: 'Impressions',
    align: 'right',
    render: (v) => <span className="text-zinc-300">{Number(v).toLocaleString()}</span>,
  },
  {
    key: 'position',
    label: 'Avg Pos.',
    align: 'right',
    render: (v) => <span className="text-zinc-300">{Number(v).toFixed(1)}</span>,
  },
]

interface Props {
  rows: UrlRow[]
}

export default function GscUrlsTable({ rows }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-white mb-4">Top Pages</p>
      <MetricTable columns={columns} rows={rows as Row[]} maxRows={25} />
    </div>
  )
}
