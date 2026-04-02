'use client'

import type { DraftReview } from '@/lib/seo-content-engine/types'

const GEO_COLORS: Record<string, string> = {
  strong: 'bg-emerald-500/10 text-emerald-400',
  moderate: 'bg-yellow-500/10 text-yellow-400',
  weak: 'bg-red-500/10 text-red-400',
}

const RECOMMENDATION_COLORS: Record<string, string> = {
  publish: 'bg-emerald-500/10 text-emerald-400',
  revise: 'bg-yellow-500/10 text-yellow-400',
  rewrite: 'bg-red-500/10 text-red-400',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  moderate: 'text-yellow-400',
  minor: 'text-surface-400',
}

export default function ReviewSummary({ review }: { review: DraftReview }) {
  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pass / Fail */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              review.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {review.passed ? 'PASS' : 'FAIL'}
          </span>

          {/* Word Count */}
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-800 text-surface-300 font-mono">
            {review.word_count.toLocaleString()} words
          </span>

          {/* GEO Score */}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${GEO_COLORS[review.geo_score] ?? 'bg-surface-800 text-surface-400'}`}>
            GEO: {review.geo_score}
          </span>

          {/* Recommendation */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              RECOMMENDATION_COLORS[review.recommendation] ?? 'bg-surface-800 text-surface-400'
            }`}
          >
            {review.recommendation.charAt(0).toUpperCase() + review.recommendation.slice(1)}
          </span>
        </div>
      </div>

      {/* Issues */}
      {review.issues.length > 0 && (
        <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-700">
            <h4 className="text-xs font-medium uppercase tracking-wider text-brand-500">
              Issues ({review.issues.length})
            </h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-800 text-surface-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                <th className="px-4 py-2.5 text-left font-medium">Detail</th>
                <th className="px-4 py-2.5 text-left font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {review.issues.map((issue, i) => (
                <tr key={i} className="border-b border-surface-800 hover:bg-surface-850">
                  <td className="px-4 py-2.5 text-surface-300 font-medium">{issue.type}</td>
                  <td className="px-4 py-2.5 text-surface-400">{issue.detail}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-semibold capitalize ${SEVERITY_COLORS[issue.severity] ?? 'text-surface-400'}`}>
                      {issue.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Missing Keywords */}
      {review.missing_keywords.length > 0 && (
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
          <h4 className="text-xs font-medium uppercase tracking-wider text-brand-500 mb-2">
            Missing Keywords ({review.missing_keywords.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {review.missing_keywords.map((kw, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
