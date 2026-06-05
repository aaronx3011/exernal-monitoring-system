import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, ArrowUpDown, RefreshCw, Globe, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import api from '@/lib/api'

type AppStatus = 'active' | 'degraded' | 'down' | 'unknown'

interface App {
  id: string
  name: string
  baseUrl: string
  environment: string
  tags: string[]
  status: AppStatus
  createdAt: string
  uptime5m: number | null
  uptime30m: number | null
  uptime24h: number | null
}

const STATUS_CONFIG: Record<AppStatus, { variant: 'success' | 'warning' | 'danger' | 'default'; label: string }> = {
  active: { variant: 'success', label: 'Up' },
  degraded: { variant: 'warning', label: 'Degraded' },
  down: { variant: 'danger', label: 'Down' },
  unknown: { variant: 'default', label: 'Unknown' },
}

export default function FleetOverview() {
  const navigate = useNavigate()
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [envFilter, setEnvFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchApps = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/applications')
      const items = res.data.data || []
      const appsWithUptime: App[] = []
      for (const app of items) {
        let uptime5m: number | null = null
        let uptime30m: number | null = null
        let uptime24h: number | null = null
        try {
          const [r5m, r30m, r24h] = await Promise.all([
            api.get(`/probing/${app.id}/uptime?period=5m`),
            api.get(`/probing/${app.id}/uptime?period=30m`),
            api.get(`/probing/${app.id}/uptime?period=24h`),
          ])
          uptime5m = r5m.data.data?.uptime ?? null
          uptime30m = r30m.data.data?.uptime ?? null
          uptime24h = r24h.data.data?.uptime ?? null
        } catch {}
        appsWithUptime.push({
          id: app.id,
          name: app.name,
          baseUrl: app.baseUrl,
          environment: app.environment || 'unknown',
          tags: app.tags || [],
          status: app.status || 'unknown',
          createdAt: app.createdAt,
          uptime5m,
          uptime30m,
          uptime24h,
        })
      }
      setApps(appsWithUptime)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApps()
  }, [])

  const filteredApps = apps.filter((app) => {
    if (search && !app.name.toLowerCase().includes(search.toLowerCase()) &&
        !app.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) return false
    if (envFilter !== 'all' && app.environment !== envFilter) return false
    if (statusFilter !== 'all' && app.status !== statusFilter) return false
    return true
  })

  const downCount = apps.filter((a) => a.status === 'down').length
  const environments = [...new Set(apps.map((a) => a.environment))]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Overview</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${apps.length} applications monitored`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchApps}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button onClick={() => navigate('/register')} size="sm">Register App</Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}

      {downCount > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {downCount} {downCount === 1 ? 'application is' : 'applications are'} currently down
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            {environments.map((env) => (
              <SelectItem key={env} value={env}>{env}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Up</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
            <SelectItem value="down">Down</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-16 mb-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No applications found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search || envFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Register your first application to get started'}
          </p>
          {!search && envFilter === 'all' && statusFilter === 'all' && (
            <Button className="mt-4" onClick={() => navigate('/register')}>Register App</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredApps.map((app) => {
            const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.unknown
            return (
              <Card
                key={app.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                onClick={() => navigate(`/apps/${app.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{app.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-0.5">
                        <Globe className="h-3 w-3" />
                        <span className="truncate">{app.environment}</span>
                      </CardDescription>
                    </div>
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-1 text-xs text-center">
                    <div>
                      <div className="font-medium">{app.uptime5m !== null ? `${app.uptime5m.toFixed(0)}%` : '-'}</div>
                      <div className="text-muted-foreground">5m</div>
                    </div>
                    <div>
                      <div className="font-medium">{app.uptime30m !== null ? `${app.uptime30m.toFixed(0)}%` : '-'}</div>
                      <div className="text-muted-foreground">30m</div>
                    </div>
                    <div>
                      <div className="font-medium">{app.uptime24h !== null ? `${app.uptime24h.toFixed(0)}%` : '-'}</div>
                      <div className="text-muted-foreground">24h</div>
                    </div>
                  </div>
                  {app.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {app.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

