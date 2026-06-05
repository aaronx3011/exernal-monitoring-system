# Monitoring Agent SDK

Lightweight TypeScript client SDK for the Centralized Monitoring Platform. Push heartbeats, metrics, and events from your Node.js application with zero production dependencies.

## Features

- **Heartbeats** — automatic periodic health signals with app version and uptime
- **Metrics** — counters and gauges with label support
- **Events** — structured log events (info, warn, error, fatal)
- **Batching** — metrics and events are buffered and flushed in batches
- **Retries** — exponential backoff with idempotency keys for safe retries
- **Fail‑open** — never blocks or crashes the host app
- **Bounded buffers** — oldest data is dropped when the buffer overflows
- **Non‑blocking** — all HTTP calls are fire-and-forget from the caller's perspective

## Quickstart

### 1. Install

```bash
npm install monitoring-agent-sdk
```

### 2. Create and start the client

```typescript
import { MonitoringClient } from 'monitoring-agent-sdk';

const monitor = new MonitoringClient({
  baseUrl: 'https://hub.your-org.com',
  apiKey: process.env.MONITORING_API_KEY!,
  appVersion: '1.0.0',
});

monitor.start();
```

### 3. See data flowing

Heartbeats are sent automatically every 30 seconds. Add a metric or event to confirm ingestion:

```typescript
monitor.metric('app.sessions_active', 42, { region: 'us-east-1' });
monitor.event('info', 'Client initialized successfully');
```

## API Reference

### `new MonitoringClient(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | — | Hub API base URL (required) |
| `apiKey` | `string` | — | API key for authentication (required) |
| `appVersion` | `string` | — | Semver string included in heartbeats |
| `heartbeatIntervalMs` | `number` | `30000` | How often to send heartbeats (0 to disable) |
| `flushIntervalMs` | `number` | `5000` | How often to flush buffered data (0 to disable) |
| `maxBufferSize` | `number` | `100` | Max queued metrics/events before dropping oldest |
| `maxRetries` | `number` | `3` | Max retry attempts per request |

### `client.start()`

Begins the automatic heartbeat and flush intervals. An initial heartbeat is sent immediately.

### `client.stop(): Promise<void>`

Stops intervals and flushes any remaining buffered data. Returns a promise that resolves when the final flush completes.

### `client.heartbeat(status, options?)`

Send an immediate heartbeat. If the flush interval is active the payload is queued; otherwise it is sent directly.

- `status`: `'up' | 'degraded' | 'down'`
- `options.version` — override app version
- `options.uptime_s` — process uptime in seconds
- `options.custom` — arbitrary key/value data

### `client.metric(name, value, labels?)`

Queue a metric sample.

- `name` — metric name (snake_case, namespaced — see conventions below)
- `value` — numeric value
- `labels` — optional key/value pairs

### `client.event(level, message, attributes?)`

Queue a structured event.

- `level`: `'info' | 'warn' | 'error' | 'fatal'`
- `message` — human-readable description
- `attributes` — optional structured data

### `client.flush(): Promise<void>`

Immediately send all buffered metrics and events to the hub.

## Configuration Options

| Environment Variable | SDK Option | Description |
|---------------------|------------|-------------|
| `MONITORING_URL` | `baseUrl` | Hub API URL |
| `MONITORING_API_KEY` | `apiKey` | Authentication key |
| `MONITORING_APP_VERSION` | `appVersion` | Application version |

## Metric Naming Conventions

- Use **snake_case** — e.g. `http_requests_total`, `db_query_duration_ms`
- **Namespace with the app name** — e.g. `auth.login_attempts`, `payments.checkout_duration`
- Use dots (`.`) as namespace separators
- Avoid generic names like `requests` or `errors` — prefer `api.requests.total` and `api.errors.total`
- Units should be included in the name or as a label, e.g. `response_time_ms` or `memory_bytes`

## Label Cardinality

Labels are powerful but can create an explosion of time series if misused. Follow these rules:

- **Keep distinct label values under 20** per metric
- Avoid labels that are unbounded: user IDs, email addresses, session tokens, request paths with dynamic segments
- Prefer low-cardinality labels: `region`, `datacenter`, `environment`, `method`, `status_class`
- Example of a good label set: `{ method: "GET", status_class: "2xx", region: "us-east-1" }`
- Example of a bad label set: `{ user_id: "abc-123", path: "/users/abc-123/profile" }`

## Error Handling

The SDK never throws during normal operation. Errors are logged via `console.warn`:

- **Authentication errors (401)** — logged once, no retry
- **Rate limiting (429)** — respects `Retry-After` header and retries
- **Network failures** — retried with exponential backoff (1s, 2s, 4s...)
- **Server errors (5xx)** — retried up to `maxRetries` times
- **Buffer overflow** — oldest data is silently dropped

