# Getting Started — Monitoring Platform

## Prerequisites

- **Docker** & **Docker Compose** (v2+)
- **Node.js 20+** (for local dev only)
- A terminal and `curl` (or any HTTP client)

## Quick Start (Dev Mode — 3 commands)

```bash
cd implementation/docker

# 1. Start infrastructure + API
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 2. Verify all services are running
docker compose ps

# 3. Check the API is alive
curl http://localhost:3000/api/v1/healthz
```

Expected output: `{"success":true,"data":{"status":"ok",...}}`

## What's Running (Dev Mode)

| Service        | URL                         | Credentials              |
|----------------|-----------------------------|--------------------------|
| API            | http://localhost:3000       | —                        |
| Grafana        | http://localhost:3001       | admin / admin (first login) |
| Prometheus     | http://localhost:9090       | —                        |
| Loki           | http://localhost:3100       | —                        |
| Redis          | localhost:6379              | —                        |
| PostgreSQL     | localhost:5432              | monitor / change_me      |
| TimescaleDB    | localhost:5433              | monitor / change_me      |
| Dashboard      | http://localhost:5173       | (run via `npm run dev` in `dashboard/`) |

## Production Mode

```bash
cd implementation/docker

# Copy and edit env vars
cp ../.env.example ../.env

# Build and start everything
docker compose up -d

# Access the admin UI to configure proxy rules
open http://<SERVER_IP>:81
```

In production, only **nginx-proxy-manager** (ports 80/443/81) and **wireguard** (51820/UDP) expose ports to the host. All other services are internal.

### nginx-proxy-manager Setup

1. Access the admin UI at `http://<SERVER_IP>:81`
2. Login: `admin@example.com` / `changeme` (change immediately)
3. Create a proxy host for the dashboard:
   - Domain: `app.example.com`
   - Forward Hostname: `dashboard`
   - Forward Port: `80`
   - WebSocket Support: not needed
   - SSL: Request a new Let's Encrypt certificate
4. Create a proxy host for Grafana:
   - Domain: `grafana.example.com`
   - Forward Hostname: `grafana`
   - Forward Port: `3000`
   - SSL: Request a new Let's Encrypt certificate

The dashboard's nginx automatically proxies `/api/` and `/socket.io/` requests to the API container, so you only need one proxy host for the entire app.

## API Walkthrough

### 1. Register an admin user

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123","name":"Admin","role":"admin"}'
```

### 2. Login to get a JWT token

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')
echo "$TOKEN"
```

### 3. Register an application

```bash
curl -s -X POST http://localhost:3000/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name":"My App",
    "baseUrl":"https://httpbin.org",
    "healthPath":"/get",
    "networkType":"public",
    "environment":"production",
    "tags":["web","api"]
  }'
```

Save the `plaintextKey` from the response — **shown only once**.

### 4. Push a heartbeat with the API key

```bash
KEY="mk_xxxxx_yyyyy"   # use the key from step 3
curl -s -X POST http://localhost:3000/api/v1/ingest/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KEY" \
  -d '{"status":"up","version":"1.0.0","uptime_s":3600}'
```

### 5. Push metrics

```bash
curl -s -X POST http://localhost:3000/api/v1/ingest/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KEY" \
  -d '[{"name":"app.requests","value":100,"labels":{"method":"GET"},"ts":"2026-06-01T00:00:00Z"}]'
```

### 6. Check the dashboard stats

```bash
curl http://localhost:3000/api/v1/dashboard/stats
```

## Project Structure

