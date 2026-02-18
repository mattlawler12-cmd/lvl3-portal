'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, PackageOpen } from 'lucide-react'
import { generateClientSummary } from '@/app/actions/summaries'

interface ClientSummaryProps {
  clientId: string
  clientName: string
  summary: string | null
  summaryUpdatedAt: string | null
  deliverableCount: number
  isAdmin: boolean
}

export default function ClientSummary({
  clientId,
  clientName,
  summary,
  summaryUpdatedAt,
  deliverableCount,
  isAdmin,
}: ClientSummaryProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await generateClientSummary(clientId)
      router.refresh()
    } finally {
      setRefreshing(false)
    }
  }

  const updatedLabel = summaryUpdatedAt
    ? new Date(summaryUpdatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{clientName}</h2>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
              <PackageOpen size={12} />
              <span>
                {deliverableCount} {deliverableCount === 1 ? 'deliverable' : 'deliverables'}
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh summary'}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-zinc-800" />

      {/* Summary */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Monthly Brief
        </p>
        {summary ? (
          <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{summary}</p>
        ) : (
          <p className="text-sm text-zinc-500 italic">
            No summary yet. Sync the project sheet to generate one.
          </p>
        )}
        {updatedLabel && (
          <p className="mt-3 text-xs text-zinc-600">Last updated {updatedLabel}</p>
        )}
      </div>
    </div>
  )
}
