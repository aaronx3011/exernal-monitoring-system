# F3 — Inbound Ingestion (status, usage, availability)

> **Priority:** P0 (Phase 1) · **Primary engineering:** Backend, Data · **Depends on:** F1, F2, F7, F11

## Goal
Accept data **pushed by registered applications** — current status, usage, and availability heartbeats — authenticated by API key, validated, and written to the time-series and log stores. This is the "apps → hub" half of the bidirectional requirement.

## Why it matters
Active probing (F4) tells us what we can see from outside. Inbound ingestion tells us what the app knows about itself (queue depth, error rates, request counts, custom metrics). Both are needed for a complete picture, and inbound is the only way to get internals from private apps that we can't deep-inspect.

## Scope
- Authenticated ingestion endpoints for heartbeats, metrics, and events.
- API-key authentication middleware (verify hash, check revocation, update `last_used_at`, enforce scopes).
- Payload validation, normalization, and tagging by `application_id`.
- Idempotency + deduplication (apps will retry).
- Rate limiting + backpressure per application.
- Writes routed to TimescaleDB (metrics), Loki (logs/events), Postgres (latest-status cache).

## API surface
- `POST /ingest/heartbeat` — `{ status, version, uptime_s, custom: {...} }`. Lightweight liveness + self-reported health.
- `POST /ingest/metrics` — batched samples `[{ name, value, labels, ts }]`. Usage/availability counters and gauges.
- `POST /ingest/events` — `[{ level, message, attributes, ts }]`. Structured app events/logs.
- All require `Authorization: Bearer mk_...` and accept `Idempotency-Key` header.

## Implementation steps

1. **[Backend]** Build the API-key auth guard: parse bearer token → look up by prefix → verify hash → reject if revoked/expired → attach `application_id` to the request context → async-update `last_used_at`.
2. **[Backend]** Define DTOs and validation for heartbeat, metrics, and events; reject malformed batches with clear 4xx errors and per-item error detail.
3. **[Data]** Design the TimescaleDB hypertable for metrics (`time, application_id, metric_name, value, labels jsonb`) with appropriate chunk interval and indexes.
4. **[Backend]** Implement ingestion handlers that enqueue writes (BullMQ) rather than writing inline, so spikes are absorbed; workers drain to Timescale/Loki.
5. **[Backend]** Implement idempotency: store seen `Idempotency-Key` per app for a TTL window; drop duplicates.
6. **[Backend]** Implement per-application rate limiting (token bucket in Redis) and return `429` with `Retry-After` when exceeded; emit an internal alert (F10) if an app is being throttled persistently.
7. **[Backend]** Maintain a "latest status" cache in Postgres (last heartbeat, last-seen, current status) for fast dashboard reads.
8. **[Data]** Wire metrics into the same store F8 uses so probe results and pushed metrics are queryable together.
9. **[Backend]** Detect "stale" apps: if no heartbeat within an app-configured interval, mark `degraded`/`down` and trigger F10.
10. **[QA]** Build a load test that simulates 100 apps pushing concurrently to validate backpressure and idempotency.

## Deliverables
- Three authenticated ingestion endpoints with batching + idempotency.
- Queue-backed write path to Timescale/Loki.
- Per-app rate limiting and stale-detection.

## Acceptance criteria
- A request with a revoked key is rejected with 401 and is **not** written.
- Sending the same batch twice with the same `Idempotency-Key` results in one stored copy.
- Under a simulated burst the endpoint stays responsive (queue absorbs the spike; no DB timeout cascade).
- An app that stops sending heartbeats is marked stale within its configured window and fires a notification.
- Pushed metrics and probe metrics (F4) appear in the same query/graph.

## Risks & mitigations
- **A misbehaving app floods ingestion** → per-app rate limits + queue + throttle alerts.
- **Clock skew on app-supplied timestamps** → accept app `ts` but clamp to a sane window; store server receive time too.
- **Schema sprawl from arbitrary custom metrics** → labels as JSONB, but cap cardinality and document conventions in F12.
