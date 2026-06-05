# F9 — Dashboard & Visualization (React UI)

> **Priority:** P0 (Phase 1, iterated through Phase 3) · **Primary engineering:** Frontend, Design · **Depends on:** F2, F3, F4, F6, F7, F11

## Goal
The primary human interface: register applications, see fleet-wide and per-app status, explore metrics and logs, define and review k6 tests, and manage alerts. "A really nice dashboard" — clean, fast, and information-dense without being noisy.

## Why it matters
This is what you and your team look at every day and what makes the platform usable rather than a pile of APIs. The registration → key → monitor loop you described is a UI experience first.

## Scope (by version)
- **v1 (Phase 1):** auth/login, app registration flow, app list with live status, app detail (status, latency, uptime, registered link, keys).
- **v2 (Phase 3):** k6 test definition + run UI, run history/comparison, log explorer, alert timeline, notification settings.
- **Throughout:** embedded Grafana panels (F8) for deep metric dives.

## Key screens
1. **Fleet overview** — grid/list of all apps with status badge, uptime %, latency sparkline, last-seen; filter by env/tag/status; "X down" summary.
2. **Register application** — form (name, URL, health path, network type, env, tags) → one-time key reveal modal with copyable snippets (F2/F12).
3. **Application detail** — header with live link + status; tabs: Overview (uptime, latency, heartbeat), Metrics (charts + embedded Grafana), Logs (Loki-backed explorer), Tests (F6), Keys (F2), Settings (probe config, alert rules).
4. **Tests** — define/edit k6 tests, "run now", live run progress, historical runs, run-to-run comparison charts.
5. **Alerts** — timeline of state changes and notifications, current open incidents, per-app alert rules.
6. **Settings** — users, notification webhook config, retention display, org/tenant management (F11).

## Implementation steps

1. **[Design]** Information architecture + wireframes for the screens above; define the status taxonomy (up/degraded/down/unknown) and color system.
2. **[Frontend]** Scaffold React + TypeScript + Vite app; set up routing, auth guard (F11), API client, and a design system (shadcn/ui + Tailwind).
3. **[Frontend]** Build the fleet overview with live-updating status (polling or WebSocket/SSE) and filtering.
4. **[Frontend]** Build the registration flow and one-time key modal with copy-paste integration snippets.
5. **[Frontend]** Build app detail Overview + Metrics tabs (Recharts for native charts; embed Grafana panels for deep dives).
6. **[Frontend]** Build the Loki-backed log explorer (query, time range, level filter, tail).
7. **[Frontend]** Build the Tests UI (define, run-now with live progress, history, comparison) against F6 APIs.
8. **[Frontend]** Build the Alerts timeline and per-app alert-rule editor against F10.
9. **[Frontend]** Build Settings (users, webhook config, tenant management).
10. **[Frontend/Design]** Responsive polish, empty/loading/error states, accessibility pass.
11. **[QA]** E2E tests for the core loop: register → reveal key → see push data → see probe → define test → see alert.

## Deliverables
- React dashboard delivering the screens above, versioned v1 then v2.
- Embedded Grafana for deep metric exploration.
- E2E coverage of the core workflows.

## Acceptance criteria
- A user can register an app, copy the key from the one-time modal, and within minutes see both pushed data and probe results on the detail page.
- The fleet overview updates status without a manual refresh and filters correctly.
- The log explorer returns app logs filtered by level and time range.
- The Tests screen runs a k6 test on demand and shows live progress, then stores it in history.
- The Alerts timeline reflects real state transitions from F4/F6/F10.

## Risks & mitigations
- **Dashboard slowness at 100 apps** → server-side aggregation/materialized views (F7), pagination, and sparkline data pre-rolled rather than computed client-side.
- **Live updates overwhelming the browser** → SSE/WebSocket with batched/diffed updates and sensible polling fallbacks.
- **Scope creep in "nice dashboard"** → ship v1 lean, gate v2 features behind the phase plan.
