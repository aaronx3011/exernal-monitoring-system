# F8 — Observability Stack Integration Agent

**Builds:** Central Prometheus scraping, Uptime Kuma ingestion, Grafana deployment, embedded dashboards  
**Depends on:** F1, F3, F7

## Requirements
- Central Prometheus with scrape configs generated from app registry
- Prometheus federation from app-side Prometheus servers
- Direct scraping of Node Exporters (public + private via WireGuard)
- Uptime Kuma integration: push/webhook → F3 ingestion, or scrape Kuma's metrics endpoint
- Grafana behind nginx (`grafana.<domain>`), provisioned data sources (Prometheus, Timescale, Loki)
- Starter Grafana dashboards as code (fleet overview, per-app drill-down)
- Embedded Grafana panels in React dashboard (signed embeds/iframes)
- Target↔application mapping so exporter metrics attribute to right app
- Registry-driven scrape-target generation (register app → auto-scrape)

## Deliverables
- Prometheus config with auto-generated scrape targets
- Grafana provisioning YAML + starter dashboards JSON
- Uptime Kuma integration bridge
- Registry→scrape target sync service
