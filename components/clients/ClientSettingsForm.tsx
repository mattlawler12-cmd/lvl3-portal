'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, Info } from 'lucide-react'
import { updateClient } from '@/app/actions/clients'
import {
  fetchLogoUrl,
  getSheetHeadersAction,
  generateAnalyticsInsights,
  detectGSCSiteUrl,
} from '@/app/actions/analytics'

interface ClientData {
  id: string
  name: string
  slug: string
  logo_url: string | null
  google_sheet_id: string | null
  looker_embed_url: string | null
  sheet_header_row: number | null
  sheet_column_map: Record<string, string> | null
  ga4_property_id: string | null
  gsc_site_url: string | null
}

interface Props {
  client: ClientData
  serviceAccountEmail: string | null
}

const COLUMN_FIELDS = [
  { key: 'month', label: 'Month' },
  { key: 'category', label: 'Category / Service' },
  { key: 'task', label: 'Task' },
  { key: 'status', label: 'Status' },
  { key: 'fee', label: 'Fee / Budget' },
  { key: 'note', label: 'Notes' },
] as const

type ColumnField = (typeof COLUMN_FIELDS)[number]['key']

export default function ClientSettingsForm({ client, serviceAccountEmail }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Basic info
  const [name, setName] = useState(client.name)
  const [slug, setSlug] = useState(client.slug)
  const [logoUrl, setLogoUrl] = useState(client.logo_url ?? '')
  const [website, setWebsite] = useState('')

  // Google Sheet
  const [sheetIdOrUrl, setSheetIdOrUrl] = useState(client.google_sheet_id ?? '')
  const [headerRow, setHeaderRow] = useState(client.sheet_header_row ?? 1)
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>(
    client.sheet_column_map ?? {}
  )

  // Looker
  const [lookerUrl, setLookerUrl] = useState(client.looker_embed_url ?? '')

  // Analytics
  const [ga4PropertyId, setGa4PropertyId] = useState(client.ga4_property_id ?? '')
  const [gscSiteUrl, setGscSiteUrl] = useState(client.gsc_site_url ?? '')

  // UI states
  const [logoFetching, setLogoFetching] = useState(false)
  const [headersLoading, setHeadersLoading] = useState(false)
  const [headersError, setHeadersError] = useState<string | null>(null)
  const [gscDetecting, setGscDetecting] = useState(false)
  const [gscSites, setGscSites] = useState<string[]>([])
  const [gscDetectError, setGscDetectError] = useState<string | null>(null)
  const [analyticsRefreshing, setAnalyticsRefreshing] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleFetchLogo() {
    if (!website) return
    setLogoFetching(true)
    try {
      const url = await fetchLogoUrl(website)
      if (url) setLogoUrl(url)
    } finally {
      setLogoFetching(false)
    }
  }

  async function handleLoadHeaders() {
    if (!sheetIdOrUrl) return
    setHeadersLoading(true)
    setHeadersError(null)
    const result = await getSheetHeadersAction(sheetIdOrUrl, headerRow)
    if (result.error) {
      setHeadersError(result.error)
    } else if (result.headers) {
      setHeaders(result.headers)
    }
    setHeadersLoading(false)
  }

  async function handleDetectGSC() {
    if (!ga4PropertyId) return
    setGscDetecting(true)
    setGscDetectError(null)
    setGscSites([])
    const result = await detectGSCSiteUrl(ga4PropertyId)
    if (result.error) {
      setGscDetectError(result.error)
    } else {
      setGscSites(result.sites)
      if (result.matched) setGscSiteUrl(result.matched)
    }
    setGscDetecting(false)
  }

  async function handleRefreshAnalytics() {
    setAnalyticsRefreshing(true)
    setAnalyticsError(null)
    const result = await generateAnalyticsInsights(client.id)
    if (result.error) {
      setAnalyticsError(result.error)
    } else {
      router.refresh()
    }
    setAnalyticsRefreshing(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set('name', name)
        fd.set('slug', slug)
        fd.set('logo_url', logoUrl)
        fd.set('google_sheet_id', sheetIdOrUrl)
        fd.set('looker_embed_url', lookerUrl)
        fd.set('sheet_header_row', String(headerRow))
        fd.set(
          'sheet_column_map',
          Object.keys(columnMap).length > 0 ? JSON.stringify(columnMap) : ''
        )
        fd.set('ga4_property_id', ga4PropertyId)
        fd.set('gsc_site_url', gscSiteUrl)
        await updateClient(client.id, fd)
        router.push(`/clients/${client.id}`)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save changes')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Basic Info ─────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Basic Info</h2>

        <div>
          <label className="block text-zinc-400 text-sm mb-1.5">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-1.5">Slug</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-1.5">Website</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="acme.com"
              className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
            />
            <button
              type="button"
              onClick={handleFetchLogo}
              disabled={!website || logoFetching}
              className="shrink-0 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-2 text-sm hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={logoFetching ? 'animate-spin' : ''} />
              Fetch Logo
            </button>
          </div>
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-1.5">Logo URL</label>
          <div className="flex gap-2 items-center">
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
            />
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo preview"
                className="w-8 h-8 rounded object-contain bg-white p-0.5 shrink-0"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Google Sheet ───────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Google Sheet</h2>

        <div>
          <label className="block text-zinc-400 text-sm mb-1.5">Sheet URL or ID</label>
          <input
            type="text"
            value={sheetIdOrUrl}
            onChange={(e) => setSheetIdOrUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/SHEET_ID/edit"
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
          />
          <p className="text-zinc-600 text-xs mt-1.5">
            Paste the full URL or just the Sheet ID — both work.
          </p>
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-1.5">Header Row</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              value={headerRow}
              onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)}
              className="w-24 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleLoadHeaders}
              disabled={!sheetIdOrUrl || headersLoading}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-2 text-sm hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={headersLoading ? 'animate-spin' : ''} />
              Load Headers
            </button>
          </div>
          {headersError && <p className="text-red-400 text-xs mt-1.5">{headersError}</p>}
        </div>

        {headers.length > 0 && (
          <div>
            <p className="text-zinc-400 text-sm mb-2">Detected columns:</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {headers.map((h) => (
                <span
                  key={h}
                  className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full"
                >
                  {h}
                </span>
              ))}
            </div>

            <p className="text-zinc-400 text-sm mb-3">Map columns to fields:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COLUMN_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-zinc-500 text-xs mb-1">{label}</label>
                  <select
                    value={columnMap[key as ColumnField] ?? ''}
                    onChange={(e) =>
                      setColumnMap((prev) => {
                        const next = { ...prev }
                        if (e.target.value) {
                          next[key as ColumnField] = e.target.value
                        } else {
                          delete next[key as ColumnField]
                        }
                        return next
                      })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— not mapped —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {headers.length === 0 && client.sheet_column_map && Object.keys(client.sheet_column_map).length > 0 && (
          <div>
            <p className="text-zinc-500 text-xs">
              Current mapping saved. Click &ldquo;Load Headers&rdquo; to edit column mapping.
            </p>
          </div>
        )}
      </div>

      {/* ── Looker Studio ──────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Looker Studio</h2>

        <div>
          <label className="block text-zinc-400 text-sm mb-1.5">Embed URL</label>
          <input
            type="url"
            value={lookerUrl}
            onChange={(e) => setLookerUrl(e.target.value)}
            placeholder="https://lookerstudio.google.com/embed/reporting/..."
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
          />
        </div>
      </div>

      {/* ── Analytics ──────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Analytics</h2>

        {serviceAccountEmail && (
          <div className="flex gap-2.5 bg-zinc-800/60 border border-zinc-700 rounded-lg p-3">
            <Info size={15} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              Add{' '}
              <code className="font-mono text-zinc-200 bg-zinc-700 px-1 py-0.5 rounded text-[11px] break-all">
                {serviceAccountEmail}
              </code>{' '}
              as a <strong className="text-zinc-300">Viewer</strong> in GA4 (Admin → Property → Property Access Management) and as a{' '}
              <strong className="text-zinc-300">User</strong> in Search Console (Settings → Users and Permissions).
            </p>
          </div>
        )}

        <div>
          <label className="block text-zinc-400 text-sm mb-1.5">GA4 Property ID</label>
          <input
            type="text"
            value={ga4PropertyId}
            onChange={(e) => setGa4PropertyId(e.target.value)}
            placeholder="123456789"
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600 font-mono"
          />
          <p className="text-zinc-600 text-xs mt-1.5">
            Found in GA4: Admin → Property → Property details
          </p>
        </div>

        <div>
          <label className="block text-zinc-400 text-sm mb-1.5">Search Console Site URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={gscSiteUrl}
              onChange={(e) => setGscSiteUrl(e.target.value)}
              placeholder="https://example.com/"
              className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
            />
            <button
              type="button"
              onClick={handleDetectGSC}
              disabled={!ga4PropertyId || gscDetecting}
              className="shrink-0 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-2 text-sm hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={gscDetecting ? 'animate-spin' : ''} />
              Detect from GA4
            </button>
          </div>
          <p className="text-zinc-600 text-xs mt-1.5">
            Must match exactly what&apos;s registered in Search Console (including trailing slash). Enter GA4 Property ID first, then click &ldquo;Detect from GA4&rdquo;.
          </p>
          {gscDetectError && (
            <p className="text-red-400 text-xs mt-1.5">{gscDetectError}</p>
          )}
          {gscSites.length > 0 && (
            <div className="mt-2">
              <p className="text-zinc-500 text-xs mb-1.5">Accessible GSC sites — click to select:</p>
              <div className="flex flex-wrap gap-1.5">
                {gscSites.map((site) => (
                  <button
                    key={site}
                    type="button"
                    onClick={() => setGscSiteUrl(site)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      gscSiteUrl === site
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    {site}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={handleRefreshAnalytics}
            disabled={analyticsRefreshing || (!ga4PropertyId && !gscSiteUrl)}
            className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-4 py-2 text-sm hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={analyticsRefreshing ? 'animate-spin' : ''} />
            {analyticsRefreshing ? 'Refreshing…' : 'Refresh Analytics Insights'}
          </button>
          {analyticsError && (
            <p className="text-red-400 text-xs mt-2 max-w-md">{analyticsError}</p>
          )}
        </div>
      </div>

      {saveError && <p className="text-red-400 text-sm">{saveError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <Link
          href={`/clients/${client.id}`}
          className="text-zinc-400 hover:text-white text-sm transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
