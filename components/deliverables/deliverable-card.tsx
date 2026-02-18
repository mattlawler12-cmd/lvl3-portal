'use client'

import { FileText, Monitor, Table2, ExternalLink } from 'lucide-react'
import type { DeliverableWithClient } from '@/app/actions/deliverables'

const FILE_TYPE_CONFIG = {
  pdf: {
    icon: FileText,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    label: 'PDF',
  },
  slides: {
    icon: Monitor,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    label: 'Slides',
  },
  sheets: {
    icon: Table2,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    label: 'Sheets',
  },
  link: {
    icon: ExternalLink,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    label: 'Link',
  },
} as const

interface Props {
  deliverable: DeliverableWithClient
  showClientName: boolean
  isSelected: boolean
  onClick: (d: DeliverableWithClient) => void
}

export default function DeliverableCard({ deliverable, showClientName, isSelected, onClick }: Props) {
  const config = FILE_TYPE_CONFIG[deliverable.file_type]
  const Icon = config.icon
  const isNew = !deliverable.viewed_at

  const date = new Date(deliverable.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <button
      onClick={() => onClick(deliverable)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? 'border-white/30 bg-zinc-800'
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon size={18} className={config.color} />
        </div>
        {isNew && (
          <span className="text-xs font-semibold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
            New
          </span>
        )}
      </div>

      <p className="text-white font-medium text-sm leading-snug mb-1 line-clamp-2">
        {deliverable.title}
      </p>

      {showClientName && deliverable.clients && (
        <p className="text-zinc-500 text-xs mb-1">{deliverable.clients.name}</p>
      )}

      <p className="text-zinc-600 text-xs">{date}</p>
    </button>
  )
}
