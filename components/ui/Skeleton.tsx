interface SkeletonProps {
  variant: "card" | "row" | "text" | "kpi";
  count?: number;
}

function SkeletonKpi() {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 animate-pulse">
      <div className="h-8 w-20 bg-surface-800 rounded mb-2" />
      <div className="h-3 w-16 bg-surface-800 rounded mb-2" />
      <div className="h-3 w-12 bg-surface-800 rounded" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 animate-pulse">
      <div className="h-4 w-3/4 bg-surface-800 rounded mb-3" />
      <div className="h-3 w-full bg-surface-800 rounded mb-2" />
      <div className="h-3 w-5/6 bg-surface-800 rounded mb-2" />
      <div className="h-3 w-2/3 bg-surface-800 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-4 animate-pulse">
      <div className="h-4 w-8 bg-surface-800 rounded" />
      <div className="h-4 flex-1 bg-surface-800 rounded" />
      <div className="h-4 w-20 bg-surface-800 rounded" />
      <div className="h-4 w-16 bg-surface-800 rounded" />
    </div>
  );
}

function SkeletonText() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 w-full bg-surface-800 rounded" />
      <div className="h-3 w-5/6 bg-surface-800 rounded" />
      <div className="h-3 w-4/6 bg-surface-800 rounded" />
    </div>
  );
}

export default function Skeleton({ variant, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === "kpi") {
    return <>{items.map((_, i) => <SkeletonKpi key={i} />)}</>;
  }
  if (variant === "card") {
    return <>{items.map((_, i) => <SkeletonCard key={i} />)}</>;
  }
  if (variant === "row") {
    return (
      <div className="border border-surface-700 rounded-xl overflow-hidden divide-y divide-surface-700">
        {items.map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }
  return <SkeletonText />;
}
