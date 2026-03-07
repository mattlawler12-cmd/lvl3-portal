import { requireAdmin } from '@/lib/auth'
import { FileText } from 'lucide-react'
import ContentQualityClient from './ContentQualityClient'

export default async function ContentQualityPage() {
  await requireAdmin()

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Content Quality</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            Analyze word count, reading level, heading structure, image alt coverage, and internal linking.
          </p>
        </div>
      </div>

      <ContentQualityClient />
    </div>
  )
}
