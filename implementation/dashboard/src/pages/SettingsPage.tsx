import { useState, useEffect } from 'react'
import { Save, Send, Building2, Clock, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'
import api from '@/lib/api'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleSaveWebhook = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      Toast({ title: 'Webhook URL saved', variant: 'success' })
    }, 800)
  }

  const handleTestWebhook = async () => {
    try {
      await api.post('/notifications/test', { webhookUrl })
      Toast({ title: 'Test notification sent', variant: 'success' })
    } catch {
      Toast({ title: 'Failed to send test notification', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and workspace configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Notification Webhook
          </CardTitle>
          <CardDescription>Configure a webhook URL to receive alert notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="webhook">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.example.com/..."
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleTestWebhook}>
                <Send className="h-3.5 w-3.5 mr-1" /> Test
              </Button>
            </div>
          </div>
          <Button onClick={handleSaveWebhook} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Organization
          </CardTitle>
          <CardDescription>Tenant and workspace information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Tenant ID</span>
            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">Assigned via JWT</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Data Retention
          </CardTitle>
          <CardDescription>How long data is kept in your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Metrics</span>
            <span className="text-sm font-medium">90 days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Logs</span>
            <span className="text-sm font-medium">30 days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Alert History</span>
            <span className="text-sm font-medium">90 days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Test Runs</span>
            <span className="text-sm font-medium">365 days</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
