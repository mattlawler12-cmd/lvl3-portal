'use client'

import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface TopicState {
  status: 'pending' | 'running' | 'complete' | 'partial' | 'failed'
  currentStep: string
  pct: number
  logs: string[]
  wordCount?: number
}

interface PipelineProgressProps {
  topicTitles: string[]
  topicStates: Map<number, TopicState>
}

function StatusIcon({ status }: { status: TopicState['status'] }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />
    case 'complete':
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-400" />
    case 'partial':
      return <CheckCircle2 className="h-5 w-5 text-yellow-400" />
    case 'pending':
    default:
      return <Clock className="h-5 w-5 text-surface-500" />
  }
}

export default function PipelineProgress({
  topicTitles,
  topicStates,
}: PipelineProgressProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {topicTitles.map((title, index) => {
        const state = topicStates.get(index) ?? {
          status: 'pending' as const,
          currentStep: 'Waiting...',
          pct: 0,
          logs: [],
        }

        return (
          <div
            key={index}
            className="bg-surface-900 border border-surface-700 border-l-4 border-l-brand-500 rounded-xl p-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-surface-100 leading-tight line-clamp-2">
                {title}
              </h3>
              <StatusIcon status={state.status} />
            </div>

            {/* Current step */}
            <p className="text-xs text-surface-400 mb-2 truncate">
              {state.currentStep}
            </p>

            {/* Progress bar */}
            <div className="bg-surface-800 rounded-full h-2 mb-2">
              <div
                className="bg-brand-500 rounded-full h-2 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, state.pct))}%` }}
              />
            </div>

            {/* Percentage + word count */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-surface-500">
                {Math.round(state.pct)}%
              </span>
              {state.wordCount != null && state.wordCount > 0 && (
                <span className="text-xs text-surface-400">
                  {state.wordCount.toLocaleString()} words
                </span>
              )}
            </div>

            {/* Last 3 log entries */}
            {state.logs.length > 0 && (
              <div className="max-h-16 overflow-y-auto space-y-0.5">
                {state.logs.slice(-3).map((log, i) => (
                  <p
                    key={i}
                    className="text-[11px] text-surface-500 leading-tight truncate"
                  >
                    {log}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
