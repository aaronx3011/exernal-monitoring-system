# F4 — Outbound Probing & Active Health Checks

> **Priority:** P0 (Phase 1) · **Primary engineering:** Backend, DevOps · **Depends on:** F1, F2, F5 (for private apps), F7

## Goal
Actively reach out from the hub to each registered application's health-check URL on a schedule, measure availability and latency, and record the results. This is the "hub → apps" half of the bidirectional requirement. For public apps it goes over the internet; for private apps it routes through WireGuard (F5).

## Why it matters
Self-reported heartbeats (F3) can't tell you the app is unreachable — a down app sends nothing. Outbound probing is the authoritative external view of availability and is what most uptime SLAs are measured against.

## Scope
- A scheduler that probes each app at its configured interval.
- HTTP(S) probes: method, expected status, optional body/keyword match, timeout, TLS validation.
- Latency, status, and success/failure recorded as time-series.
- Routing logic: public apps → direct egress; private apps → `wg0` interface.
- Retry/flap handling and configurable failure thresholds before marking "down".
- Per-app probe configuration surfaced in the dashboard.

## Implementation steps

1. **[Backend]** Extend the application model with probe config: `interval_s`, `method`, `expected_status`, `body_match`, `timeout_ms`, `follow_redirects`, `verify_tls`.
2. **[Backend]** Implement a BullMQ repeatable-job scheduler that enqueues a probe per app at its interval; workers execute the HTTP request and record the outcome.
3. **[Backend]** Implement the probe executor: perform the request, capture status/latency/error, evaluate against expected status + body match.
4. **[Network/Backend]** Implement source routing: if `network_type = private`, bind the request through the WireGuard interface / private route (F5). Otherwise use default egress.
5. **[Backend]** Implement flap suppression: require N consecutive failures before flipping state to `down`, and M successes before `up`; store both raw results and the derived state.
6. **[Data]** Store probe results in the same time-series store as F3 metrics (`probe_latency_ms`, `probe_up`), labeled by `application_id`.
7. **[Backend]** On state transitions (up↔down↔degraded), emit an event for F10 notifications.
8. **[Frontend]** Surface probe config editing and a live "probe now" button (reuses F2 connectivity check infra).
9. **[Backend]** Expose uptime calculations (e.g. % over 24h/7d/30d) derived from probe history for the dashboard and reports.
10. **[QA]** Validate against a deliberately flapping test target to confirm threshold logic and that we don't alert on a single blip.

## Deliverables
- Scheduled, per-app outbound probing with public/private routing.
- Flap-suppressed up/down/degraded state machine.
- Uptime metrics and "probe now" action.

## Acceptance criteria
- A public app is probed at its configured interval and its latency/up series populate.
- Taking a test target offline flips it to `down` only after the configured consecutive-failure threshold.
- A private (WireGuard-only) app is probed successfully through `wg0` exactly like a public one (once F5 is live).
- Uptime % over 24h matches the recorded probe history.
- A single transient failure does **not** generate a down alert.

## Risks & mitigations
- **Probe load on many apps** → distribute jobs across the interval (jitter) instead of a synchronized stampede.
- **False positives from hub-side network issues** → distinguish "hub egress broken" from "target down" by also probing a known-good control endpoint; suppress mass-alerts when the control fails.
- **Private routing complexity** → F4 cleanly delegates routing to F5; keep the probe executor transport-agnostic.
