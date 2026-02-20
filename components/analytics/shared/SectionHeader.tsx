interface SectionHeaderProps {
  title: string
  subtitle?: string
  period?: string
}

export default function SectionHeader({ title, subtitle, period }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-brand-400/40 shrink-0" />
        <div className="flex items-baseline gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-surface-500">{title}</p>
          {period && <span className="text-xs text-surface-500">{period}</span>}
        </div>
      </div>
      {subtitle && <p className="mt-0.5 text-sm text-surface-400">{subtitle}</p>}
    </div>
  )
}
