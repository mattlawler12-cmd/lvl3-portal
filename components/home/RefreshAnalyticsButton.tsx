'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { generateAnalyticsInsights } from '@/app/actions/analytics'

export default function RefreshAnalyticsButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRefresh() {
    setRefreshing(true)
    setError(null)
    const result = await generateAnalyticsInsights(clientId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setRefreshing(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 rounded-lg border border-surface-600 bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-300 transition-colors hover:border-surface-500 hover:text-surface-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-400"
      >
        <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Refreshing…' : 'Refresh analytics'}
      </button>
      {error && <p className="text-xs text-red-400 max-w-xs text-right">{error}</p>}
    </div>
  )
}
