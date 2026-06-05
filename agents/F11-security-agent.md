# F11 — Security, Auth & Multi-tenancy Agent

**Builds:** Human auth (JWT/sessions), RBAC, tenancy isolation, secrets management, audit, SSRF protection  
**Depends on:** F1

## Requirements
- Human authentication (JWT or session-based), secure cookie handling, CSRF protection, optional MFA
- RBAC: admin, operator, viewer roles, enforced via NestJS guard
- Tenancy baked into schema (`org_id`) + enforced in query layer (cross-tenant isolation)
- API-key security policy (F2) updated: length, entropy, hashing, scopes, rotation cadence
- Centralized audit log: auth events, key actions, test triggers, config/peer changes
- Secrets management: Docker secrets, `.env` git-ignored, credentials never in images
- Dependency + image vulnerability scanning in CI
- Security headers in nginx
- SSRF guardrails on F2/F4/F6: allow-list schemes/hosts, block link-local/metadata ranges

## Deliverables
- Auth module (JWT/sessions)
- RBAC guards and decorators
- Multi-tenant query layer
- Audit log service
- SSRF protection middleware
- Security scanning CI jobs
