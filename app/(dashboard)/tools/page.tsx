import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId } from '@/lib/client-resolution'
import Link from 'next/link'
import { Wrench, TrendingUp, Eye, FileSearch } from 'lucide-react'

const TOOLS = [
  {
    href: '/tools/keyword-quick-wins',
    icon: TrendingUp,
    label: 'Keyword Quick Wins',
    description:
      'Find keywords ranking positions 4-20 with high impressions. The easiest clicks you are leaving on the table.',
  },
  {
    href: '/tools/ai-visibility',
    icon: Eye,
    label: 'AI Visibility Check',
    description:
      'Measure branded vs. non-branded search share. See whether AI referral traffic is building brand recognition.',
  },
  {
    href: '/tools/content-gaps',
    icon: FileSearch,
    label: 'Content Gap Finder',
    description:
      'Surface high-impression queries with low CTR or poor rankings — pages that need copy, title, or structural work.',
  },
]

export default async function ToolsPage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Wrench className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Tools</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            Data tools for SEO analysis. Select a client in the top bar first.
          </p>
        </div>
      </div>

      {!selectedClientId && (
        <div className="bg-surface-900 border border-surface-700 rounded-xl px-5 py-4">
          <p className="text-sm text-surface-400">
            No client selected — pick one from the top bar to run these tools.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOOLS.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={selectedClientId ? href : '#'}
            className={`bg-surface-900 border border-surface-700 rounded-xl p-6 space-y-3 transition-all duration-200 ${
              selectedClientId
                ? 'hover:border-surface-600 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(254,199,124,0.1)' }}
            >
              <Icon className="w-4 h-4" style={{ color: 'var(--color-marigold)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-100 mb-1">{label}</p>
              <p className="text-xs text-surface-400 leading-relaxed">{description}</p>
            </div>
            {selectedClientId && (
              <p className="text-xs font-medium" style={{ color: 'var(--color-marigold)' }}>
                Run →
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
