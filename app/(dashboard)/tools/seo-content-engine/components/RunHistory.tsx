'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { listRuns, type RunMeta } from '@/app/actions/seo-content-engine'

interface RunHistoryProps {
  clientId: string
  onLoadRun: (runId: string, status: string) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function modeLabel(mode: string): string {
  switch (mode) {
    case 'keywords_only':
      return 'Keywords Only'
    case 'brief':
      return 'Brief'
    case 'full':
      return 'Full'
    default:
      return mode
  }
}

function StatusBadge({ status }: { status: string }) {
  let bg: string
  let text: string
  let dot: string

  switch (status) {
    case 'complete':
      bg = 'bg-green-500/10'
      text = 'text-green-400'
      dot = 'bg-green-400'
      break
    case 'partial':
      bg = 'bg-yellow-500/10'
      text = 'text-yellow-400'
      dot = 'bg-yellow-400'
      break
    case 'failed':
      bg = 'bg-red-500/10'
      text = 'text-red-400'
      dot = 'bg-red-400'
      break
    case 'running':
      bg = 'bg-blue-500/10'
      text = 'text-blue-400'
      dot = 'bg-blue-400'
      break
    default:
      bg = 'bg-surface-700/50'
      text = 'text-surface-400'
      dot = 'bg-surface-400'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-t border-surface-800">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="py-3 pr-4">
          <div className="h-4 w-20 animate-pulse rounded bg-surface-800" />
        </td>
      ))}
    </tr>
  )
}

export default function RunHistory({ clientId, onLoadRun }: RunHistoryProps) {
  const [runs, setRuns] = useState<RunMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await listRuns(clientId)
    if (result.error) {
      setError(result.error)
    } else {
      setRuns(result.data ?? [])
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-100">Run History</h3>
        <button
          onClick={fetchRuns}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400">{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-surface-400 uppercase tracking-wider pb-3">Date</th>
              <th className="text-left text-xs text-surface-400 uppercase tracking-wider pb-3">Mode</th>
              <th className="text-left text-xs text-surface-400 uppercase tracking-wider pb-3">Topics</th>
              <th className="text-left text-xs text-surface-400 uppercase tracking-wider pb-3">Completed</th>
              <th className="text-left text-xs text-surface-400 uppercase tracking-wider pb-3">Status</th>
              <th className="text-left text-xs text-surface-400 uppercase tracking-wider pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-surface-500">
                  No previous runs found
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="border-t border-surface-800">
                  <td className="py-3 pr-4 text-surface-300 whitespace-nowrap">
                    {formatDate(run.created_at)}
                  </td>
                  <td className="py-3 pr-4 text-surface-300">
                    {modeLabel(run.mode)}
                  </td>
                  <td className="py-3 pr-4 text-surface-300 tabular-nums">
                    {run.topic_count}
                  </td>
                  <td className="py-3 pr-4 text-surface-300 tabular-nums">
                    {run.completed_count}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => onLoadRun(run.id, run.status)}
                      className="text-brand-400 hover:text-brand-300 text-xs font-medium transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
