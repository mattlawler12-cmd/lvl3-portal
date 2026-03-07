import { requireAdmin } from '@/lib/auth'
import { FileCode } from 'lucide-react'
import PageSeoClient from './PageSeoClient'

export default async function PageSeoAuditPage() {
  await requireAdmin()

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <FileCode className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Page SEO Audit</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            Crawl a page and check title, meta, headings, images, structured data, and more.
          </p>
        </div>
      </div>

      <PageSeoClient />
    </div>
  )
}
