'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { syncSheet, SheetRow } from '@/app/actions/projects'
import {
  applyFilters, groupByMonth, sortGroups, groupByCategory, sortRows, getMinutesSince,
} from './project-helpers'
import TaskTable from './task-table'
import HeroCard from './hero-card'
import FiltersBar from './filters-bar'
import CollapsibleSection, { ProgressBar } from './collapsible-section'

type Props = {
  rows: SheetRow[]
  fetchedAt: string
  isAdmin: boolean
  sheetId: string
  clientId: string
}

export default function ProjectsView({ rows, fetchedAt, isAdmin, sheetId, clientId }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'category' | 'all'>('month')
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: 'asc' | 'desc' } | null>(null)
  const [heroFilter, setHeroFilter] = useState<Set<string>>(new Set())

  // Derived data
  const allGroups = sortGroups(groupByMonth(rows))
  const heroGroup = allGroups[0] ?? null
  const accordionGroups = allGroups.slice(1)
  const filteredRows = applyFilters(rows, activeStatuses, activeCategory)
  const heroFilteredRows = heroGroup ? applyFilters(heroGroup.rows, activeStatuses, activeCategory) : []
  const categoryGroups = viewMode === 'category' ? groupByCategory(filteredRows) : []
  const flatRows = viewMode === 'all' ? sortRows(filteredRows, sortConfig) : []

  const totalCompleted = rows.filter((r) => r.status === 'Completed').length
  const totalRows = rows.length
  const minutesAgo = getMinutesSince(fetchedAt)

  function handleToggleStatus(status: string) {
    setActiveStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  function handleHeroFilterToggle(status: string) {
    setHeroFilter((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  function handleSort(col: string) {
    setSortConfig((prev) =>
      prev?.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    )
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await syncSheet(clientId)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-300">Overall Progress</span>
          <span className="text-sm text-zinc-400">
            {totalCompleted} of {totalRows} tasks completed
          </span>
        </div>
        <ProgressBar value={totalCompleted} total={totalRows} />
      </div>

      {/* Filters */}
      <FiltersBar
        allRows={rows}
        activeStatuses={activeStatuses}
        onToggleStatus={handleToggleStatus}
        onClearStatuses={() => setActiveStatuses(new Set())}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Hero card — shown in month & category modes */}
      {heroGroup && viewMode !== 'all' && (
        <HeroCard
          group={heroGroup}
          heroFilter={heroFilter}
          onHeroFilterToggle={handleHeroFilterToggle}
          globalFilteredRows={heroFilteredRows}
        />
      )}

      {/* By Month accordion */}
      {viewMode === 'month' && (
        <div className="space-y-3">
          {accordionGroups.map((group) => {
            const filteredGroupRows = applyFilters(group.rows, activeStatuses, activeCategory)
            return (
              <CollapsibleSection
                key={group.month}
                label={group.month}
                rows={filteredGroupRows}
                allRows={group.rows}
              />
            )
          })}
        </div>
      )}

      {/* By Category accordion */}
      {viewMode === 'category' && (
        <div className="space-y-3">
          {categoryGroups.map((g) => {
            const allCategoryRows = rows.filter(
              (r) => (r.category || '(Uncategorized)') === g.category
            )
            return (
              <CollapsibleSection
                key={g.category}
                label={g.category}
                rows={g.rows}
                allRows={allCategoryRows}
              />
            )
          })}
        </div>
      )}

      {/* All Tasks flat table */}
      {viewMode === 'all' && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden overflow-x-auto">
          <TaskTable
            rows={flatRows}
            showMonth
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
        <span>
          Last synced{' '}
          {minutesAgo === 0
            ? 'just now'
            : minutesAgo === 1
              ? '1 minute ago'
              : `${minutesAgo} minutes ago`}
        </span>
        {isAdmin && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  )
}
