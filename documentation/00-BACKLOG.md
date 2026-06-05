# Centralized Monitoring Platform — Master Backlog

> **Audience:** Engineering team
> **Status:** Greenfield (nothing built yet)
> **Last updated:** 2026-05-31

---

## 1. Product Summary

We are building a **self-hosted, centralized monitoring & observability platform** that ingests health, usage, availability, metrics, and logs from **25–100 applications** (a mix of publicly reachable and VPN-only services). The platform is a **custom NestJS + React application** that treats Uptime Kuma, Prometheus, Grafana, and Node Exporter as **data sources living inside the monitored apps** — we centralize and store what they emit, we do not replace them.

The platform must support:

1. **Bidirectional communication** — apps push status to us; we actively probe apps (including ones reachable only over WireGuard).
2. **A registration dashboard** — register an app, generate an API key, and immediately begin probing it via the URL you registered.
3. **On-demand & scheduled load testing** — define a k6-style test (endpoint + parameters) per application and run it on a schedule or manually.
4. **Centralized log & metric storage** — long-term retention of everything the apps emit.
5. **Notifications** — forward events as text to a webhook endpoint (to be provided later).

### Deployment Target
A strong VPS on a cloud provider, fronted by **nginx** for TLS termination and domain routing, so apps can `POST` securely to a stable domain. WireGuard runs on the same VPS as the hub for reaching private apps.

---

## 2. Architecture at a Glance

```
                        ┌─────────────────────────────────────────────┐
                        │                  VPS (cloud)                  │
                        │                                               │
   Public apps  ──TLS──▶│  nginx  ──▶  API Gateway (NestJS)             │
                        │                   │                           │
                        │     ┌─────────────┼──────────────┐            │
                        │     ▼             ▼              ▼            │
                        │  Ingestion    Registration    Probe/Test      │
                        │  Service       Service        Engine          │
                        │     │             │              │            │
                        │     ▼             ▼              ▼            │
                        │  TimescaleDB   PostgreSQL    k6 Runner pool    │
                        │  (metrics)     (config/keys)                  │
                        │     │                                         │
                        │     ▼                                         │
                        │  Loki (logs)   Prometheus (federated scrape)  │
                        │     │                                         │
                        │     ▼                                         │
                        │  React Dashboard  +  Grafana (embedded)       │
                        │                                               │
                        │  WireGuard interface (wg0) ─────┐             │
                        └─────────────────────────────────┼─────────────┘
                                                          │
                                          ┌───────────────┘
                                          ▼
                                   VPN-only apps (private subnet)
```

**Data flow, two directions:**

- **Inbound (app → hub):** App holds an API key. It pushes health/usage/availability heartbeats and ships logs + metrics. Authenticated at the gateway, validated, written to time-series + log stores.
- **Outbound (hub → app):** Probe Engine actively hits each app's health-check URL on a schedule. For public apps it routes over the internet; for private apps it routes through `wg0`. The Test Engine likewise launches k6 runs against app endpoints over either path.

---

## 3. Feature Index

| # | Feature | File | Primary Eng | Priority |
|---|---------|------|-------------|----------|
| F1 | Core Platform, Gateway & Infra Foundation | [features/F1-core-platform-and-infra.md](features/F1-core-platform-and-infra.md) | Backend, DevOps | P0 |
| F2 | Application Registration & API Key Management | [features/F2-registration-and-api-keys.md](features/F2-registration-and-api-keys.md) | Backend, Frontend | P0 |
| F3 | Inbound Ingestion (status, usage, availability) | [features/F3-inbound-ingestion.md](features/F3-inbound-ingestion.md) | Backend, Data | P0 |
| F4 | Outbound Probing & Active Health Checks | [features/F4-outbound-probing.md](features/F4-outbound-probing.md) | Backend, DevOps | P0 |
| F5 | WireGuard Connectivity to Private Apps | [features/F5-wireguard-connectivity.md](features/F5-wireguard-connectivity.md) | DevOps/Network, Backend | P0 |
| F6 | k6 Load-Testing Engine (scheduled + on-demand) | [features/F6-k6-testing-engine.md](features/F6-k6-testing-engine.md) | Backend, DevOps | P1 |
| F7 | Centralized Logs & Metrics Storage | [features/F7-logs-and-metrics-storage.md](features/F7-logs-and-metrics-storage.md) | Data, Backend | P0 |
| F8 | Observability Stack Integration (Kuma/Prom/Grafana/Node Exporter) | [features/F8-observability-integration.md](features/F8-observability-integration.md) | DevOps, Data | P1 |
| F9 | Dashboard & Visualization (React UI) | [features/F9-dashboard-ui.md](features/F9-dashboard-ui.md) | Frontend, Design | P0 |
| F10 | Notifications & Alerting | [features/F10-notifications-and-alerting.md](features/F10-notifications-and-alerting.md) | Backend | P1 |
| F11 | Security, Auth & Multi-tenancy | [features/F11-security-and-auth.md](features/F11-security-and-auth.md) | Backend, Security | P0 |
| F12 | Agent / SDK for Monitored Apps | [features/F12-agent-sdk.md](features/F12-agent-sdk.md) | Backend, DevRel | P1 |

---

## 4. Engineering Roles Referenced

