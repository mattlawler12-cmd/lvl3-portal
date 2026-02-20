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
}: KpiCardProps) {
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-[10px] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between mb-2">
        {/* Value — deep gold editorial number in display serif */}
        <p
          className="text-3xl font-bold leading-none"
          style={{ color: 'var(--color-gold-deep)', fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          {value}
        </p>
        {Icon && <Icon className="w-4 h-4 text-surface-500" />}
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-xs font-medium uppercase tracking-widest text-surface-400">{label}</p>
        {tooltip && (
          <div className="relative group">
            <button
              className="w-4 h-4 rounded-full border border-surface-700 text-surface-400 hover:text-surface-500 text-[10px] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-surface-700"
              aria-label={`More info about ${label}`}
            >
              ?
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-surface-100 border border-surface-700 rounded-lg px-3 py-2 text-xs text-surface-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-normal shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
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
