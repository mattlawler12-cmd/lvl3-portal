'use client'

import { useState, useTransition } from 'react'
import { fetchCoreWebVitals } from '@/app/actions/tools-extended'
import type { PageSpeedResult } from '@/lib/connectors/pagespeed'

function MetricBadge({ label, value, unit, category }: { label: string; value: number; unit: string; category: string | null }) {
  const color =
    category === 'FAST' ? 'text-green-400' : category === 'AVERAGE' ? 'text-yellow-400' : category === 'SLOW' ? 'text-red-400' : 'text-surface-400'

  return (
    <div className="bg-surface-800 rounded-lg p-4 space-y-1">
      <p className="text-xs text-surface-400 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${color}`}>
        {value.toLocaleString()}
        <span className="text-xs font-normal ml-1">{unit}</span>
      </p>
      {category && <p className={`text-xs font-medium ${color}`}>{category}</p>}
    </div>
  )
}

export default function CoreWebVitalsClient() {
  const [url, setUrl] = useState('')
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile')
  const [result, setResult] = useState<PageSpeedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await fetchCoreWebVitals(url.trim(), strategy)
      if (res.error) setError(res.error)
      else if (res.data) setResult(res.data)
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[280px]">
          <label className="block text-xs text-surface-400 mb-1">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="w-full bg-surface-800 border border-surface-600 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder-surface-500"
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">Strategy</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as 'mobile' | 'desktop')}
            className="bg-surface-800 border border-surface-600 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="mobile">Mobile</option>
            <option value="desktop">Desktop</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 text-surface-100 text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      {error && (
        <div className="bg-surface-900 border border-surface-700 rounded-xl px-5 py-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-surface-100 uppercase tracking-wide">Lighthouse Score</h2>
              <span
                className="text-2xl font-bold"
                style={{ color: result.lighthouse_score >= 90 ? '#4ade80' : result.lighthouse_score >= 50 ? '#facc15' : '#f87171' }}
              >
                {result.lighthouse_score}/100
              </span>
            </div>
            <div className={`text-xs font-medium px-2 py-1 rounded-full inline-block ${result.cwv_pass ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              CWV Assessment: {result.cwv_pass ? 'PASS' : 'FAIL'}
            </div>
          </div>

          <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-surface-100 uppercase tracking-wide">Field Data (CrUX)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {result.crux.lcp && <MetricBadge label="LCP" value={result.crux.lcp.percentile} unit="ms" category={result.crux.lcp.category} />}
              {result.crux.cls && <MetricBadge label="CLS" value={result.crux.cls.percentile / 100} unit="" category={result.crux.cls.category} />}
              {result.crux.inp && <MetricBadge label="INP" value={result.crux.inp.percentile} unit="ms" category={result.crux.inp.category} />}
              {result.crux.fcp && <MetricBadge label="FCP" value={result.crux.fcp.percentile} unit="ms" category={result.crux.fcp.category} />}
              {result.crux.ttfb && <MetricBadge label="TTFB" value={result.crux.ttfb.percentile} unit="ms" category={result.crux.ttfb.category} />}
            </div>
            {!result.crux.lcp && !result.crux.cls && !result.crux.inp && (
              <p className="text-xs text-surface-400">No field data available for this URL. CrUX requires sufficient real-user traffic.</p>
            )}
          </div>

          <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-surface-100 uppercase tracking-wide">Lab Data (Lighthouse)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricBadge label="FCP" value={Math.round(result.lighthouse.fcp_ms)} unit="ms" category={null} />
              <MetricBadge label="LCP" value={Math.round(result.lighthouse.lcp_ms)} unit="ms" category={null} />
              <MetricBadge label="TBT" value={Math.round(result.lighthouse.tbt_ms)} unit="ms" category={null} />
              <MetricBadge label="CLS" value={Math.round(result.lighthouse.cls * 1000) / 1000} unit="" category={null} />
              <MetricBadge label="Speed Index" value={Math.round(result.lighthouse.si_ms)} unit="ms" category={null} />
              <MetricBadge label="TTI" value={Math.round(result.lighthouse.tti_ms)} unit="ms" category={null} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
