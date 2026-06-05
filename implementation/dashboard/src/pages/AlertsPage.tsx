import { useState, useEffect } from 'react'
import { Bell, BellOff, Filter, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toast } from '@/components/ui/toast'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import api from '@/lib/api'

interface AlertEvent {
  id: string
  timestamp: string
  severity: string
  message: string
  applicationId: string
  status: string
}

interface AlertRule {
  id: string
  name: string
  applicationId: string
  condition: string
  enabled: boolean
}

const SEVERITY_COLORS: Record<string, 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [appFilter, setAppFilter] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [alertsRes, rulesRes] = await Promise.all([
        api.get('/alerts'),
        api.get('/alert-rules'),
      ])
      setAlerts((alertsRes.data.data || []).map((a: any) => ({
        id: a.id,
        timestamp: a.timestamp || a.createdAt,
        severity: a.severity || 'info',
        message: a.message || `${a.metricName} ${a.condition}`,
        applicationId: a.applicationId,
        status: a.status || 'firing',
      })))
      setRules((rulesRes.data.data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        applicationId: r.applicationId,
        condition: r.condition,
        enabled: r.enabled ?? true,
      })))
    } catch {
      console.error('Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const appNames = [...new Set(alerts.map((a) => a.applicationId))]

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (appFilter !== 'all' && a.applicationId !== appFilter) return false
    return true
  })

  const openIncidents = alerts.filter((a) => a.status === 'firing')

  const handleSendTestNotification = async () => {
    try {
      await api.post('/notifications/test')
      Toast({ title: 'Test notification sent', variant: 'success' })
    } catch {
      Toast({ title: 'Failed to send test notification', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${openIncidents.length} open incidents`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSendTestNotification}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Test Notification
          </Button>
        </div>
      </div>

      {openIncidents.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Open Incidents ({openIncidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openIncidents.map((inc) => (
              <div key={inc.id} className="flex items-center gap-3 text-sm">
                <Badge variant={SEVERITY_COLORS[inc.severity] || 'info'}>{inc.severity}</Badge>
                <span className="flex-1">{inc.message}</span>
                <span className="text-xs text-muted-foreground">{inc.applicationId}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="firing">Firing</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={appFilter} onValueChange={setAppFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Apps</SelectItem>
                {appNames.map((id) => (
                  <SelectItem key={id} value={id}>{id.slice(0, 8)}...</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No alerts found</h3>
              <p className="text-sm text-muted-foreground">
                {severityFilter !== 'all' || statusFilter !== 'all' || appFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No alerts have been triggered yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <Badge variant={SEVERITY_COLORS[alert.severity] || 'info'} className="shrink-0 mt-0.5">
                      {alert.severity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{alert.applicationId}</span>
                        <span>·</span>
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        <Badge variant={alert.status === 'firing' ? 'danger' : 'success'} className="text-[10px]">
                          {alert.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-3">
          {rules.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No alert rules configured
            </div>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant="outline">{rule.applicationId}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{rule.condition}</p>
                  </div>
                  <Badge variant={rule.enabled ? 'success' : 'outline'}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