```typescript
// Validation errors ARE thrown at construction time
try {
  const client = new MonitoringClient({ baseUrl: '', apiKey: '' });
} catch (err) {
  // ConfigurationError
}
```

## Examples

### Basic heartbeat loop

```typescript
const monitor = new MonitoringClient({
  baseUrl: 'https://hub.example.com',
  apiKey: 'sk-xxx',
});

monitor.start();

// The SDK handles periodic heartbeats automatically.
// You only need to call heartbeat() manually for ad-hoc status changes.
monitor.heartbeat('up', { uptime_s: process.uptime() });
```

### Custom metrics

```typescript
import { MonitoringClient } from 'monitoring-agent-sdk';

const monitor = new MonitoringClient({
  baseUrl: 'https://hub.example.com',
  apiKey: 'sk-xxx',
});

// Counter
monitor.metric('app.requests_total', 1, { endpoint: '/api/login' });

// Gauge
monitor.metric('app.memory_usage_mb', process.memoryUsage().heapUsed / 1024 / 1024);

// Histogram-style (send duration in ms)
const start = Date.now();
// ... do work ...
monitor.metric('app.query_duration_ms', Date.now() - start, { query: 'select_users' });
```

### Express app integration

See [`examples/express-app.ts`](./examples/express-app.ts) for a full Express integration.

```typescript
import express from 'express';
import { MonitoringClient } from 'monitoring-agent-sdk';

const app = express();
const monitor = new MonitoringClient({
  baseUrl: process.env.MONITORING_URL || 'https://hub.example.com',
  apiKey: process.env.MONITORING_API_KEY!,
  appVersion: '1.0.0',
});

monitor.start();

app.use((req, res, next) => {
  monitor.metric('http.requests_total', 1, { method: req.method, path: req.path });
  const start = Date.now();
  res.on('finish', () => {
    monitor.metric('http.request_duration_ms', Date.now() - start, {
      method: req.method,
      status: String(res.statusCode),
    });
  });
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const server = app.listen(3000);

process.on('SIGTERM', async () => {
  await monitor.stop();
  server.close();
  process.exit(0);
});
```

## Integration Recipes

### Node Exporter sidecar

For apps running on bare metal or VMs, run the [Prometheus Node Exporter](https://prometheus.io/docs/guides/node-exporter/) alongside your app:

```bash
# Run the exporter (default port 9100)
node_exporter --web.listen-address=":9100"

# Configure the hub to scrape this endpoint from the exporter
# The hub will pull node metrics (CPU, memory, disk, network) at the configured interval
```

### Prometheus federation pattern

If your app already exposes a Prometheus metrics endpoint, configure the hub to scrape it via federation:

```yaml
# hub scrape configuration
scrape_configs:
  - job_name: 'app-federated'
    scrape_interval: 15s
    metrics_path: '/metrics'
    scheme: https
    static_configs:
      - targets: ['app.internal:9090']
```

The hub's Prometheus-compatible ingestion endpoint can also be used as a `remote_write` target:

```yaml
remote_write:
  - url: 'https://hub.your-org.com/api/v1/prometheus/remote/write'
    authorization:
      credentials: 'sk-xxx'
```

### Uptime Kuma webhook

Configure [Uptime Kuma](https://github.com/louislam/uptime-kuma) to push heartbeats to the hub:

1. Create a **Monitor** → type **HTTP(s)**
2. URL: `https://hub.your-org.com/api/v1/heartbeat`
3. Request Method: `POST`
4. Headers:
   - `Authorization: Bearer sk-xxx`
   - `Content-Type: application/json`
5. Body (JSON):
   ```json
   {
     "status": "up",
     "version": "1.0.0",
     "uptime_s": 3600
   }
   ```
6. Set the check interval to match your heartbeat interval (default 30s)

## WireGuard peer setup for private apps

If your app runs in a private network without public ingress, set up a WireGuard tunnel for the hub to reach it:

```bash
# Install WireGuard
sudo apt install wireguard

# Generate keys
wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key

# Create config (replace placeholders with your hub's WireGuard settings)
cat > /etc/wireguard/wg0.conf << 'EOF'
[Interface]
PrivateKey = <app-private-key>
Address = 10.0.0.2/32
DNS = 10.0.0.1

[Peer]
PublicKey = <hub-public-key>
Endpoint = hub.your-org.com:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
EOF

# Start the tunnel
sudo wg-quick up wg0

# The hub can now scrape the app at 10.0.0.2:9090
```

Provide the app's public key to the hub operator so they can add it as a peer.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## License

MIT
