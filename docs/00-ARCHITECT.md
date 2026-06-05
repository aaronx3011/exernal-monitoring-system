# Centralized Monitoring Platform — Architecture & Build Plan

## Build Order

```
Phase 0 (Foundations)
  F1 ── Infra (NestJS, Docker, nginx, CI/CD)
  F7 ── Storage (Postgres, TimescaleDB, Loki, Redis)
  F11 ─ Security (Auth, RBAC, Tenancy, Secrets)

Phase 1 (Core Monitoring Loop)
  F2 ── Registration & API Keys (depends on F1, F11)
  F3 ── Inbound Ingestion (depends on F1, F2, F7, F11)
  F4 ── Outbound Probing (depends on F1, F2, F5, F7)
  F9 ── Dashboard v1 (depends on F2, F3, F4, F11)

Phase 2 (Private & Storage Depth)
  F5 ── WireGuard Connectivity (depends on F1)
  F8 ── Observability Integration (depends on F1, F3, F7)

Phase 3 (Testing & Alerting)
  F6 ── k6 Testing Engine (depends on F1, F2, F5, F7)
  F10 ─ Notifications (depends on F3, F4, F6)
  F12 ─ Agent/SDK (depends on F2, F3)
  F9 ── Dashboard v2 (iterates on F6, F10, F12)
```

## Project Structure
```
implementation/
├── api/              # NestJS backend
│   ├── src/
│   │   ├── modules/  # auth, registration, ingestion, probing, testing, storage, notifications, dashboard-api
│   │   ├── common/   # guards, pipes, filters, interceptors, decorators
│   │   └── main.ts
│   ├── test/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── dashboard/        # React frontend (Vite)
│   ├── src/
│   │   ├── pages/    # FleetOverview, RegisterApp, AppDetail, Tests, Alerts, Settings
│   │   ├── components/ # shared UI components (shadcn-style)
│   │   ├── lib/      # API client, auth store, socket.io client
│   │   └── App.tsx
│   ├── Dockerfile    # Multi-stage: build + nginx serve
│   ├── docker/nginx.conf  # Serves static files, proxies /api/ + /socket.io/
│   ├── package.json
│   └── vite.config.ts
├── docker/           # Docker Compose + configs
│   ├── docker-compose.yml      # Production: all services + nginx-proxy-manager
│   ├── docker-compose.dev.yml  # Dev: exposes ports, disables proxy/wireguard/k6
│   ├── nginx/         # Reference configs (manual deployment only)
│   ├── prometheus/
│   ├── grafana/
│   ├── loki/
│   └── wireguard/
├── sdk/              # TypeScript client SDK
│   ├── src/
│   ├── package.json
│   └── README.md
├── scripts/          # Backup, restore
│   ├── backup.sh
│   └── restore.sh
└── .gitignore
```

## Key Architectural Decisions
1. **Modular monolith** in NestJS — modules map 1:1 to features; extractable to microservices later
2. **BullMQ + Redis** for all async work (ingestion, probing, testing, notifications)
3. **TimescaleDB** for metrics (Postgres native), **Loki** for logs, **Postgres** for config
4. **shadcn/ui + Tailwind** for consistent React UI
5. **Multi-tenancy from day one** in schema (`org_id` on all tables)
6. **WireGuard hub-and-spoke** for private app connectivity
7. **All outward-bound HTTP from F4/F6** goes through a transport abstraction that handles public vs private routing
8. **nginx-proxy-manager** handles SSL termination, domain routing, and Let's Encrypt automation
9. **Dashboard nginx** proxies `/api/` and `/socket.io/` to the API container, keeping the frontend and backend behind a single domain
10. **Dev mode** runs the dashboard via Vite dev server (port 5173) with ports exposed directly; production mode exposes only nginx-proxy-manager (80/443/81) and wireguard (51820/UDP)
