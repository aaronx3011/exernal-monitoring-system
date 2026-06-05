import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface DataPoint {
  period: string
  uptime: number
}

interface UptimeChartProps {
  data: DataPoint[]
  height?: number
}

export default function UptimeChart({ data, height = 200 }: UptimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
        No uptime data
      </div>
    )
  }

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Uptime']}
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="uptime" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
