# F3 — Inbound Ingestion Agent

**Builds:** Authenticated ingestion endpoints, queue-backed writes, rate limiting, staleness detection  
**Depends on:** F1, F2, F7, F11

## Requirements
- API-key auth guard (parse bearer token → look up by prefix → verify hash → reject if revoked)
- Three endpoints: `POST /ingest/heartbeat`, `POST /ingest/metrics`, `POST /ingest/events`
- DTOs and validation for heartbeat, metrics (batched samples), events (structured)
- BullMQ queue-backed write path to TimescaleDB (metrics) and Loki (logs/events)
- Idempotency via `Idempotency-Key` header with TTL window
- Per-application rate limiting (token bucket in Redis), 429 with Retry-After
- Latest-status cache in Postgres (last heartbeat, last-seen, current status)
- Stale-app detection (mark degraded/down if no heartbeat within configured interval)

## Deliverables
- NestJS module: `IngestionModule` with guards, controllers, services, BullMQ workers
- TimescaleDB hypertable schema for metrics
- Loki push configuration
- Rate limiter implementation
- Stale-app detector worker
