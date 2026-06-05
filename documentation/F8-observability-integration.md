# F8 — Observability Stack Integration (Uptime Kuma / Prometheus / Grafana / Node Exporter)

> **Priority:** P1 (Phase 2) · **Primary engineering:** DevOps, Data · **Depends on:** F1, F3, F7

## Goal
Integrate the tools you named as **data sources that live inside or alongside the monitored apps**, and centralize what they emit. Specifically: scrape/federate **Prometheus** instances and **Node Exporters** running with the apps, ingest **Uptime Kuma** status, and use **Grafana** (embedded) for deep metric exploration on top of our central store. We centralize and store; we don't replace these tools where they already run.

## Why it matters
Many of your apps already (or will) run Node Exporter and Prometheus locally. Rather than reinvent host/process metrics, we pull them into the central store so everything — pushed metrics (F3), our probes (F4), test results (F6), and app-side exporters — is queryable and graphable in one place.

## Scope
- A central Prometheus configured to scrape app-side exporters / federate app-side Prometheus servers (over public or WireGuard paths).
- Node Exporter metrics from app hosts pulled into the central store.
- Uptime Kuma integration: ingest its status (push/webhook from Kuma, or scrape its metrics endpoint) so Kuma-monitored checks show up centrally.
- Grafana deployed and embedded behind nginx, wired to the central data sources, with starter dashboards.
- Mapping each scrape target / Kuma monitor back to a registered `application_id`.

## Implementation steps

1. **[DevOps]** Deploy the central Prometheus (in the Compose stack) with service discovery / a generated scrape-config derived from the app registry.
2. **[Data]** For app-side Prometheus servers, configure **federation** (scrape `/federate` for selected series) to avoid pulling everything; for standalone exporters, scrape directly.
3. **[Network]** Ensure scrape targets on private apps are reached through WireGuard (F5) — scrape configs target the tunnel endpoints.
4. **[Backend]** Generate scrape targets from the registry so registering an app (with an exporter/Prometheus URL) automatically adds it to central scraping; reconcile on changes.
5. **[DevOps]** Integrate Uptime Kuma: configure Kuma to push status to F3's ingestion (or expose Kuma's Prometheus metrics for the central Prometheus to scrape); normalize into our status model.
6. **[Data]** Decide the storage path: either keep Prometheus as a queryable source and/or `remote_write` into TimescaleDB (F7) for long retention; document which series live where.
7. **[DevOps]** Deploy Grafana behind nginx (`grafana.<domain>`), provision data sources (Prometheus, Timescale, Loki) as code, and create starter dashboards (fleet overview, per-app drill-down).
8. **[Frontend/DevOps]** Embed relevant Grafana panels into the React dashboard (F9) via signed embeds/iframes for deep dives, while keeping the product's own summary views native.
9. **[Backend]** Maintain the target↔application mapping so a metric from an exporter is attributable to the right registered app.
10. **[QA]** Verify a newly registered app with an exporter shows host metrics centrally without manual Prometheus edits, and that a Kuma monitor's state reaches our store.

## Deliverables
- Central Prometheus scraping/federating app exporters & Prometheus (public + private).
- Uptime Kuma status flowing into the central model.
- Grafana deployed, provisioned-as-code, embedded in the dashboard.
- Registry-driven scrape-target generation.

## Acceptance criteria
- Registering an app that exposes Node Exporter results in its host metrics appearing centrally with no hand-edited scrape config.
- A private app's exporter is scraped through WireGuard.
- An Uptime Kuma monitor's up/down state is visible in the central platform.
- Grafana dashboards render against the central data sources and embed cleanly in the React UI.

## Risks & mitigations
- **Pulling entire app-side Prometheus = huge volume** → federate selected series only; document what's pulled.
- **Two sources of "truth" for status (Kuma vs our F4 probes)** → define precedence and reconcile into one status model; avoid conflicting alerts.
- **Grafana auth/embedding** → use provisioned data sources + signed embeds; don't expose Grafana admin publicly (ties to F11).
