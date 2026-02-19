interface SectionHeaderProps {
  title: string
  subtitle?: string
  period?: string
}

export default function SectionHeader({ title, subtitle, period }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{title}</p>
        {period && <span className="text-xs text-zinc-600">{period}</span>}
      </div>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>}
    </div>
  )
}
