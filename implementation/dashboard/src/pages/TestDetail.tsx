import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toast } from '@/components/ui/toast'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import api from '@/lib/api'

interface RunEntry {
  id: string
  date: string
  trigger: string
  status: string
  summary: string
  passRate: number
  p95: number
  p99: number
  errorRate: number
  rps: number
}

export default function TestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [test, setTest] = useState<any>(null)
  const [runs, setRuns] = useState<RunEntry[]>([])

  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [testRes, runsRes] = await Promise.all([
        api.get(`/tests/${id}`),
        api.get(`/tests/${id}/runs?limit=20`),
      ])
      setTest(testRes.data.data)
      const runsList = runsRes.data.data?.runs || []
      setRuns(runsList.map((r: any) => ({
        id: r.id,
        date: r.createdAt || r.startedAt,
        trigger: r.trigger || 'manual',
        status: r.passed ? 'passed' : r.status || 'failed',
        summary: typeof r.summary === 'object' ? (r.passed ? 'All thresholds passed' : 'Some thresholds exceeded') : (r.summary || ''),
        passRate: r.passRate ?? (r.passed ? 100 : 0),
        p95: r.p95 || 0,
        p99: r.p99 || 0,
        errorRate: r.errorRate ?? (r.passed ? 0 : 100),
        rps: r.rps || 0,
      })))
    } catch {
      console.error('Failed to fetch test detail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleRunNow = async () => {
    if (!id) return
    setRunning(true)
    try {
      await api.post(`/tests/${id}/run`)
      Toast({ title: 'Test started', variant: 'success' })
      await fetchData()
    } catch {
      Toast({ title: 'Failed to run test', variant: 'destructive' })
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-semibold">Test not found</p>
        <Button className="mt-4" onClick={() => navigate('/tests')}>Back to Tests</Button>
      </div>
    )
  }

  const comparisonData = runs.slice().reverse().map((r, i) => ({
    name: `Run ${runs.length - i}`,
    p95: r.p95,
    p99: r.p99,
    errorRate: r.errorRate,
    rps: r.rps,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{test.name}</h1>
            <Badge variant="outline">{test.method || 'GET'}</Badge>
          </div>
            <p className="text-sm text-muted-foreground mt-1">
            {test.method} {test.targetPath}
            {test.scheduleCron && ` · ${test.scheduleCron}`}
          </p>
        </div>
        <Button size="sm" onClick={handleRunNow} disabled={running}>
          {running ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1.5" />
          )}
          {running ? 'Running...' : 'Run Now'}
        </Button>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Run History</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3">
          {runs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No runs yet. Click "Run Now" to start.
            </div>
          ) : (
            runs.map((run) => (
              <Card key={run.id}>
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                    className="flex w-full items-center gap-4 p-4 text-left hover:bg-accent/50"
                  >
                    <Badge variant={run.status === 'passed' ? 'success' : 'danger'}>
                      {run.status === 'passed' ? 'PASS' : 'FAIL'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{new Date(run.date).toLocaleString()}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {run.trigger}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{run.summary}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>p95: {run.p95}ms</span>
                      <span>p99: {run.p99}ms</span>
                      <span>ERR: {run.errorRate}%</span>
                    </div>
                    {expandedRun === run.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedRun === run.id && (
                    <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Pass Rate</span>
                          <p className="font-medium">{run.passRate}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">p95 Latency</span>
                          <p className="font-medium">{run.p95}ms</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">p99 Latency</span>
                          <p className="font-medium">{run.p99}ms</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">RPS</span>
                          <p className="font-medium">{run.rps}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="comparison">
          {runs.length < 2 ? (
            <div className="text-center py-10 text-muted-foreground">
              Need at least 2 runs for comparison
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Latency (p95 / p99)</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="ms" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="p95" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Error Rate & RPS</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} unit="%" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="errorRate" fill="#ef4444" name="Error Rate (%)" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="rps" fill="hsl(var(--primary))" name="RPS" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
              <CardDescription>Definition and thresholds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Method</span>
                  <p className="text-sm font-medium">{test.method || 'GET'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Target</span>
                  <p className="text-sm font-medium font-mono">{test.targetPath}</p>
                </div>
                {test.vus && (
                  <div>
                    <span className="text-xs text-muted-foreground">VUs</span>
                    <p className="text-sm font-medium">{test.vus}</p>
                  </div>
                )}
                {test.durationS && (
                  <div>
                    <span className="text-xs text-muted-foreground">Duration</span>
                    <p className="text-sm font-medium">{test.durationS}s</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Schedule</span>
                  <p className="text-sm font-medium font-mono">{test.scheduleCron || 'Manual only'}</p>
                </div>
              </div>
              {test.thresholds && test.thresholds.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Thresholds</span>
                  {test.thresholds.map((t: any, i: number) => (
                    <p key={i} className="text-sm font-mono">
                      {t.metric} {t.condition} {t.value}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
