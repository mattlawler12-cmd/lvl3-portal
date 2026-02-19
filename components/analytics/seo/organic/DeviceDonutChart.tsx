'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#52525b', '#71717a', '#3f3f46']

interface Props {
  mobile: number
  desktop: number
  tablet: number
}

export default function DeviceDonutChart({ mobile, desktop, tablet }: Props) {
  const data = [
    { name: 'Mobile', value: mobile },
    { name: 'Desktop', value: desktop },
    { name: 'Tablet', value: tablet },
  ].filter((d) => d.value > 0)

  if (data.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-white mb-4">Device Breakdown (Organic)</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number | undefined) => [(v ?? 0).toLocaleString(), 'Sessions']}
            contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
            itemStyle={{ color: '#a1a1aa' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
