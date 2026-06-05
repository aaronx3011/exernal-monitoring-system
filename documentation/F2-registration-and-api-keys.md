# F2 — Application Registration & API Key Management

> **Priority:** P0 (Phase 1) · **Primary engineering:** Backend, Frontend · **Depends on:** F1, F11

## Goal
A user opens the dashboard, registers an application by giving its name and health-check URL (plus a few options), and the platform generates an API key. The user pastes that key into the app; from then on the app can push data, and the platform begins probing the registered URL. This is the front door of the whole product.

## Why it matters
Everything downstream is keyed on a registered application: ingestion authenticates by key, probing targets the registered URL, tests attach to the app, notifications reference it. Registration is the identity anchor.

## Scope
- Application registry data model (org → application → keys).
- Registration form + API (name, base URL, health-check path, network type `public|private`, environment `prod|staging|...`, owner, tags).
- API key generation: cryptographically random, shown once, stored only as a hash.
- Key lifecycle: rotate, revoke, multiple active keys per app, last-used timestamp, scopes.
- Connectivity test on registration ("can we reach this URL right now?").
- App detail view linking out to the live URL and showing key status.

## Data model (Postgres)
- `organizations(id, name, created_at)`
- `applications(id, org_id, name, base_url, health_path, network_type, environment, owner, tags[], created_at, status)`
- `api_keys(id, application_id, key_hash, prefix, scopes[], created_at, last_used_at, revoked_at, label)`
- `audit_log(id, actor, action, target_type, target_id, metadata, created_at)`

> Store only `key_hash` (e.g. SHA-256/Argon2 of the secret) plus a short non-secret `prefix` for display/lookup. The full key is shown to the user exactly once.

## Implementation steps

1. **[Backend]** Define the schema + migrations for the tables above.
2. **[Backend]** Implement `POST /applications` (create) with DTO validation: URL format, unique name per org, network type enum.
3. **[Backend]** Implement key generation: generate 32+ bytes of CSPRNG entropy, format as `mk_<prefix>_<secret>`, hash and persist, return the plaintext once in the create-key response only.
4. **[Backend]** Implement key lifecycle endpoints: `POST /applications/:id/keys`, `POST /keys/:id/rotate`, `DELETE /keys/:id` (revoke). Record each in the audit log.
5. **[Backend]** Implement an on-demand connectivity check: server-side fetch of `base_url + health_path`, return reachability + latency + status code. For `private` apps, route the check through WireGuard (F5) — until F5 lands, mark private apps "reachability pending".
6. **[Backend]** Implement `GET /applications` (list, filter by env/tag/status) and `GET /applications/:id` (detail).
7. **[Frontend]** Build the registration form (name, URL, health path, network type, env, tags). Inline-validate the URL.
8. **[Frontend]** Build the "key created" modal that shows the secret once with a copy button and a clear "you won't see this again" warning, plus copy-paste config snippets (env var, SDK init — see F12).
9. **[Frontend]** Build the application list and detail pages: live link to the registered URL, current status badge, key table (prefix, label, last used, rotate/revoke actions).
10. **[Backend]** Emit audit-log entries for register/rotate/revoke and surface them in the detail view.

## Deliverables
- Registration + key-management API.
- Dashboard pages: register, list, detail, key management.
- One-time-reveal key flow with copyable integration snippets.

## Acceptance criteria
- Registering an app returns a key shown exactly once; refreshing the page never re-reveals it.
- The stored key is a hash — verified by inspecting the DB (no plaintext secret present).
- Revoking a key immediately causes ingestion (F3) to reject it.
- A public app's registration runs a live reachability check and shows latency + status.
- Every key action appears in the audit log.

## Risks & mitigations
- **Key leakage** → hash at rest, reveal once, support fast rotation/revocation, show last-used so stale keys are spotted.
- **Health-path assumptions vary per app** → make the path configurable per app rather than assuming `/health`.
