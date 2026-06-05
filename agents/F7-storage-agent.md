# F7 — Centralized Logs & Metrics Storage Agent

**Builds:** Database schemas, TimescaleDB hypertables, Loki config, retention/backup policies  
**Depends on:** F1

## Requirements
- PostgreSQL schema: apps, keys, users, test definitions, run summaries, audit log
- TimescaleDB hypertable for metrics: `(time, application_id, metric_name, value, labels jsonb)` with chunk interval and indexes
- Timescale continuous aggregates (downsampling): 1m → 5m → 1h rollups
- Timescale compression + retention policies
- Loki label schema: `application_id`, `env`, `level`
- Write contracts for all producers (F3, F4, F6) to conform
- Query patterns/materialized views for dashboard (uptime %, p95 latency, error-rate trends)
- Automated backups: Postgres WAL + periodic base backup, tested restore
- Migration files (TypeORM/Prisma)
- Sizing document

## Deliverables
- Migration files for all schemas
- TimescaleDB setup scripts
- Loki configuration
- Backup/restore scripts
- Materialized views for dashboard queries
