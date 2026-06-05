# F11 — Security, Auth & Multi-tenancy

> **Priority:** P0 (Phase 0, hardened through Phase 4) · **Primary engineering:** Backend, Security · **Depends on:** F1
> **Blocked-on-input:** Open Question #2 (who logs in — internal only vs. external app owners)

## Goal
Secure the platform end to end: human authentication/authorization for the dashboard, machine authentication for app ingestion (API keys, F2), a tenancy model that isolates data, secrets management, and the hardening/audit needed for a system that holds credentials and can reach into private networks.

## Why it matters
This platform stores API keys, can probe and load-test private systems, and centralizes potentially sensitive logs. A compromise here is a compromise of everything it watches. Security is foundational, not a Phase 4 afterthought — the *data model* and *secrets handling* must be right from day one even if advanced RBAC ships later.

## Scope
- **Human auth:** dashboard login (sessions/JWT), password policy or SSO/OIDC, optional MFA.
- **Authorization/RBAC:** roles (admin, operator, viewer) scoped to org/tenant.
- **Machine auth:** API-key issuance/verification/rotation/revocation (implemented in F2; policy owned here).
- **Multi-tenancy:** org → application → key isolation enforced in every query, from day one in the schema.
- **Secrets management:** no plaintext secrets in repo/images; use Docker secrets or a secrets manager.
- **Transport security:** TLS everywhere (nginx, F1), WireGuard for private transport (F5).
- **Audit:** every sensitive action logged (F2 audit_log extended platform-wide).
- **Hardening & review:** dependency scanning, rate limits, threat model, pen-test before GA.

## Implementation steps

1. **[Security/Backend]** Decide auth approach based on Open Question #2: lightweight internal-only auth (small user table + sessions) vs. external app-owner accounts (full multi-tenant, likely OIDC + per-tenant isolation).
2. **[Backend]** Implement human authentication (session or JWT), with secure cookie/token handling, CSRF protection for cookie-based flows, and optional MFA.
3. **[Backend]** Implement RBAC: roles + permission checks enforced in a guard layer; viewer can't mutate, operator can manage apps/tests, admin manages users/tenants.
4. **[Backend/Data]** Bake tenancy into the schema (`org_id` on all tenant-scoped tables) and enforce it in a query layer so cross-tenant reads are structurally impossible — even if the UI is single-tenant initially.
5. **[Security/DevOps]** Stand up secrets management: Docker secrets or an external manager; rotate DB/Redis/Grafana credentials; ensure `.env` and keys are git-ignored and never baked into images.
6. **[Security]** Define the API-key policy (length, entropy, hashing, scopes, rotation cadence) that F2 implements; enforce scopes at ingestion (F3).
7. **[Backend]** Centralize the audit log: capture auth events, key actions, test triggers, config/peer changes, with actor + timestamp; expose to admins in F9.
8. **[DevOps/Security]** Add dependency + image vulnerability scanning to CI; fail builds on critical CVEs.
9. **[Security/Network]** Lock down the attack surface: nginx security headers, restrict Grafana/admin endpoints, firewall (only 80/443 + WG UDP + SSH), isolate WireGuard peers (F5), least-privilege for k6 runners (F6).
10. **[Security]** Threat model the system (focus: key theft, tenant escape, tunnel abuse, SSRF via probe/test targets) and run a pen-test before general availability.
11. **[Backend]** SSRF guardrails on F2/F4/F6 server-side fetches: validate/allow-list target schemes/hosts where feasible, block link-local/metadata ranges, so "probe this URL" can't be abused to hit internal cloud metadata.

## Deliverables
- Dashboard authentication + RBAC.
- Tenancy enforced in schema and query layer.
- Secrets management + API-key security policy.
- Platform-wide audit log + CI vulnerability scanning + threat model + pen-test sign-off.

## Acceptance criteria
- A viewer-role user cannot perform any mutating action; an operator cannot manage users; an admin can.
- Data from one tenant is never returned to another (verified by test).
- No plaintext secret exists in the repo, images, or logs (verified by scan).
- A registered key can be revoked and is immediately rejected at ingestion.
- SSRF attempts (e.g. probing a cloud metadata IP) are blocked.
- CI fails on a critical dependency/image CVE.

## Risks & mitigations
- **SSRF via user-supplied probe/test URLs** → allow-listing + blocking internal/metadata ranges (step 11).
- **Over-engineering tenancy for an internal-only tool** → resolve Open Question #2; keep schema multi-tenant but scope UI/auth to actual need.
- **Central store of secrets + private-network access = high-value target** → defense in depth: hashing, least privilege, network isolation, audit, pen-test.
