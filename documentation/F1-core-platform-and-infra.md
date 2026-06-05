# F1 — Core Platform, Gateway & Infra Foundation

> **Priority:** P0 (Phase 0) · **Primary engineering:** Backend, DevOps · **Depends on:** nothing

## Goal
Stand up the skeleton everything else hangs off: the NestJS monorepo, the API gateway, nginx + TLS, the Docker Compose topology, and CI/CD. When this is done, a request can arrive over HTTPS at a domain, be authenticated, and write to a database.

## Why it matters
This is greenfield. Every other feature assumes a deployable, secured, observable base exists. Getting the module boundaries and the deployment story right now avoids costly rework later.

## Scope
- NestJS application structured as a modular monolith (modules map to F2–F12).
- API gateway layer: routing, request validation (DTOs + class-validator), global error handling, request IDs, structured logging.
- nginx reverse proxy with TLS (Let's Encrypt via certbot or Caddy-style auto-cert), HTTP→HTTPS redirect, domain routing to the NestJS app and to Grafana.
- Docker Compose defining all services (api, postgres, timescaledb, redis, loki, prometheus, grafana, wireguard).
- CI/CD pipeline (build, lint, test, container image, deploy to VPS).
- Health/readiness endpoints for the platform itself.
- Centralized config & secrets loading.

## Out of scope
Business logic of any specific feature; that lives in F2+.

## Implementation steps

1. **[DevOps]** Provision the VPS (right-size CPU/RAM/disk; see F7 for storage sizing). Harden SSH, set up a non-root deploy user, enable a firewall (ufw/nftables) allowing only 80/443 + WireGuard UDP + SSH.
2. **[DevOps]** Install Docker + Docker Compose plugin. Establish a directory layout for volumes and backups.
3. **[Backend]** Initialize the NestJS monorepo (Nx or Nest workspace). Create empty modules: `auth`, `registration`, `ingestion`, `probing`, `testing`, `storage`, `notifications`, `dashboard-api`.
4. **[Backend]** Implement the gateway cross-cuts: global validation pipe, exception filter, interceptor for request-id + structured JSON logging, response envelope.
5. **[Backend]** Add platform health endpoints: `/healthz` (liveness), `/readyz` (DB + Redis reachable).
6. **[DevOps]** Write the `docker-compose.yml` with all services, internal network, named volumes, and resource limits. Wire env via Docker secrets / `.env` excluded from VCS.
7. **[DevOps]** Configure nginx: TLS termination, auto-renewing certs, reverse-proxy `app.<domain>` → NestJS, `grafana.<domain>` → Grafana, security headers (HSTS, X-Content-Type-Options, etc.).
8. **[DevOps]** Build CI: lint + unit tests on PR; on merge to main, build image, push to registry, deploy to VPS (SSH + compose pull/up, or a small GitOps runner).
9. **[Backend]** Wire a trivial authenticated "write a row" path end to end to prove the stack (will be replaced by F2/F3 logic).
10. **[DevOps]** Set up automated DB backups (pg_dump/WAL) and a documented restore procedure.

## Deliverables
- Running, TLS-secured deployment at the chosen domain.
- `docker-compose.yml` + nginx config in the repo.
- Green CI/CD pipeline deploying to the VPS on merge.
- Architecture decision record (ADR) capturing module boundaries and the monolith-first decision.

## Acceptance criteria
- Hitting `https://app.<domain>/healthz` returns 200 over a valid cert.
- A merge to `main` results in an automatically deployed change with no manual SSH steps.
- Killing the DB container makes `/readyz` report not-ready (proving real dependency checks).
- All services come up from a clean `docker compose up` on a fresh VPS using documented steps.

## Risks & mitigations
- **Single-VPS single point of failure** → document backup/restore now; plan a migration path to managed services or k8s in Phase 4.
- **Monolith → microservice creep** → keep module boundaries clean so extraction is mechanical later.
