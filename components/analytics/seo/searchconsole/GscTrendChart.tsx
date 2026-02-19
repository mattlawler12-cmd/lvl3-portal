'use client'

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { GSCMonthlyPoint } from '@/lib/google-search-console'

function fmtNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

interface Props {
  data: GSCMonthlyPoint[]
}

export default function GscTrendChart({ data }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-white mb-4">Clicks & Impressions Trend</p>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={fmtNum}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={fmtNum}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(v: number | undefined, name: string | undefined) => [(v ?? 0).toLocaleString(), name ?? '']}
            contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
            labelStyle={{ color: '#e4e4e7' }}
            itemStyle={{ color: '#a1a1aa' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: 12 }}>{value}</span>}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="clicks"
            stroke="#71717a"
            fill="#71717a22"
            strokeWidth={2}
            dot={{ fill: '#71717a', r: 3 }}
            name="Clicks"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="impressions"
            stroke="#52525b"
            fill="#52525b22"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={{ fill: '#52525b', r: 3 }}
            name="Impressions"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
