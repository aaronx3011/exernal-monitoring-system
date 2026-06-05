# F12 — Agent / SDK for Monitored Apps Agent

**Builds:** TypeScript SDK for F3 ingestion, quickstart docs, integration recipes, dashboard snippets  
**Depends on:** F2, F3

## Requirements
- TypeScript SDK (npm-publishable): init(baseUrl, apiKey), heartbeat(), metric(name, value, labels), event(level, message, attrs), flush/close
- Automatic heartbeat loop at configurable interval
- Metric/event buffering + batched flush
- Retry/backoff with idempotency-key generation
- Fail-open: bounded buffers, drop-on-overflow, non-blocking sends
- README with quickstart, API reference, and conventions
- Integration recipes: Node Exporter, Prometheus federation, Uptime Kuma, WireGuard peer setup
- Dashboard-embedded copy-paste snippets (pre-filled base URL) in F2 key-reveal modal and app detail

## Deliverables
- npm-publishable TypeScript SDK
- SDK README + API docs
- Integration recipe docs
- Dashboard snippet integration
