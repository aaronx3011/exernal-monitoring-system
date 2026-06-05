import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'fatal'
  message: string
  details?: Record<string, unknown>
}

const LEVEL_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  info: 'info',
  warn: 'warning',
  error: 'danger',
  fatal: 'danger',
}

interface LogExplorerProps {
  appId?: string
}

export default function LogExplorer({ appId }: LogExplorerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [liveTail, setLiveTail] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('1h')
  const containerRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ timeRange })
      if (appId) params.set('appId', appId)
      if (levelFilter !== 'all') params.set('level', levelFilter)
      if (search) params.set('search', search)
      const response = await fetch(`/api/v1/logs?${params}`)
      const data = await response.json()
      setLogs(data.logs || data || [])
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [appId, timeRange, levelFilter, search])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (liveTail) {
      pollingRef.current = setInterval(fetchLogs, 5000)
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [liveTail, fetchLogs])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [logs])

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="fatal">Fatal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15m">15 min</SelectItem>
            <SelectItem value="1h">1 hour</SelectItem>
            <SelectItem value="6h">6 hours</SelectItem>
            <SelectItem value="24h">24 hours</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={liveTail ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLiveTail(!liveTail)}
          className="gap-1.5"
        >
          {liveTail ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {liveTail ? 'Live' : 'Tail'}
        </Button>
      </div>

      <div
        ref={containerRef}
        className="rounded-md border bg-card max-h-[500px] overflow-y-auto font-mono text-xs"
      >
        {loading && filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No log entries found</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id}>
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="flex w-full items-start gap-3 px-3 py-2 hover:bg-accent/50 text-left border-b border-border/50 last:border-0"
              >
                <Badge variant={LEVEL_COLORS[log.level]} className="shrink-0 uppercase min-w-[48px] justify-center">
                  {log.level}
                </Badge>
                <span className="text-muted-foreground shrink-0 w-32">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="flex-1 truncate">{log.message}</span>
                {expanded === log.id ? (
                  <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
              {expanded === log.id && log.details && (
                <div className="px-3 py-2 bg-muted/30 border-b border-border/50">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
