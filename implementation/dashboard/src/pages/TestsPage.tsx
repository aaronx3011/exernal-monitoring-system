import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, FlaskConical, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Toast } from '@/components/ui/toast'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import api from '@/lib/api'

interface TestDefinition {
  id: string
  name: string
  applicationId: string
  target: string
  method: string
  schedule: string
  lastRunStatus: string | null
  lastRunAt: string | null
}

interface AppOption {
  id: string
  name: string
}

export default function TestsPage() {
  const navigate = useNavigate()
  const [tests, setTests] = useState<TestDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [appFilter, setAppFilter] = useState('all')
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [apps, setApps] = useState<AppOption[]>([])
  const [createForm, setCreateForm] = useState({
    applicationId: '',
    name: '',
    targetPath: '',
    method: 'GET',
    vus: 10,
    duration_s: 30,
    headers: '',
    body: '',
    thresholds: '',
    schedule_cron: '',
  })
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const fetchTests = useCallback(async () => {
    try {
      const res = await api.get('/tests')
      setTests((res.data.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        applicationId: t.applicationId,
        target: `${t.method} ${t.targetPath}`,
        method: t.method || 'GET',
        schedule: t.scheduleCron || '',
        lastRunStatus: t.lastRun?.status || null,
        lastRunAt: t.lastRun?.createdAt || null,
      })))
    } catch {
      console.error('Failed to fetch tests')
    }
  }, [])

  const fetchApps = useCallback(async () => {
    try {
      const res = await api.get('/applications')
      setApps((res.data.data || []).map((a: any) => ({ id: a.id, name: a.name })))
    } catch {
      console.error('Failed to fetch apps')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTests(), fetchApps()]).finally(() => setLoading(false))
  }, [fetchTests, fetchApps])

  useEffect(() => {
    const running = tests.filter((t) => t.lastRunStatus === 'running')
    if (running.length > 0) {
      pollRef.current = setInterval(fetchTests, 5000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = undefined
      }
    }
  }, [tests, fetchTests])

  const runningCount = tests.filter((t) => t.lastRunStatus === 'running').length

  const appNames = [...new Set(tests.map((t) => t.applicationId))]

  const filteredTests = tests.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (appFilter !== 'all' && t.applicationId !== appFilter) return false
    if (t.lastRunStatus === 'running') return true
    return true
  })

  const handleRunNow = async (testId: string) => {
    setRunningTests((prev) => new Set(prev).add(testId))
    try {
      await api.post(`/tests/${testId}/run`)
      Toast({ title: 'Test started', variant: 'success' })
      fetchTests()
    } catch {
      Toast({ title: 'Failed to run test', variant: 'destructive' })
    } finally {
      setRunningTests((prev) => {
        const next = new Set(prev)
        next.delete(testId)
        return next
      })
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.applicationId || !createForm.name || !createForm.targetPath) {
      Toast({ title: 'Application, name, and target path are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, any> = {
        applicationId: createForm.applicationId,
        name: createForm.name,
        targetPath: createForm.targetPath,
        method: createForm.method,
      }
      if (createForm.vus) payload.vus = createForm.vus
      if (createForm.duration_s) payload.duration_s = createForm.duration_s
      if (createForm.headers) {
        try { payload.headers = JSON.parse(createForm.headers) } catch { Toast({ title: 'Headers must be valid JSON', variant: 'destructive' }); setSubmitting(false); return }
      }
      if (createForm.body) payload.body = createForm.body
      if (createForm.thresholds) {
        try { payload.thresholds = JSON.parse(createForm.thresholds) } catch { Toast({ title: 'Thresholds must be valid JSON', variant: 'destructive' }); setSubmitting(false); return }
      }
      if (createForm.schedule_cron) payload.schedule_cron = createForm.schedule_cron
      await api.post('/tests', payload)
      Toast({ title: 'Test created', variant: 'success' })
      setShowCreate(false)
      setCreateForm({ applicationId: '', name: '', targetPath: '', method: 'GET', vus: 10, duration_s: 30, headers: '', body: '', thresholds: '', schedule_cron: '' })
      fetchTests()
    } catch {
      Toast({ title: 'Failed to create test', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tests</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${tests.length} tests defined`}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Test
        </Button>
      </div>

      {runningCount > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="flex items-center gap-3 p-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {runningCount} test{runningCount > 1 ? 's' : ''} running
            </span>
            <span className="text-blue-500 dark:text-blue-400">— auto-refreshing every 5s</span>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={appFilter} onValueChange={setAppFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications</SelectItem>
            {appNames.map((id) => (
              <SelectItem key={id} value={id}>{id.slice(0, 8)}...</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No tests found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first test to start monitoring performance
          </p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Test
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTests.map((test) => (
            <Card
              key={test.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/tests/${test.id}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {test.lastRunStatus === 'running' ? (
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin shrink-0" />
                ) : (
                  <FlaskConical className="h-8 w-8 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{test.name}</span>
                    <Badge variant="outline">{test.method}</Badge>
                    {test.lastRunStatus === 'passed' && (
                      <Badge variant="success">Passed</Badge>
                    )}
                    {test.lastRunStatus === 'failed' && (
                      <Badge variant="danger">Failed</Badge>
                    )}
                    {test.lastRunStatus === 'running' && (
                      <Badge variant="info">Running</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{test.target}</span>
                    {test.schedule && <span>{test.schedule}</span>}
                    {test.lastRunAt && <span>Last: {new Date(test.lastRunAt).toLocaleString()}</span>}
                    {!test.lastRunAt && <span>Never run</span>}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={runningTests.has(test.id) || test.lastRunStatus === 'running'}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRunNow(test.id)
                  }}
                >
                  {runningTests.has(test.id) || test.lastRunStatus === 'running' ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 mr-1" />
                  )}
                  {runningTests.has(test.id) || test.lastRunStatus === 'running' ? 'Running...' : 'Run Now'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Test</DialogTitle>
            <DialogDescription>Define a new load test using k6</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app">Application</Label>
              <Select
                value={createForm.applicationId}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, applicationId: v }))}
              >
                <SelectTrigger id="app">
                  <SelectValue placeholder="Select application..." />
                </SelectTrigger>
                <SelectContent>
                  {apps.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Test Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Health Check Load Test"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetPath">Target Path</Label>
              <Input
                id="targetPath"
                value={createForm.targetPath}
                onChange={(e) => setCreateForm((f) => ({ ...f, targetPath: e.target.value }))}
                placeholder="/health"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <Select
                  value={createForm.method}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, method: v }))}
                >
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vus">VUs</Label>
                <Input
                  id="vus"
                  type="number"
                  min={1}
                  max={500}
                  value={createForm.vus}
                  onChange={(e) => setCreateForm((f) => ({ ...f, vus: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_s">Duration (s)</Label>
                <Input
                  id="duration_s"
                  type="number"
                  min={1}
                  max={3600}
                  value={createForm.duration_s}
                  onChange={(e) => setCreateForm((f) => ({ ...f, duration_s: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="headers">Headers (JSON, optional)</Label>
              <Input
                id="headers"
                value={createForm.headers}
                onChange={(e) => setCreateForm((f) => ({ ...f, headers: e.target.value }))}
                placeholder='{"Authorization": "Bearer token"}'
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body (optional)</Label>
              <Input
                id="body"
                value={createForm.body}
                onChange={(e) => setCreateForm((f) => ({ ...f, body: e.target.value }))}
                placeholder='{"key": "value"}'
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thresholds">Thresholds (JSON, optional)</Label>
              <Input
                id="thresholds"
                value={createForm.thresholds}
                onChange={(e) => setCreateForm((f) => ({ ...f, thresholds: e.target.value }))}
                placeholder='{"http_req_duration": ["p(95)<500", "p(99)<1000"]}'
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule_cron">Schedule (cron, optional)</Label>
              <Input
                id="schedule_cron"
                value={createForm.schedule_cron}
                onChange={(e) => setCreateForm((f) => ({ ...f, schedule_cron: e.target.value }))}
                placeholder="*/5 * * * *"
                className="font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {submitting ? 'Creating...' : 'Create Test'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
