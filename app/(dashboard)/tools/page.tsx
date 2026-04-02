import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId } from '@/lib/client-resolution'
import Link from 'next/link'
import { Wrench, TrendingUp, Eye, FileSearch, ImageIcon, GitCompare, Gauge, FileCode, BookOpen, Link2, FileText, FileSpreadsheet } from 'lucide-react'

type Category = 'client-intelligence' | 'generators' | 'research-audits'

const CATEGORIES: Array<{ key: Category; label: string; desc: string }> = [
  { key: 'client-intelligence', label: 'Client Intelligence', desc: 'Requires a selected client — pulls from GSC, Semrush, or GA4.' },
  { key: 'generators', label: 'Generators', desc: 'AI-powered content and asset creation.' },
  { key: 'research-audits', label: 'Research & Audits', desc: 'Enter a URL or keywords — no client needed.' },
]

const TOOLS: Array<{
  href: string
  icon: typeof Wrench
  label: string
  description: string
  requiresClient: boolean
  category: Category
}> = [
  // ── Client Intelligence ────────────────────────────────────────────────
  {
    href: '/tools/keyword-quick-wins',
    icon: TrendingUp,
    label: 'Keyword Quick Wins',
    description:
      'Find keywords ranking positions 4-20 with high impressions. The easiest clicks you are leaving on the table.',
    requiresClient: true,
    category: 'client-intelligence',
  },
  {
    href: '/tools/ai-visibility',
    icon: Eye,
    label: 'AI Visibility Check',
    description:
      'Measure branded vs. non-branded search share. See whether AI referral traffic is building brand recognition.',
    requiresClient: true,
    category: 'client-intelligence',
  },
  {
    href: '/tools/content-gaps',
    icon: FileSearch,
    label: 'Content Gap Finder',
    description:
      'Surface high-impression queries with low CTR or poor rankings — pages that need copy, title, or structural work.',
    requiresClient: true,
    category: 'client-intelligence',
  },
  {
    href: '/tools/semrush-gap',
    icon: GitCompare,
    label: 'Competitor Gap Analysis',
    description:
      "Find keywords competitors rank for that your client doesn't. Filter by blog, product, service, or location pages.",
    requiresClient: true,
    category: 'client-intelligence',
  },
  {
    href: '/tools/backlink-overview',
    icon: Link2,
    label: 'Backlink Overview',
    description:
      'View domain authority, organic traffic, backlink count, and referring domains via Semrush.',
    requiresClient: true,
    category: 'client-intelligence',
  },
  // ── Generators ─────────────────────────────────────────────────────────
  {
    href: '/tools/seo-content-engine',
    icon: FileText,
    label: 'SEO Content Engine',
    description:
      'Full pipeline: keyword research → content brief → draft article → DOCX export. Run multiple topics in parallel.',
    requiresClient: true,
    category: 'generators',
  },
  {
    href: '/tools/tfk-generator',
    icon: FileSpreadsheet,
    label: 'TFK Page Generator',
    description:
      'Generate ACF-ready location page copy for all True Food Kitchen stores via Google Places + Claude.',
    requiresClient: false,
    category: 'generators',
  },
  {
    href: '/tools/blog-image-generator',
    icon: ImageIcon,
    label: 'Blog Image Generator',
    description:
      'Upload a CSV or TSV of post titles and prompts. Generates 1500x1000 WebP images via OpenAI and bundles them into a ZIP.',
    requiresClient: false,
    category: 'generators',
  },
  // ── Research & Audits ──────────────────────────────────────────────────
  {
    href: '/tools/keyword-research',
    icon: BookOpen,
    label: 'Keyword Research',
    description:
      'Get search volume, CPC, competition, and 12-month trend data for up to 100 keywords via Keywords Everywhere.',
    requiresClient: false,
    category: 'research-audits',
  },
  {
    href: '/tools/core-web-vitals',
    icon: Gauge,
    label: 'Core Web Vitals',
    description:
      'Measure CrUX field data (LCP, CLS, INP) and Lighthouse performance scores for any URL.',
    requiresClient: false,
    category: 'research-audits',
  },
  {
    href: '/tools/page-seo-audit',
    icon: FileCode,
    label: 'Page SEO Audit',
    description:
      'Crawl a page and check title, meta description, headings, images, structured data, and canonical tags.',
    requiresClient: false,
    category: 'research-audits',
  },
  {
    href: '/tools/content-quality',
    icon: FileText,
    label: 'Content Quality',
    description:
      'Analyze word count, reading level, heading structure, image alt coverage, and internal linking density.',
    requiresClient: false,
    category: 'research-audits',
  },
]

export default async function ToolsPage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-8">
      <div className="flex items-center gap-3">
        <Wrench className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Tools</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            SEO analysis, content generation, and site auditing tools.
          </p>
        </div>
      </div>

      {CATEGORIES.map(({ key, label, desc }) => {
        const categoryTools = TOOLS.filter(t => t.category === key)
        const isClientSection = key === 'client-intelligence'

        return (
          <section key={key} className="space-y-4">
            <div>
              <p
                className="text-[11px] font-medium uppercase tracking-[0.14em] mb-1"
                style={{ color: 'var(--color-accent)' }}
              >
                {label}
              </p>
              <p className="text-xs text-surface-500">{desc}</p>
            </div>

            {isClientSection && !selectedClientId && (
              <div className="bg-surface-900 border border-surface-700 rounded-xl px-5 py-4">
                <p className="text-sm text-surface-400">
                  No client selected — pick one from the top bar to use these tools.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categoryTools.map(({ href, icon: Icon, label: toolLabel, description, requiresClient }) => {
                const enabled = !requiresClient || !!selectedClientId
                return (
                  <Link
                    key={href}
                    href={enabled ? href : '#'}
                    className={`bg-surface-900 border border-surface-700 rounded-xl p-6 space-y-3 transition-all duration-200 ${
                      enabled
                        ? 'hover:border-surface-600 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'var(--active-bg)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-surface-100 mb-1">{toolLabel}</p>
                      <p className="text-xs text-surface-400 leading-relaxed">{description}</p>
                    </div>
                    {enabled && (
                      <p className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                        Run →
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
