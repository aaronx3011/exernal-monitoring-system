# F6 — k6 Load-Testing Engine (scheduled + on-demand)

> **Priority:** P1 (Phase 3) · **Primary engineering:** Backend, DevOps · **Depends on:** F1, F2, F5, F7
> **Blocked-on-input:** Open Question #6 (blast radius / prod guardrails)

## Goal
Per application, define a k6-style load test — target endpoint plus parameters (virtual users, duration, ramp stages, thresholds) — and run it either **on a schedule or on demand** from the dashboard. Store every run's results (latency percentiles, RPS, error rate, pass/fail against thresholds) alongside the app's other data.

## Why it matters
You want to go beyond "is it up?" to "does it hold up under load?". Codifying tests per app and running them on a cadence turns ad-hoc load testing into continuous performance monitoring, and on-demand runs let engineers validate before/after a deploy.

## Scope
- Test definition model attached to an application (endpoint, method, headers, payload, VUs, duration, ramp stages, thresholds).
- A k6 runner: containerized k6 jobs executed by the platform, output streamed back.
- Two triggers: scheduled (cron-like per test) and on-demand (dashboard button / API).
- Routing: tests against private apps run through WireGuard (F5).
- Result storage + trend view (compare runs over time).
- Guardrails: rate caps, max VUs, maintenance windows, concurrency limits so tests can't accidentally DoS a live app.

## Data model
- `test_definitions(id, application_id, name, target_path, method, headers jsonb, body, vus, duration_s, stages jsonb, thresholds jsonb, schedule_cron, enabled, max_vus_cap, created_at)`
- `test_runs(id, test_definition_id, trigger 'scheduled|manual', status, started_at, finished_at, summary jsonb, passed bool, artifact_ref)`
- Detailed time-series (per-run latency/RPS) in the metrics store; raw k6 output/logs in Loki/object storage.

## Implementation steps

1. **[Backend]** Define the test-definition and test-run schema + migrations.
2. **[Backend]** Build the test-definition API + validation (cap VUs/duration to platform maximums; require thresholds).
3. **[Backend]** Translate a stored definition into a k6 script (template a `.js` from the definition: stages, thresholds, target, headers, body).
4. **[DevOps]** Build the k6 runner: a containerized k6 image executed as an isolated job (separate container/pool with resource limits) so a heavy test can't starve the hub.
5. **[Backend]** Implement on-demand trigger: `POST /tests/:id/run` enqueues a run; stream status/progress to the dashboard.
6. **[Backend]** Implement scheduled trigger: BullMQ repeatable jobs from `schedule_cron`; respect `enabled` and maintenance windows.
7. **[Network/Backend]** Route runs against private apps through WireGuard (F5), same transport-aware logic as F4.
8. **[Data]** Configure k6 to output metrics (Prometheus remote-write or JSON) into the metrics store; persist the run summary + raw artifact.
9. **[Backend]** Evaluate thresholds → set `passed` and emit an event to F10 on failure or regression.
10. **[Backend]** Enforce guardrails: global concurrency limit on active runs, per-app cooldown, hard VU cap, and a kill switch to abort a run.
11. **[Frontend]** Build the test UI: define/edit tests, "run now", live run status, historical results, and run-to-run comparison charts (p95/p99 latency, error rate, RPS).
12. **[QA]** Validate against a sacrificial target that the runner produces correct percentiles, respects caps, and that aborting a run actually stops load.

## Deliverables
- Per-app k6 test definitions with scheduled + on-demand execution.
- Isolated k6 runner with resource limits and guardrails.
- Stored results with trend/comparison views.

## Acceptance criteria
- A test defined in the UI runs on demand and on its schedule, producing p95/p99/error-rate/RPS results that match k6's own summary.
- A test against a private app executes through WireGuard.
- Exceeding the configured VU cap is rejected at definition time; a runaway run can be aborted via the kill switch.
- A threshold breach marks the run failed and triggers a notification.
- Two runs of the same test can be compared side by side over time.

## Risks & mitigations
- **A test DoSes a production app** → hard VU caps, per-app cooldowns, maintenance windows, explicit "this targets prod" confirmation; resolve Open Question #6 before enabling prod targets.
- **k6 resource contention with the hub** → run k6 in an isolated container pool with CPU/RAM limits, ideally schedulable to off-peak.
- **Large result artifacts** → store summaries in Postgres, bulk output in Loki/object storage with retention (F7).
