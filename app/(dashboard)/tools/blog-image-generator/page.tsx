import { requireAdmin } from '@/lib/auth'
import { ImageIcon } from 'lucide-react'
import BlogImageGeneratorClient from './BlogImageGeneratorClient'

export default async function BlogImageGeneratorPage() {
  await requireAdmin()

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <ImageIcon className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Blog Image Generator</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            Upload a CSV or TSV with post title and prompt columns. Images are generated at 1500×1000 and bundled into a ZIP.
          </p>
        </div>
      </div>

      <BlogImageGeneratorClient />
    </div>
  )
}
