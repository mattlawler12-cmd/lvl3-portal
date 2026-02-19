import DeltaChip from "./DeltaChip";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: {
    direction: "up" | "down" | "flat";
    percent: string;
    absolute?: string;
  };
  tooltip?: string;
}

export default function KpiCard({
  label,
  value,
  delta,
  tooltip,
}: KpiCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-3xl font-bold text-white leading-none mb-2">{value}</p>
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
        {tooltip && (
          <div className="relative group">
            <button
              className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-[10px] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
              aria-label={`More info about ${label}`}
            >
              ?
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-normal">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      {delta && (
        <DeltaChip
          direction={delta.direction}
          percent={delta.percent}
          absolute={delta.absolute}
        />
      )}
    </div>
  );
}
