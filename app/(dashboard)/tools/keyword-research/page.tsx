import { requireAdmin } from '@/lib/auth'
import { BookOpen } from 'lucide-react'
import KeywordResearchClient from './KeywordResearchClient'

export default async function KeywordResearchPage() {
  await requireAdmin()

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Keyword Research</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            Get search volume, CPC, competition, and 12-month trend for up to 100 keywords.
          </p>
        </div>
      </div>

      <KeywordResearchClient />
    </div>
  )
}
