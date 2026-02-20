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
  icon?: React.ElementType;
  iconColor?: string;
}

export default function KpiCard({
  label,
  value,
  delta,
  tooltip,
  icon: Icon,
  iconColor = "text-surface-400",
}: KpiCardProps) {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-3xl font-bold text-surface-100 leading-none">{value}</p>
        {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-xs text-surface-500 uppercase tracking-wide">{label}</p>
        {tooltip && (
          <div className="relative group">
            <button
              className="w-4 h-4 rounded-full bg-surface-800 text-surface-500 hover:text-surface-300 text-[10px] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-surface-500"
              aria-label={`More info about ${label}`}
            >
              ?
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-xs text-surface-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-normal">
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
