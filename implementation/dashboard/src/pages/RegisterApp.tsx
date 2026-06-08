import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, Shield, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Toast } from '@/components/ui/toast'
import api from '@/lib/api'

export default function RegisterApp() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'reveal'>('form')
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    baseUrl: '',
    healthPath: '/health',
    networkType: 'public',
    environment: 'production',
    tags: '',
    owner: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [createdAppId, setCreatedAppId] = useState<string | null>(null)

  const validateUrl = (url: string) => {
    try {
      new URL(url)
      setUrlError(null)
      return true
    } catch {
      setUrlError('Invalid URL format')
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (!validateUrl(form.baseUrl)) return

    setSubmitting(true)
    try {
      const res = await api.post('/applications', {
        name: form.name,
        baseUrl: form.baseUrl,
        healthPath: form.healthPath,
        networkType: form.networkType,
        environment: form.environment,
        tags: tagsList,
      })
      setApiKey(res.data.data.apiKey.plaintextKey)
      setCreatedAppId(res.data.data.application.id)
      setStep('reveal')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to register app'
      Toast({ title: msg, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    Toast({ title: 'Copied to clipboard', variant: 'success' })
    setTimeout(() => setCopied(false), 3000)
  }

  const handleDismiss = () => {
    setStep('form')
    navigate(createdAppId ? `/apps/${createdAppId}` : '/')
  }

  const tagsList = form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  if (step === 'reveal' && apiKey) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              API Key Generated
            </DialogTitle>
            <DialogDescription>
              This is your one-time API key. Save it securely — you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                <span className="text-base">⚠️</span>
                You will not see this key again. Store it in a secure location.
              </p>
            </div>

            <div className="relative">
              <pre className="rounded-md bg-muted p-4 text-xs font-mono break-all border">
                {apiKey}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(apiKey)}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Start Snippets</p>

              <div className="space-y-2">
                <div className="rounded-md border">
                  <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 border-b">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5" /> cURL
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => copyToClipboard(`curl -X POST ${form.baseUrl}${form.healthPath} \\\n  -H "Authorization: Bearer ${apiKey.slice(0, 8)}..." \\\n  -H "Content-Type: application/json"`)}
                    >
                      Copy
                    </Button>
                  </div>
                  <pre className="p-3 text-xs font-mono overflow-x-auto">
{`curl -X POST ${form.baseUrl}${form.healthPath} \\
  -H "Authorization: Bearer ${apiKey.slice(0, 8)}..." \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>

                <div className="rounded-md border">
                  <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 border-b">
                    <span className="text-xs font-medium">SDK Init (Node.js)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => copyToClipboard(`import { Monitor } from '@monitoring/sdk';\n\nconst monitor = new Monitor({\n  apiKey: '${apiKey.slice(0, 12)}...',\n  appId: 'your-app-id',\n});`)}
                    >
                      Copy
                    </Button>
                  </div>
                  <pre className="p-3 text-xs font-mono overflow-x-auto">
{`import { Monitor } from '@monitoring/sdk';

const monitor = new Monitor({
  apiKey: '${apiKey.slice(0, 12)}...',
  appId: 'your-app-id',
});`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={handleDismiss}>I've Saved the Key</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Register Application</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new application to start monitoring its health and performance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>Provide the basic information about your service.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Application Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. api-gateway"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="url">Base URL *</Label>
              <Input
                id="url"
                type="url"
                value={form.baseUrl}
                onChange={(e) => {
                  setForm({ ...form, baseUrl: e.target.value })
                  if (e.target.value) validateUrl(e.target.value)
                }}
                placeholder="https://api.example.com"
                required
              />
              {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="healthPath">Health Check Path</Label>
                <Input
                  id="healthPath"
                  value={form.healthPath}
                  onChange={(e) => setForm({ ...form, healthPath: e.target.value })}
                  placeholder="/health"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="network">Network Type</Label>
                <div className="flex h-9 rounded-md border border-input overflow-hidden">
                  <button
                    type="button"
                    className={`flex-1 text-sm font-medium transition-colors ${
                      form.networkType === 'public'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-accent'
                    }`}
                    onClick={() => setForm({ ...form, networkType: 'public' })}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    className={`flex-1 text-sm font-medium transition-colors ${
                      form.networkType === 'private'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-accent'
                    }`}
                    onClick={() => setForm({ ...form, networkType: 'private' })}
                  >
                    Private
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="env">Environment</Label>
                <Select
                  value={form.environment}
                  onValueChange={(v) => setForm({ ...form, environment: v })}
                >
                  <SelectTrigger id="env">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  placeholder="team or person"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="critical, api, v2"
              />
              {tagsList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tagsList.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/')}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
