# F2 — Registration & API Key Management Agent

**Builds:** App registration API, API key generation/lifecycle, connectivity check  
**Depends on:** F1 (NestJS base), F11 (auth/tenancy)

## Requirements
- Postgres schema: `organizations`, `applications`, `api_keys`, `audit_log` tables
- `POST /applications` with DTO validation (name, base_url, health_path, network_type env, tags)
- API key generation: CSPRNG 32+ bytes, format `mk_<prefix>_<secret>`, hash + persist, return once
- Key lifecycle: `POST /applications/:id/keys`, `POST /keys/:id/rotate`, `DELETE /keys/:id` (revoke)
- Connectivity check: on-demand fetch of `base_url + health_path`
- `GET /applications` (list, filter) and `GET /applications/:id` (detail)
- Audit log for every key action
- Frontend: registration form, key-reveal modal, app list/detail pages

## Deliverables
- Full NestJS module with controllers, services, DTOs, entities
- React pages: RegisterApp, AppList, AppDetail, KeyManagement
- Migration files
