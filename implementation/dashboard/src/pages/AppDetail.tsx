import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ExternalLink, Play, RefreshCw, Key, Settings as SettingsIcon,
  FlaskConical, BarChart3, FileText, Activity, Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toast } from '@/components/ui/toast'
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts'
import api from '@/lib/api'

interface AppData {
  id: string
  name: string
  baseUrl: string
  healthPath: string
  status: string
  environment: string
  tags: string[]
  networkType: string
  createdAt: string
  uptime5m: number | null
  uptime30m: number | null
  uptime24h: number | null
  apiKeys: ApiKeyEntry[]
}

interface ApiKeyEntry {
  id: string
  prefix: string
  label: string
  lastUsedAt: string | null
  createdAt: string
}

export default function AppDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [probeRunning, setProbeRunning] = useState(false)
  const [metrics, setMetrics] = useState<any[]>([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  const fetchApp = async () => {
    if (!id) return
    setLoading(true)
    try {
      const appRes = await api.get(`/applications/${id}`)
      const appData = appRes.data.data

      const [uptime5m, uptime30m, uptime24h] = await Promise.all([
        api.get(`/probing/${id}/uptime?period=5m`).then(r => r.data.data?.uptime ?? null).catch(() => null),
        api.get(`/probing/${id}/uptime?period=30m`).then(r => r.data.data?.uptime ?? null).catch(() => null),
        api.get(`/probing/${id}/uptime?period=24h`).then(r => r.data.data?.uptime ?? null).catch(() => null),
      ])

      const keys = (appData.apiKeys || []).map((k: any) => ({
        id: k.id,
        prefix: k.prefix,
        label: k.label || 'default',
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      }))

      setApp({
        id: appData.id,
        name: appData.name,
        baseUrl: appData.baseUrl,
        healthPath: appData.healthPath,
        status: appData.status || 'unknown',
        environment: appData.environment || 'unknown',
        tags: appData.tags || [],
        networkType: appData.networkType,
        createdAt: appData.createdAt,
        uptime5m,
        uptime30m,
        uptime24h,
        apiKeys: keys,
      })
    } catch (err: any) {
      console.error('Failed to fetch app', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    if (!id) return
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const from = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const res = await api.get(`/probing/${id}/metrics?from=${from}&limit=1000`)
      setMetrics(res.data.data.metrics || [])
    } catch (err: any) {
      setMetricsError(err?.response?.data?.message || 'Failed to load metrics')
    } finally {
      setMetricsLoading(false)
    }
  }

  useEffect(() => {
    fetchApp()
  }, [id])

  const handleProbeNow = async () => {
    if (!id) return
    setProbeRunning(true)
    try {
      const res = await api.post(`/probing/${id}/probe-now`)
      const result = res.data.data
      Toast({
        title: result.reachable ? 'Probe complete' : 'Probe failed',
        description: result.reachable ? `Status: ${result.statusCode} (${result.latencyMs}ms)` : result.error,
        variant: result.reachable ? 'success' : 'destructive',
      })
    } catch {
      Toast({ title: 'Probe failed', variant: 'destructive' })
    } finally {
      setProbeRunning(false)
    }
  }

  const handleRotateKey = async (keyId: string) => {
    try {
      const res = await api.post(`/keys/${keyId}/rotate`)
      Toast({ title: 'Key rotated', description: `New key: ${res.data.data.plaintext}` })
      fetchApp()
    } catch {
      Toast({ title: 'Failed to rotate key', variant: 'destructive' })
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    try {
      await api.delete(`/keys/${keyId}`)
      Toast({ title: 'Key revoked', variant: 'destructive' })
      setApp((prev) => prev ? { ...prev, apiKeys: prev.apiKeys.filter((k) => k.id !== keyId) } : null)
    } catch {
      Toast({ title: 'Failed to revoke key', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-semibold">Application not found</p>
        <Button className="mt-4" onClick={() => navigate('/')}>Back to Fleet</Button>
      </div>
    )
  }

  const statusVariant = app.status === 'active' ? 'success' : app.status === 'degraded' ? 'warning' : app.status === 'down' ? 'danger' : 'default'
  const healthUrl = `${app.baseUrl.replace(/\/$/, '')}/${app.healthPath.replace(/^\//, '')}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{app.name}</h1>
              <Badge variant={statusVariant}>{app.status.toUpperCase()}</Badge>
              <Badge variant="outline">{app.environment}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <a
                href={healthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" />
                {healthUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchApp}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={handleProbeNow} disabled={probeRunning}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {probeRunning ? 'Probing...' : 'Probe Now'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="metrics"><BarChart3 className="h-4 w-4 mr-1.5" /> Metrics</TabsTrigger>
          <TabsTrigger value="logs"><FileText className="h-4 w-4 mr-1.5" /> Logs</TabsTrigger>
          <TabsTrigger value="tests"><FlaskConical className="h-4 w-4 mr-1.5" /> Tests</TabsTrigger>
          <TabsTrigger value="keys"><Key className="h-4 w-4 mr-1.5" /> Keys</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1.5" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${app.status === 'active' ? 'bg-emerald-500' : app.status === 'degraded' ? 'bg-amber-500' : app.status === 'down' ? 'bg-red-500' : 'bg-gray-400'}`} />
                  <span className="text-2xl font-bold capitalize">{app.status}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Health Endpoint</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                  <code className="text-xs break-all">{app.healthPath}</code>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Network</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-sm capitalize">{app.networkType}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold">{app.uptime5m !== null ? `${app.uptime5m.toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">5m</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{app.uptime30m !== null ? `${app.uptime30m.toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">30m</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{app.uptime24h !== null ? `${app.uptime24h.toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">24h</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                {app.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {app.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Metrics</CardTitle>
                <CardDescription>Collected from agents and probes, stored in TimescaleDB</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={metricsLoading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${metricsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : metricsError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-destructive">{metricsError}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={fetchMetrics}>
                    Retry
                  </Button>
                </div>
              ) : metrics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3" />
                  <p>No metrics received in the last 30 minutes.</p>
                  <p className="text-sm mt-1">Push metrics via POST /api/v1/ingest/metrics with your API key.</p>
                </div>
              ) : (
                (() => {
                  const grouped: Record<string, any[]> = {}
                  for (const m of metrics) {
                    if (!grouped[m.metricName]) grouped[m.metricName] = []
                    grouped[m.metricName].push({ time: m.time, value: m.value })
                  }
                  const sorted = [...Object.entries(grouped)].sort((a, b) => a[0].localeCompare(b[0]))
                  return sorted.map(([name, points]) => {
                    const chartData = points.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
                    const unit = name === 'cpu_usage_percent' || name === 'memory_usage_percent' ? '%' : name === 'probe_latency_ms' ? 'ms' : ''
                    return (
                      <div key={name} className="mb-6">
                        <h4 className="text-sm font-medium mb-2 capitalize">{name.replace(/_/g, ' ')}{unit && <span className="text-muted-foreground"> ({unit})</span>}</h4>
                        <div style={{ height: 200 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis
                                dataKey="time"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(v: string) => new Date(v).toLocaleTimeString()}
                                className="text-muted-foreground"
                              />
                              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                              <Tooltip
                                labelFormatter={(v: string) => new Date(v).toLocaleString()}
                                formatter={(val: number) => [unit ? `${val}${unit}` : val, name.replace(/_/g, ' ')]}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="hsl(var(--primary))"
                                strokeWidth={1.5}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )
                  })
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
              <CardDescription>Application logs are stored in Loki</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Log explorer available when Loki is configured.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle>Tests</CardTitle>
              <CardDescription>Define and run k6 tests for this application</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No tests defined</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first test to start monitoring performance
              </p>
              <Button onClick={() => navigate('/tests')}>Go to Tests</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage keys for programmatic access</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {app.apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No API keys configured
                </div>
              ) : (
                <div className="space-y-3">
                  {app.apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{key.prefix}...</span>
                          <Badge variant="outline" className="text-xs">{key.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleRotateKey(key.id)}>Rotate</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleRevokeKey(key.id)}>Revoke</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Probe Configuration</CardTitle>
              <CardDescription>Configure how probes check this application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Health Check Path</span>
                  <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{app.healthPath}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Network Type</span>
                  <span className="text-sm capitalize">{app.networkType}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Alert rules for this application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                No alert rules configured. Go to Alerts to set up rules.
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => {
                if (window.confirm('Are you sure you want to delete this application?')) {
                  Toast({ title: 'Application deleted', variant: 'destructive' })
                  navigate('/')
                }
              }}>
                Delete Application
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
