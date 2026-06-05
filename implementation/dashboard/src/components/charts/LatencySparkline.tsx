import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface DataPoint {
  timestamp: number
  value: number
}

interface LatencySparklineProps {
  data: DataPoint[]
  color?: string
  height?: number
}

export default function LatencySparkline({
  data,
  color = 'hsl(var(--primary))',
  height = 40,
}: LatencySparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    )
  }

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
