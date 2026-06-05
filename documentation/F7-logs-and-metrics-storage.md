# F7 — Centralized Logs & Metrics Storage

> **Priority:** P0 (Phase 0→2) · **Primary engineering:** Data, Backend · **Depends on:** F1
> **Blocked-on-input:** Open Questions #3 (retention) and #5 (scale)

## Goal
Provide the durable, queryable storage layer for everything the platform handles: time-series metrics (pushed + probed + test results), structured logs/events, and configuration. Define schemas, retention, downsampling, and backup so data is both affordable to keep and fast to query.

## Why it matters
This is the system of record. F3, F4, F6, F8, F9, and F10 all read or write here. Getting retention and cardinality right is the difference between a platform that stays cheap and fast and one that falls over at 100 apps.

## Storage components
- **PostgreSQL** — configuration & relational data (apps, keys, users, test defs, run summaries, audit log).
- **TimescaleDB** (Postgres extension) — time-series metrics (heartbeat-derived, usage, probe latency/up, k6 per-run series).
- **Grafana Loki** — structured logs and app events (F3 events, k6 raw output, platform logs).
- **Redis** — ephemeral: queues (BullMQ), rate-limit buckets, idempotency keys, latest-status cache.
- **Object storage (optional)** — large k6 artifacts / cold log archives.

## Implementation steps

1. **[Data]** Finalize retention targets with stakeholder (Open Question #3): e.g. raw metrics 15–30d, downsampled 1y; logs 7–30d hot + optional cold archive. Document per data class.
2. **[Data]** Estimate volume from Open Question #5 (metrics/sec, log lines/sec at 100 apps) and size disk/IOPS for the VPS accordingly; build headroom.
3. **[Data]** Design Timescale hypertables: partition (chunk) interval, indexes on `(application_id, metric_name, time)`, and JSONB labels with documented cardinality limits.
4. **[Data]** Configure Timescale continuous aggregates (downsampling) — e.g. 1m → 5m → 1h rollups — and retention/drop policies to expire raw data after the hot window.
5. **[Data]** Configure Loki: label schema (`application_id`, `env`, `level`), chunk/retention config, and an index strategy that avoids high-cardinality label explosions.
6. **[Backend]** Define the write contracts the ingestion/probe/test workers use so all producers conform to the same schema.
7. **[Data]** Implement compression (Timescale native compression on older chunks) to cut storage cost.
8. **[DevOps]** Automated backups: Postgres (WAL + periodic base backup), Timescale included; Loki object-store backup or snapshot; documented, tested restore.
9. **[Data]** Define query patterns/materialized views the dashboard (F9) needs (uptime %, p95 latency, error-rate trends) so reads are pre-optimized.
10. **[QA/Data]** Load-test the storage layer at projected peak; verify query latency on dashboards stays acceptable and retention policies actually reclaim space.

## Deliverables
- Provisioned Postgres + TimescaleDB + Loki + Redis with documented schemas.
- Retention, downsampling, and compression policies in code/config.
- Backup + tested restore procedure.
- Sizing document tied to the scale answers.

## Acceptance criteria
- Metrics older than the raw-retention window are automatically downsampled and dropped per policy (verified by inspecting chunk counts/disk).
- Dashboard queries (uptime %, p95 latency over 30d) return within an acceptable latency budget at projected scale.
- A full backup can be restored to a clean environment following the documented runbook.
- High-cardinality protections prevent a single app's labels from blowing up index size.

## Risks & mitigations
- **Cardinality explosion** (per-request labels, unbounded tag values) → enforce label conventions (F12), cap distinct values, reject offending series.
- **Disk exhaustion** → retention + compression + alerting on disk usage; archive cold data to object storage.
- **Single-node storage limits** → start single-VPS, but keep the door open to externalizing Timescale/Loki to managed/clustered services in Phase 4 if scale demands.
