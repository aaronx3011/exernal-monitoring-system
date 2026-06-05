# F10 — Notifications & Alerting Agent

**Builds:** Alert-rule engine, webhook channel, dedup/grouping, alert timeline  
**Depends on:** F3, F4, F6

## Requirements
- Alert-rule model: `application_id?` (null = global), condition type, parameters (thresholds, windows), severity, enabled
- Rule evaluator: consume state-change events from F3/F4/F6 → produce normalized Alert objects
- Alert lifecycle: `firing` → `resolved`, dedup keys (one ongoing issue = one alert)
- Grouping + throttling: collapse related alerts, rate-limit per app/severity, quiet windows
- Webhook channel: POST configured endpoint, retries with exponential backoff, dead-letter queue, delivery log
- Recovery notifications when condition clears
- Frontend: alert-rule management, alert timeline, "send test notification" button
- Maintenance/silence windows for planned work

## Deliverables
- NestJS module: `NotificationsModule`
- Alert-rule evaluator + lifecycle manager
- Webhook channel with retry/backoff/DLQ
- Frontend alert management UI
