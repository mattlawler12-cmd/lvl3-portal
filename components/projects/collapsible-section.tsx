'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { SheetRow } from '@/app/actions/projects'
import TaskTable from './task-table'

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-zinc-800 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-400 whitespace-nowrap">{value}/{total} ({pct}%)</span>
    </div>
  )
}

export default function CollapsibleSection({
  label,
  rows,
  allRows,
}: {
  label: string
  rows: SheetRow[]
  allRows: SheetRow[]
}) {
  const [open, setOpen] = useState(false)
  const completed = allRows.filter((r) => r.status === 'Completed').length
  const total = allRows.length

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
          <span className="font-medium text-white">{label}</span>
          <span className="text-xs text-zinc-500">{completed}/{total} completed</span>
        </div>
        <div className="w-40">
          <ProgressBar value={completed} total={total} />
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <TaskTable rows={rows} />
        </div>
      )}
    </div>
  )
}
