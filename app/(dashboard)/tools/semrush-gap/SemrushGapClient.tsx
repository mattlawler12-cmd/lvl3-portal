'use client'

import { useState, useTransition, useMemo } from 'react'
import { Loader2, Plus, X, Search, ArrowUpDown } from 'lucide-react'
import { fetchSemrushGap, type GapKeyword } from '@/app/actions/tools'

const PAGE_SECTIONS = [
  { value: 'all', label: 'All Pages' },
  { value: 'blog', label: 'Blog / Articles' },
  { value: 'product', label: 'Product Pages' },
  { value: 'service', label: 'Service Pages' },
  { value: 'location', label: 'Location Pages' },
]

const DATABASES = [
  { value: 'us', label: 'US' },
  { value: 'uk', label: 'UK' },
  { value: 'ca', label: 'CA' },
  { value: 'au', label: 'AU' },
]

type SortKey = 'keyword' | 'volume' | 'competition' | 'clientPosition' | string
type SortDir = 'asc' | 'desc'

export default function SemrushGapClient({
  clientName,
  defaultClientDomain,
}: {
  clientName: string
  defaultClientDomain: string
}) {
  const [clientDomain, setClientDomain] = useState(defaultClientDomain)
  const [competitors, setCompetitors] = useState<string[]>([''])
  const [pageSection, setPageSection] = useState('all')
  const [database, setDatabase] = useState('us')
  const [isPending, startTransition] = useTransition()
  const [gaps, setGaps] = useState<GapKeyword[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasRun, setHasRun] = useState(false)
  const [clientKeywordCount, setClientKeywordCount] = useState(0)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('volume')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const allCompetitorDomains = useMemo(() => {
    const set = new Set<string>()
    for (const g of gaps) {
      for (const cp of g.competitorPositions) {
        set.add(cp.domain)
      }
    }
    return Array.from(set)
  }, [gaps])

  const filteredGaps = useMemo(() => {
    let result = gaps
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((g) => g.keyword.toLowerCase().includes(q))
    }
    return [...result].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'keyword') return dir * a.keyword.localeCompare(b.keyword)
      if (sortKey === 'volume') return dir * (a.volume - b.volume)
      if (sortKey === 'competition') return dir * (a.competition - b.competition)
      if (sortKey === 'clientPosition') {
        const aPos = a.clientPosition ?? 999
        const bPos = b.clientPosition ?? 999
        return dir * (aPos - bPos)
      }
      // Competitor column sort
      const getPos = (g: GapKeyword) =>
        g.competitorPositions.find((cp) => cp.domain === sortKey)?.position ?? 999
      return dir * (getPos(a) - getPos(b))
    })
  }, [gaps, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'keyword' ? 'asc' : 'desc')
    }
  }

  function handleSubmit() {
    const filtered = competitors.map((c) => c.trim()).filter(Boolean)
    if (!filtered.length) {
      setError('Add at least one competitor domain.')
      return
    }
    if (!clientDomain.trim()) {
      setError('Client domain is required.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await fetchSemrushGap({
        clientDomain: clientDomain.trim(),
        competitors: filtered,
        pageSection,
        database,
      })
      setGaps(result.gaps)
      setClientKeywordCount(result.clientKeywordCount)
      setError(result.error ?? null)
      setHasRun(true)
      setSearch('')
      setSortKey('volume')
      setSortDir('desc')
    })
  }

  const inputClass =
    'bg-surface-800 border border-surface-600 text-surface-100 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-brand-400 placeholder:text-surface-500'
  const selectClass =
    'bg-surface-800 border border-surface-600 text-surface-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400'

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5">Client Domain</label>
          <input
            type="text"
            value={clientDomain}
            onChange={(e) => setClientDomain(e.target.value)}
            placeholder="example.com"
            className={inputClass}
            style={{ maxWidth: 400 }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5">Competitor Domains</label>
          <div className="space-y-2">
            {competitors.map((comp, i) => (
              <div key={i} className="flex items-center gap-2" style={{ maxWidth: 400 }}>
                <input
                  type="text"
                  value={comp}
                  onChange={(e) => {
                    const next = [...competitors]
                    next[i] = e.target.value
                    setCompetitors(next)
                  }}
                  placeholder={`competitor${i + 1}.com`}
                  className={inputClass}
                />
                {competitors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}
                    className="text-surface-500 hover:text-surface-300 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {competitors.length < 4 && (
            <button
              type="button"
              onClick={() => setCompetitors([...competitors, ''])}
              className="mt-2 text-xs font-medium flex items-center gap-1 hover:opacity-80"
              style={{ color: 'var(--color-marigold)' }}
            >
              <Plus className="w-3 h-3" /> Add competitor
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Page Section</label>
            <select
              value={pageSection}
              onChange={(e) => setPageSection(e.target.value)}
              className={selectClass}
            >
              {PAGE_SECTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Database</label>
            <select
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className={selectClass}
            >
              {DATABASES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-surface-100 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            'Run Gap Analysis'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-surface-900 border border-surface-700 rounded-xl px-5 py-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {hasRun && !error && gaps.length === 0 && (
        <div className="bg-surface-900 border border-surface-700 rounded-xl px-5 py-4">
          <p className="text-sm text-surface-400">
            No gap keywords found. Try selecting a different page section or adding different competitors.
          </p>
        </div>
      )}

      {/* Results */}
      {hasRun && gaps.length > 0 && (
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-surface-100">
                {gaps.length} gap keyword{gaps.length !== 1 ? 's' : ''} found
                <span className="ml-2 text-xs font-normal text-surface-500">
                  ({clientKeywordCount.toLocaleString()} client keywords indexed)
                </span>
              </h2>
              {pageSection !== 'all' && (
                <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface-800 text-surface-400 border border-surface-600">
                  {PAGE_SECTIONS.find((s) => s.value === pageSection)?.label}
                </span>
              )}
            </div>
            <div className="relative" style={{ maxWidth: 260 }}>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter keywords…"
                className={`${inputClass} pl-8`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700">
                  <SortHeader label="Keyword" sortKey="keyword" current={sortKey} dir={sortDir} onSort={toggleSort} align="left" />
                  <SortHeader label="Volume" sortKey="volume" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Comp" sortKey="competition" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label={clientName || 'Client'} sortKey="clientPosition" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  {allCompetitorDomains.map((d) => (
                    <SortHeader key={d} label={d} sortKey={d} current={sortKey} dir={sortDir} onSort={toggleSort} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredGaps.map((g) => (
                  <tr key={g.keyword} className="border-b border-surface-800 hover:bg-surface-850">
                    <td className="py-2 pr-4 text-surface-200 font-medium whitespace-nowrap">{g.keyword}</td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ color: 'var(--color-marigold)' }}>
                      {g.volume.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-surface-400">
                      {g.competition.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {g.clientPosition === null ? (
                        <span className="text-amber-400">–</span>
                      ) : (
                        <span className="text-surface-500">{g.clientPosition}</span>
                      )}
                    </td>
                    {allCompetitorDomains.map((d) => {
                      const cp = g.competitorPositions.find((p) => p.domain === d)
                      return (
                        <td key={d} className="py-2 px-3 text-right tabular-nums text-surface-300">
                          {cp ? cp.position : <span className="text-surface-600">–</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredGaps.length === 0 && search && (
            <p className="text-xs text-surface-500 text-center py-4">No keywords match &ldquo;{search}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  )
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = 'right',
}: {
  label: string
  sortKey: string
  current: string
  dir: SortDir
  onSort: (key: string) => void
  align?: 'left' | 'right'
}) {
  const active = current === sortKey
  return (
    <th
      className={`py-2 ${align === 'left' ? 'pr-4 text-left' : 'px-3 text-right'} text-xs font-medium text-surface-400 cursor-pointer select-none hover:text-surface-200 whitespace-nowrap`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${active ? 'text-surface-200' : 'text-surface-600'}`} />
        {active && <span className="text-[9px]">{dir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  )
}
