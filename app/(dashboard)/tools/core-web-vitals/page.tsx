import { requireAdmin } from '@/lib/auth'
import { Gauge } from 'lucide-react'
import CoreWebVitalsClient from './CoreWebVitalsClient'

export default async function CoreWebVitalsPage() {
  await requireAdmin()

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Gauge className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Core Web Vitals</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            Measure CrUX field data and Lighthouse performance for any URL.
          </p>
        </div>
      </div>

      <CoreWebVitalsClient />
    </div>
  )
}
