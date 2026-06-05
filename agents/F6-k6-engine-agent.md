# F6 — k6 Load-Testing Engine Agent

**Builds:** Test definitions, k6 runner, scheduled + on-demand execution, result storage  
**Depends on:** F1, F2, F5, F7

## Requirements
- Test definition schema + CRUD: `test_definitions` (target_path, method, headers, body, VUs, duration, stages, thresholds, schedule_cron)
- Test run model + lifecycle: `test_runs` (trigger, status, summary, passed)
- k6 script generator: translate stored definition into k6 JS
- Containerized k6 runner (isolated, resource-limited)
- On-demand trigger: `POST /tests/:id/run` → BullMQ → container execution
- Scheduled trigger: BullMQ repeatable from `schedule_cron`
- Private apps routed through WireGuard (F5 transport abstraction)
- k6 output → metrics store (Prometheus remote-write or JSON)
- Threshold evaluation → passed/failed + F10 notification
- Guardrails: global concurrency limit, per-app cooldown, VU cap, kill switch
- Frontend: test definition UI, run-now, live progress, history, comparison charts

## Deliverables
- NestJS module: `TestingModule`
- k6 runner Docker image / configuration
- Test definition + result APIs
- Frontend test management UI