```
implementation/
├── api/                 # NestJS backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # JWT login, user registration
│   │   │   ├── registration/   # App CRUD, API keys
│   │   │   ├── ingestion/      # Heartbeat, metrics, events ingestion
│   │   │   ├── probing/        # Outbound health checks (WebSocket status)
│   │   │   ├── testing/        # k6 load test definitions & execution
│   │   │   ├── notifications/  # Alert rules, webhook delivery
│   │   │   ├── storage/        # TypeORM entities & TimescaleDB
│   │   │   ├── redis/          # Redis client provider
│   │   │   └── dashboard-api/  # Dashboard summary endpoints
│   │   ├── common/             # Guards, filters, interceptors, decorators
│   │   └── main.ts
│   └── Dockerfile
├── dashboard/           # React frontend (Vite)
│   ├── src/
│   │   ├── pages/       # FleetOverview, AppDetail, Tests, Alerts...
│   │   ├── components/  # UI kit (shadcn-style) + charts
│   │   ├── lib/         # API client, auth store, socket.io client
│   │   └── App.tsx
│   ├── Dockerfile       # Multi-stage: builds Vite app, serves via nginx
│   ├── docker/
│   │   └── nginx.conf   # Static files + API/socket.io proxy config
│   └── package.json
├── sdk/                 # TypeScript client SDK (npm package)
│   ├── src/client.ts    # MonitoringClient class
│   └── README.md        # Full docs with examples
├── docker/              # Docker Compose & service configs
│   ├── docker-compose.yml     # Production: all services + nginx-proxy-manager
│   ├── docker-compose.dev.yml # Dev override: exposes ports, disables proxy
│   ├── nginx/           # Reference nginx configs (manually deployed only)
│   ├── prometheus/      # Scrape configs
│   ├── grafana/         # Provisioned dashboards + datasources
│   ├── loki/            # Log storage config
│   ├── k6-runner/       # Load test runner image
│   └── wireguard/       # VPN hub config
├── scripts/             # Deploy, backup, restore utilities
└── .gitignore           # Project-wide ignore rules
```

## Features at a Glance

| Feature | Status | How to Try |
|---------|--------|------------|
| User auth (JWT) | ✓ | POST /auth/login |
| Register apps | ✓ | POST /applications |
| API keys (CSPRNG, SHA-256 hashed) | ✓ | POST /applications/:id/keys |
| Heartbeat ingestion | ✓ | POST /ingest/heartbeat |
| Metrics ingestion | ✓ | POST /ingest/metrics |
| Event ingestion | ✓ | POST /ingest/events |
| Rate limiting + idempotency | ✓ | Sends 429 on excess; Idempotency-Key dedup |
| Connectivity check | ✓ | POST /applications/:id/check-connectivity |
| Outbound probing (scheduled) | ✓ | Built — needs app with probe config |
| k6 load testing | ✓ | POST /tests — runs containerized |
| Alert rules + webhooks | ✓ | POST /alert-rules |
| RBAC (admin/operator/viewer) | ✓ | JWT claims, RolesGuard |
| Multi-tenant data isolation | ✓ | org_id on every entity |
| SSRF protection | ✓ | Blocks private/metadata IPs |
| Audit log | ✓ | All mutations logged |
| TypeScript SDK | ✓ | npm-ready, zero deps, 10/10 tests |
| Grafana (embedded) | ✓ | http://localhost:3001 |
| Prometheus scraping | ✓ | Auto-scrape from registry |
| Loki log storage | ✓ | Configured for app events |
| WireGuard hub | ✓ | Config ready, needs VPS |
| React dashboard | ✓ | Vite dev server |

## Running Locally (without Docker)

Start dependencies:
```bash
docker compose -f docker/docker-compose.yml up -d postgres timescaledb redis
```

Then start the API in dev mode:
```bash
cd api && npm install && npm run start:dev
```

And the dashboard:
```bash
cd dashboard && npm install && npm run dev
```

## Stopping

```bash
cd implementation/docker

# Dev mode (with ports exposed)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Production mode
docker compose down
```

Add `-v` to also remove volumes (deletes all data).

## Environment Variables

Copy `implementation/.env.example` to `implementation/.env` and fill in:

| Variable          | Description                        | Default                  |
|-------------------|------------------------------------|--------------------------|
| `NODE_ENV`        | Environment mode                   | `production`             |
| `DB_HOST`         | Postgres hostname                  | `postgres`               |
| `DB_PASSWORD`     | Postgres password                  | `change_me`              |
| `JWT_SECRET`      | JWT signing secret                 | `change_me_jwt_secret`   |
| `CORS_ORIGIN`     | Allowed CORS origins (comma-sep)   | `https://app.example.com`|
| `LOKI_HOST`       | Loki URL                           | `http://loki:3100`       |
| `DOMAIN`          | Your app domain                    | `app.example.com`        |
| `GRAFANA_DOMAIN`  | Your grafana domain                | `grafana.example.com`    |

## Using the TypeScript SDK

```bash
cd implementation/sdk
npm install
npm run build
npm test          # 10/10 tests pass
```

See `sdk/README.md` for full API docs and integration examples.
