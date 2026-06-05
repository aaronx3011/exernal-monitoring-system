# F4 — Outbound Probing & Active Health Checks Agent

**Builds:** Scheduled HTTP probes, flap suppression, state transitions, uptime calculations  
**Depends on:** F1, F2, F5 (for private routing), F7

## Requirements
- Extend application model with probe config: `interval_s`, `method`, `expected_status`, `body_match`, `timeout_ms`, `follow_redirects`, `verify_tls`
- BullMQ repeatable-job scheduler per app at configured interval
- Probe executor: HTTP request, capture status/latency/error, evaluate expected status + body match
- Routing: public → direct egress, private → wg0 (via F5 transport abstraction)
- Flap suppression: N consecutive failures → down, M successes → up
- Store probe results as time-series (`probe_latency_ms`, `probe_up`)
- Emit state-transition events → F10
- Uptime % calculations (24h/7d/30d)
- "Probe now" action + live results

## Deliverables
- NestJS module: `ProbingModule` with scheduler, executor, state machine
- TimescaleDB integration for probe metrics
- Frontend: probe config editor, live results display
