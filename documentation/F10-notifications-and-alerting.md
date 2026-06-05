# F10 — Notifications & Alerting

> **Priority:** P1 (Phase 3) · **Primary engineering:** Backend · **Depends on:** F3, F4, F6
> **Blocked-on-input:** Open Question #1 (webhook contract: URL, payload shape, auth)

## Goal
Detect noteworthy conditions (app down, degraded, stale heartbeat, test threshold breach, tunnel down, throttling) and notify by sending a text message to a webhook endpoint you'll provide. Built so the endpoint and additional channels can be added without rework.

## Why it matters
Monitoring without alerting just produces dashboards nobody watches at 3 a.m. This closes the loop: the platform tells you when something needs attention.

## Scope
- An alert-rule engine evaluating conditions from probe state (F4), heartbeats/staleness (F3), and test results (F6).
- A notification dispatcher that delivers to the configured webhook as text (per your requirement), with a channel abstraction for future additions (email, Slack, etc.).
- Deduplication, grouping, severity, throttling, and resolution ("recovered") notices.
- Per-app and global rule configuration in the dashboard (F9).
- Delivery reliability: retries with backoff, dead-letter for failures, delivery audit.

## Event sources & default rules
- **Down/Up transitions** (F4 probes) → alert on down after threshold, recovery notice on up.
- **Degraded** (high latency / partial failures) → warning severity.
- **Stale heartbeat** (F3) → app stopped reporting within its window.
- **Test threshold breach / regression** (F6) → performance alert.
- **Tunnel down** (F5 peer stale handshake) → connectivity alert.
- **Persistent throttling** (F3 rate-limit) → operational alert.

## Implementation steps

1. **[Backend]** Define the alert-rule model: `application_id?` (null = global), condition type, parameters (thresholds, windows), severity, enabled.
2. **[Backend]** Build the rule evaluator: consume state-change events emitted by F3/F4/F6/F5 (via the queue) and evaluate rules; produce normalized `Alert` objects.
3. **[Backend]** Implement alert lifecycle: `firing` → `resolved`, with dedup keys so one ongoing issue is a single alert, not a storm.
4. **[Backend]** Implement grouping + throttling: collapse related alerts, rate-limit notifications per app/severity, and support quiet windows.
5. **[Backend]** Build the channel abstraction with a **webhook (text) channel** first: POST the configured endpoint with the agreed payload (Open Question #1), supporting the auth scheme it requires (bearer/HMAC).
6. **[Backend]** Implement delivery reliability: retries with exponential backoff, dead-letter queue, and a delivery log (what was sent, when, response).
7. **[Backend]** Emit a **recovery** notification when the condition clears.
8. **[Frontend]** Build alert-rule management + the alert timeline (F9 Alerts screen) and a "send test notification" button to validate the webhook.
9. **[Backend]** Add maintenance/silence windows so planned work (incl. F6 load tests against prod) doesn't page.
10. **[QA]** Validate: a single flapping app doesn't spam; a real outage notifies once and resolves once; webhook auth + retries behave under a failing endpoint.

## Deliverables
- Alert-rule engine over F3/F4/F5/F6 events.
- Webhook (text) notification channel with retries, dedup, grouping, and resolution notices.
- Dashboard rule management + alert timeline + test-notification action.

## Acceptance criteria
- An app going down generates exactly one notification to the webhook (not one per failed probe), and one recovery notification when it returns.
- The webhook payload and auth match the contract from Open Question #1, verified against the real endpoint.
- A failing webhook is retried with backoff and lands in the dead-letter queue after exhausting retries, with the failure logged.
- A k6 threshold breach produces a notification; a silence/maintenance window suppresses notifications as configured.

## Risks & mitigations
- **Alert storms** → dedup keys, grouping, per-app/severity throttling, control-endpoint suppression (tie-in with F4) for hub-wide egress failures.
- **Unknown webhook contract today** → build the channel against an interface; finalize payload/auth once Open Question #1 is answered; "send test notification" to verify.
- **Missed alerts due to delivery failure** → retries + dead-letter + delivery audit so failures are visible, not silent.
