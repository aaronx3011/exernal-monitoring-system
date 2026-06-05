# F12 — Agent / SDK for Monitored Apps

> **Priority:** P1 (Phase 3) · **Primary engineering:** Backend, DevRel · **Depends on:** F2, F3

## Goal
Make it trivial for an app team to integrate. Provide a lightweight client library (SDK) and clear docs so that, after registering an app and getting a key (F2), a developer drops in a few lines to start pushing heartbeats, metrics, and events (F3) — and follows documented conventions for labels and the optional exporters (F8).

## Why it matters
With 25–100 apps, integration friction is the difference between broad adoption and a half-populated dashboard. A good SDK standardizes payloads (helping F3/F7 cardinality), bakes in retries/idempotency, and turns "integrate monitoring" into a 15-minute task.

## Scope
- A client SDK (start with the language(s) your apps use most — e.g. Node/TypeScript first) that wraps F3 ingestion.
- Features: configure with base URL + API key; send heartbeats on an interval; push metrics (counters/gauges) and structured events; automatic retries with backoff + idempotency keys; sensible batching.
- Conventions: documented metric naming + label cardinality rules (protects F7).
- Integration recipes: how to also expose Node Exporter / Prometheus for central scraping (F8), and how to wire Uptime Kuma.
- Copy-paste snippets surfaced in the dashboard's key-reveal modal (F2/F9).

## Implementation steps

1. **[Backend/DevRel]** Decide the first SDK language(s) based on the app fleet; design the public API (init, heartbeat, metric, event, flush/close).
2. **[Backend]** Implement the SDK: auth header injection, automatic heartbeat loop, metric/event buffering + batched flush, retry/backoff, idempotency-key generation.
3. **[Backend]** Make the SDK resilient: never let monitoring break the host app (bounded buffers, drop-on-overflow, non-blocking sends, fail-open).
4. **[DevRel]** Write quickstart docs: register → copy key → install SDK → init → see data, with a working example app.
5. **[DevRel]** Document metric/label conventions and cardinality limits (aligned with F7) so apps don't create runaway series.
6. **[DevRel]** Write integration recipes for Node Exporter, app-side Prometheus federation, and Uptime Kuma (F8) — including the WireGuard-peer setup for private apps (F5).
7. **[Frontend]** Surface ready-to-paste init snippets (with the app's base URL pre-filled) in the F2 key-reveal modal and app detail page.
8. **[Backend/DevRel]** Version the SDK and publish to the appropriate registry (e.g. npm) with semver and a changelog.
9. **[QA]** Validate the SDK against a real app: kill the hub mid-run and confirm the host app is unaffected and data resumes on recovery.
10. **[DevRel]** (Optional) Provide a thin reference agent/sidecar for apps that can't embed the SDK directly.

## Deliverables
- A published, versioned client SDK wrapping F3 ingestion with retries/idempotency/batching.
- Quickstart + conventions + integration-recipe docs.
- Dashboard-embedded, pre-filled integration snippets.

## Acceptance criteria
- A developer can integrate a new app (heartbeats + a metric + an event) in well under 30 minutes following the quickstart.
- The SDK never blocks or crashes the host app when the hub is unreachable; data resumes after recovery (verified by killing the hub mid-run).
- Metrics sent via the SDK conform to the documented label conventions and don't trip F7 cardinality limits.
- The dashboard shows a copy-paste snippet pre-filled with the app's base URL and a placeholder for the key.

## Risks & mitigations
- **Monitoring SDK harming the host app** → fail-open design, bounded buffers, non-blocking I/O, drop-on-overflow.
- **Fragmented integration quality across teams** → SDK + recipes standardize it; conventions enforced server-side (F3/F7) as a backstop.
- **Multiple app languages** → start with the most common language, prioritize others by fleet demand; offer the reference agent as a stopgap.
