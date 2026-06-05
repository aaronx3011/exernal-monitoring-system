# F9 — Dashboard & Visualization Agent

**Builds:** React dashboard, fleet overview, app detail, log explorer, test UI, alerts UI  
**Depends on:** F2, F3, F4, F6, F7, F11

## Requirements
- React + TypeScript + Vite, shadcn/ui + Tailwind, Recharts
- Auth guard, routing, API client, design system
- Fleet overview: grid/list of apps, status badge, uptime %, latency sparkline, last-seen, filter by env/tag/status
- Register app form → one-time key reveal modal with copyable snippets
- App detail: header with live link + status, tabs (Overview, Metrics, Logs, Tests, Keys, Settings)
- Log explorer (Loki-backed): query, time range, level filter, tail
- Tests UI: define/edit k6 tests, run-now, live progress, history, comparison
- Alerts timeline: state changes, current incidents, per-app alert rules
- Settings: users, webhook config, retention display, org/tenant management
- Embedded Grafana panels for deep dives
- Responsive, error/loading/empty states, E2E tests

## Deliverables
- Full React app with all screens
- API client library
- Recharts-based charts
- Grafana embed integration
- E2E tests
