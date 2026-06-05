import { useState } from 'react'
import { Plus, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface Header {
  key: string
  value: string
}

interface Stage {
  duration: string
  target: number
}

interface Threshold {
  metric: string
  condition: string
  value: string
}

interface TestFormData {
  name: string
  targetPath: string
  method: string
  headers: Header[]
  body: string
  vus: number
  duration: string
  stages: Stage[]
  thresholds: Threshold[]
  schedule: string
}

interface TestFormProps {
  initialData?: Partial<TestFormData>
  onSubmit: (data: TestFormData) => void
  onCancel: () => void
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const CONDITIONS = ['<', '<=', '>', '>=', '==']
const METRICS = ['http_req_duration', 'http_req_failed', 'http_reqs', 'iteration_duration']

export default function TestForm({ initialData, onSubmit, onCancel }: TestFormProps) {
  const [form, setForm] = useState<TestFormData>({
    name: initialData?.name || '',
    targetPath: initialData?.targetPath || '',
    method: initialData?.method || 'GET',
    headers: initialData?.headers || [],
    body: initialData?.body || '',
    vus: initialData?.vus || 10,
    duration: initialData?.duration || '30s',
    stages: initialData?.stages || [],
    thresholds: initialData?.thresholds || [],
    schedule: initialData?.schedule || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.targetPath.trim()) errs.targetPath = 'Target path is required'
    if (!form.targetPath.startsWith('/')) errs.targetPath = 'Must start with /'
    if (form.vus < 1 || form.vus > 10000) errs.vus = 'VUs must be 1-10000'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  const addHeader = () => setForm({ ...form, headers: [...form.headers, { key: '', value: '' }] })
  const removeHeader = (i: number) => setForm({ ...form, headers: form.headers.filter((_, idx) => idx !== i) })
  const updateHeader = (i: number, field: keyof Header, val: string) => {
    const h = [...form.headers]
    h[i] = { ...h[i], [field]: val }
    setForm({ ...form, headers: h })
  }

  const addStage = () => setForm({ ...form, stages: [...form.stages, { duration: '30s', target: 10 }] })
  const removeStage = (i: number) => setForm({ ...form, stages: form.stages.filter((_, idx) => idx !== i) })
  const updateStage = (i: number, field: keyof Stage, val: string | number) => {
    const s = [...form.stages]
    s[i] = { ...s[i], [field]: val }
    setForm({ ...form, stages: s })
  }

  const addThreshold = () => setForm({ ...form, thresholds: [...form.thresholds, { metric: 'http_req_duration', condition: '<', value: '200' }] })
  const removeThreshold = (i: number) => setForm({ ...form, thresholds: form.thresholds.filter((_, idx) => idx !== i) })
  const updateThreshold = (i: number, field: keyof Threshold, val: string) => {
    const t = [...form.thresholds]
    t[i] = { ...t[i], [field]: val }
    setForm({ ...form, thresholds: t })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Test Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Homepage Load Test"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="target">Target Path</Label>
          <div className="flex gap-2">
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <Input
              id="target"
              value={form.targetPath}
              onChange={(e) => setForm({ ...form, targetPath: e.target.value })}
              placeholder="/api/health"
              className="flex-1"
            />
          </div>
          {errors.targetPath && <p className="text-xs text-destructive">{errors.targetPath}</p>}
        </div>

        <div className="grid gap-2">
          <Label>Headers</Label>
          <div className="space-y-2">
            {form.headers.map((h, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={h.key}
                  onChange={(e) => updateHeader(i, 'key', e.target.value)}
                  placeholder="Header name"
                  className="flex-1"
                />
                <Input
                  value={h.value}
                  onChange={(e) => updateHeader(i, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeHeader(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addHeader}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Header
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="body">Request Body (optional)</Label>
          <textarea
            id="body"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
            placeholder='{"key": "value"}'
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="vus">Virtual Users (VUs)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="vus"
                type="number"
                min={1}
                max={10000}
                value={form.vus}
                onChange={(e) => setForm({ ...form, vus: parseInt(e.target.value) || 1 })}
              />
              <input
                type="range"
                min={1}
                max={1000}
                value={form.vus}
                onChange={(e) => setForm({ ...form, vus: parseInt(e.target.value) })}
                className="w-24"
              />
            </div>
            {errors.vus && <p className="text-xs text-destructive">{errors.vus}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="30s"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Stages</Label>
          <div className="space-y-2">
            {form.stages.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={s.duration}
                  onChange={(e) => updateStage(i, 'duration', e.target.value)}
                  placeholder="Duration (e.g. 30s)"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={s.target}
                  onChange={(e) => updateStage(i, 'target', parseInt(e.target.value) || 0)}
                  placeholder="Target VUs"
                  className="flex-1"
                />
                <Badge variant="outline" className="text-xs">{s.target} VUs</Badge>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeStage(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addStage}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Stage
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Thresholds</Label>
          <div className="space-y-2">
            {form.thresholds.map((t, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  value={t.metric}
                  onChange={(e) => updateThreshold(i, 'metric', e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {METRICS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={t.condition}
                  onChange={(e) => updateThreshold(i, 'condition', e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Input
                  value={t.value}
                  onChange={(e) => updateThreshold(i, 'value', e.target.value)}
                  placeholder="Value"
                  className="w-24"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeThreshold(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addThreshold}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Threshold
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="schedule">Schedule (cron expression, optional)</Label>
          <Input
            id="schedule"
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            placeholder="e.g. */5 * * * * (every 5 minutes)"
          />
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Please fix the errors above before submitting
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Test</Button>
      </div>
    </form>
  )
}