| Role | Scope in this project |
|------|----------------------|
| **Backend Engineer** | NestJS services, APIs, business logic, queue workers, integrations |
| **Frontend Engineer** | React dashboard, state management, charts, forms |
| **DevOps / Platform Engineer** | VPS provisioning, nginx, Docker/Compose, CI/CD, k6 runners, Grafana |
| **Network Engineer** | WireGuard topology, routing, firewall, private subnet reachability |
| **Data Engineer** | TimescaleDB/Prometheus/Loki schema, retention, downsampling, queries |
| **Security Engineer** | Key management, secrets, threat model, pen-test, hardening |
| **UX/UI Designer** | Dashboard IA, registration flow, alert views |
| **DevRel / SDK** | Client libraries + docs so app teams integrate quickly |
| **QA Engineer** | Test plans, load/e2e validation, regression |

> A small team can have one person wearing several hats; the labels indicate the **skillset** each task needs, not necessarily distinct people.

---

## 5. Recommended Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Backend | **NestJS (TypeScript)** | Your stated preference; modular, DI, good for multi-service monolith → microservices later |
| Frontend | **React + TypeScript + Vite** | Your stated preference |
| UI library | **shadcn/ui + Tailwind**, **Recharts** for charts | Fast, clean, composable |
| Config DB | **PostgreSQL** | Apps, keys, users, test definitions |
| Metrics store | **TimescaleDB** (Postgres extension) or **Prometheus (remote-write/federation)** | Time-series at scale; Timescale keeps it in the Postgres family |
| Logs store | **Grafana Loki** | Cheap, label-based, integrates with Grafana |
| Queue / jobs | **BullMQ (Redis)** | Schedules probes, test runs, notification fan-out |
| Reverse proxy | **nginx** | TLS, domain routing (your choice) |
| VPN | **WireGuard** | Reach private apps (your requirement) |
| Dashboards | **Custom React** + **embedded Grafana** | Custom for product UX, Grafana for deep metric exploration |
| Containerization | **Docker + Docker Compose** (Phase 1), evaluate k8s later | Simple ops on a single strong VPS |
| Load testing | **k6** (run as containerized jobs) | Your requirement; scriptable, Prometheus output |

---

## 6. Phased Delivery Plan

### Phase 0 — Foundations (Sprints 1–2)
- F1 Core platform, repo, CI/CD, nginx, base Docker Compose
- F11 Security baseline (secrets, TLS, auth skeleton)
- F7 Storage layer provisioned (Postgres, Timescale, Loki, Redis)

**Exit criteria:** A deployed, TLS-secured skeleton that can authenticate a request and write a row to the DB.

### Phase 1 — Core Monitoring Loop (Sprints 3–5)
- F2 Registration + API key generation
- F3 Inbound ingestion of heartbeats/usage/availability
- F4 Outbound probing for public apps
- F9 Dashboard v1 (register app, see status)

**Exit criteria:** Register a public app, configure it with a key, see it push data, and see us probe it — end to end.

### Phase 2 — Private Reach & Storage Depth (Sprints 6–7)
- F5 WireGuard connectivity to private apps
- F7 Retention, downsampling, log pipelines hardened
- F8 Observability integration (scrape/federate Prometheus, ingest Kuma & Node Exporter)

**Exit criteria:** A VPN-only app is fully monitored exactly like a public one.

### Phase 3 — Testing & Alerting (Sprints 8–10)
- F6 k6 testing engine (define, schedule, run, store results)
- F10 Notifications to webhook endpoint
- F9 Dashboard v2 (test results, alert timeline, log explorer)
- F12 Agent/SDK for app teams

**Exit criteria:** Define a k6 test on an app, run it on a schedule, store results, and get notified when something breaks.

### Phase 4 — Hardening & Scale (Sprint 11+)
- Load test the platform itself, tune retention, finalize RBAC/multi-tenancy, security review, runbooks.

---

## 7. Cross-Cutting Concerns (apply to every feature)

- **Idempotency** on all ingestion endpoints (apps may retry).
- **Backpressure**: queue + rate limits so a chatty app can't drown the hub.
- **Observability of the observer**: the platform monitors itself (dogfood F3/F4).
- **Multi-tenancy from day one** in the data model (org → app → key), even if the UI exposes it later.
- **Schema migrations** versioned (e.g. Prisma/TypeORM migrations) — never hand-edit prod schema.
- **Secrets** never in env files in the repo; use a secrets manager or Docker secrets.
- **Audit log** for every key issuance, test trigger, and config change.

---

## 8. Open Questions for You

1. **Notification webhook contract** — you said you'd share the endpoint later. We also need: expected payload shape (JSON? plain text?), auth (bearer token? HMAC?), and whether it's one endpoint for all events or per-severity.
2. **Authentication for the dashboard** — who logs in? Just you/your team (a handful of internal users), or do external app owners get accounts? This drives how heavy F11 multi-tenancy needs to be.
3. **Data retention targets** — how long must raw metrics and logs be kept (e.g. 15 days raw + 1 year downsampled)? This drives storage sizing and cost.
4. **WireGuard topology** — will the VPS be a WireGuard *peer that dials into* each app's existing VPN, or will apps be peers that connect *into* a VPN hub you run on the VPS? (We recommend the hub model — see F5.)
5. **Expected scale of the heaviest signals** — roughly how many metrics/sec and log lines/sec at peak across all apps? Needed to size Timescale/Loki and the VPS.
6. **k6 test intensity & blast radius** — will load tests run against production apps? If so we need guardrails (rate caps, maintenance windows) so a test can't take down a live service.
7. **Compliance constraints** — any data residency, PII, or regulatory requirements on the stored logs?

> These don't block Phase 0/1 — start building F1, F2, F3, F4, F7, F11. Questions 1 and 6 block F6/F10 completion; questions 4/5 refine F5/F7 sizing.
