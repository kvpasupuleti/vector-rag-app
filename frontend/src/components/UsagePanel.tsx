import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getUsageLogs } from '../lib/api'
import type { DailyUsage } from '../lib/api'

interface ChartEntry extends DailyUsage {
  label: string
}

export function UsagePanel() {
  const [data, setData] = useState<ChartEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUsageLogs(30)
      .then((rows) =>
        setData(
          rows.map((r) => ({
            ...r,
            label: r.date.slice(5).replace('-', '/'),
          })),
        ),
      )
      .finally(() => setLoading(false))
  }, [])

  const totalMessages = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/[0.07] bg-[#09090b]">
      <div className="border-b border-white/[0.07] px-4 py-3">
        <p className="text-sm font-medium text-white">Usage History</p>
        <p className="text-xs text-zinc-500">Messages sent — last 30 days</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-xl font-semibold text-white">{totalMessages}</p>
              <p className="text-xs text-zinc-500">total messages</p>
            </div>

            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data}
                margin={{ top: 4, right: 4, left: -24, bottom: 4 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#52525b', fontSize: 9 }}
                  interval={6}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: '#52525b', fontSize: 10 }}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e4e4e7',
                  }}
                  labelStyle={{ color: '#a1a1aa', marginBottom: 2 }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(value: number) => [value, 'messages']}
                  labelFormatter={(label: string) => `Date: ${label}`}
                />
                <Bar dataKey="count" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </aside>
  )
}
