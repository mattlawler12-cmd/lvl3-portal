'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import DeltaChip from '@/components/ui/DeltaChip'
import type { ChannelRow } from '@/lib/google-analytics'

function fmtNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

interface Props {
  channels: ChannelRow[]
}

export default function ChannelBarChart({ channels }: Props) {
  const data = channels.slice(0, 10)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-white mb-4">Sessions by Channel</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart layout="vertical" data={data} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={fmtNum}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="channel"
            width={120}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v: number | undefined) => [(v ?? 0).toLocaleString(), 'Sessions']}
            contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
            labelStyle={{ color: '#e4e4e7' }}
            itemStyle={{ color: '#a1a1aa' }}
          />
          <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#71717a' : '#3f3f46'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Compact table below */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Channel</th>
              <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Sessions</th>
              <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">vs Prior</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-1.5 text-zinc-300">{row.channel}</td>
                <td className="py-1.5 text-right text-zinc-300">{row.sessions.toLocaleString()}</td>
                <td className="py-1.5 text-right">
                  <DeltaChip
                    direction={row.sessionsDelta > 0 ? 'up' : row.sessionsDelta < 0 ? 'down' : 'flat'}
                    percent={`${Math.abs(row.sessionsDelta)}%`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
