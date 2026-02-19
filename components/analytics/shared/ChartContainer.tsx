import { ResponsiveContainer } from 'recharts'

interface ChartContainerProps {
  title: string
  height?: number
  children: React.ReactNode
}

export default function ChartContainer({ title, height = 240, children }: ChartContainerProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-white mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
