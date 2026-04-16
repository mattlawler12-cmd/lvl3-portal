'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { PageHeader } from '@/components/nav/PageHeader'
import { RunStatusBadge } from '@/components/ui/StatusBadge'
import { getToolBySlug } from '@/lib/tools/registry'
import type { ToolCategory } from '@/lib/tools/types'

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  analyze:  'Analyze',
  create:   'Create',
  audit:    'Audit',
  research: 'Research',
  monitor:  'Monitor',
  operate:  'Operate',
}

const RECENT_TOOLS_KEY = 'lvl3-recent-tools'
const MAX_RECENT = 5

function pushRecentTool(slug: string): void {
  try {
    const raw = localStorage.getItem(RECENT_TOOLS_KEY)
    const existing: string[] = raw ? (JSON.parse(raw) as string[]) : []
    const deduped = [slug, ...existing.filter((s) => s !== slug)]
    localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(deduped.slice(0, MAX_RECENT)))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export default function ToolLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const slug = pathname.split('/tools/')[1]?.split('/')[0] ?? ''

  const manifest = slug ? getToolBySlug(slug) : undefined

  useEffect(() => {
    if (slug && manifest) {
      pushRecentTool(slug)
    }
  }, [slug, manifest])

  // On /tools hub or unknown slug — pass through unchanged
  if (!slug || !manifest) {
    return <>{children}</>
  }

  const categoryLabel = CATEGORY_LABELS[manifest.category] ?? manifest.category

  const breadcrumbs = [
    { label: 'Tools', href: '/tools' },
    { label: categoryLabel, href: `/tools?category=${manifest.category}` },
    { label: manifest.name },
  ]

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <PageHeader
          icon={manifest.icon}
          title={manifest.name}
          subtitle={manifest.description}
          breadcrumbs={breadcrumbs}
          badge={<RunStatusBadge variant={manifest.status} />}
        />
      </div>
      {children}
    </>
  )
}
