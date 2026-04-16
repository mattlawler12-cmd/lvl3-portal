export default function ToolsLoading() {
  return (
    <div className="max-w-7xl mx-auto p-6 pb-8 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-surface-800" />
        <div className="space-y-1.5">
          <div className="h-5 w-24 rounded bg-surface-800" />
          <div className="h-3.5 w-64 rounded bg-surface-800" />
        </div>
      </div>
      {/* Search bar skeleton */}
      <div className="h-9 w-full max-w-xs rounded-lg bg-surface-800" />
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface-900 border border-surface-700 rounded-xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-surface-800" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-surface-800" />
              <div className="h-3 w-full rounded bg-surface-800" />
              <div className="h-3 w-5/6 rounded bg-surface-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
