import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId, getClientById } from '@/lib/client-resolution'
import { checkAIVisibility } from '@/app/actions/tools'
import { Eye } from 'lucide-react'

export default async function AIVisibilityPage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  if (!selectedClientId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-sm text-surface-400">Select a client from the top bar to run this tool.</p>
      </div>
    )
  }

  const client = await getClientById<{ id: string; name: string }>(
    selectedClientId,
    'id, name'
  )

  const { result, error } = await checkAIVisibility(selectedClientId)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Eye className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">AI Visibility Check</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            {client?.name} — branded vs. non-branded search share, last 90 days
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-surface-900 border border-surface-700 rounded-xl px-5 py-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : result ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Branded Click Share', value: `${result.brandedClickShare}%` },
              { label: 'Branded Impression Share', value: `${result.brandedImpressionShare}%` },
              { label: 'Total Clicks', value: result.totalClicks.toLocaleString() },
              { label: 'Total Impressions', value: result.totalImpressions.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-900 border border-surface-700 rounded-xl p-5">
                <p
                  className="text-3xl font-bold leading-none mb-2"
                  style={{ color: 'var(--color-marigold)', fontFamily: 'var(--font-playfair), Georgia, serif' }}
                >
                  {value}
                </p>
                <p className="text-xs font-medium uppercase tracking-widest text-surface-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Top Branded Queries', data: result.topBrandedQueries },
              { title: 'Top Non-Branded Queries', data: result.topNonBrandedQueries },
            ].map(({ title, data }) => (
              <div key={title} className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-surface-700">
                  <p className="text-sm font-semibold text-surface-100">{title}</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-800/50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-surface-400">Query</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-surface-400">Clicks</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-surface-400">Impressions</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-surface-400">Pos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700">
                    {data.map((q, i) => (
                      <tr key={i} className="hover:bg-surface-800/40 transition-colors">
                        <td className="px-4 py-2.5 text-surface-200 max-w-[160px] truncate">{q.query}</td>
                        <td className="px-4 py-2.5 text-right text-surface-300">{q.clicks.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-surface-400">{q.impressions.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-surface-400">#{q.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <p className="text-xs text-surface-500">
            Brand detection uses the client name, slug, and domain. Queries containing these terms
            are classified as branded. High branded share may indicate strong AI-driven brand
            awareness. Low branded share means most organic traffic is discovery-based.
          </p>
        </div>
      ) : null}
    </div>
  )
}
