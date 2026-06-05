# F1 — Core Infrastructure Agent

**Builds:** NestJS monorepo, Docker Compose, nginx config, CI/CD, health endpoints  
**Entry point:** `/Users/aaronx3011/Documents/personal/monitoring/implementation/`

## Requirements
- NestJS modular monolith with empty modules: `auth`, `registration`, `ingestion`, `probing`, `testing`, `storage`, `notifications`, `dashboard-api`
- Global validation pipe, exception filter, request-id interceptor, structured JSON logging, response envelope
- Health endpoints: `/healthz` (liveness), `/readyz` (DB + Redis reachable)
- `docker-compose.yml` with: api (NestJS), postgres, timescaledb, redis, loki, prometheus, grafana
- nginx config with TLS (certbot), reverse-proxy `app.<domain>` → NestJS, `grafana.<domain>` → Grafana
- CI/CD pipeline (build, lint, test, deploy)
- Dockerfile for NestJS app (multi-stage build)

## Deliverables
- Working NestJS app with all cross-cutting concerns (pipes, filters, interceptors, logging)
- `docker-compose.yml` with all services
- `nginx/` directory with configs
- `Dockerfile` for the API
- `scripts/` directory with deploy helpers
- `package.json`, `tsconfig.json`, `nest-cli.json`
