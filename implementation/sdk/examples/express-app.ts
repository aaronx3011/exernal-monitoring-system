import { MonitoringClient } from 'monitoring-agent-sdk';

const monitor = new MonitoringClient({
  baseUrl: process.env.MONITORING_URL || 'https://app.example.com',
  apiKey: process.env.MONITORING_API_KEY!,
  appVersion: '1.0.0',
});

monitor.start();

// Send heartbeat on each request
app.use((req, res, next) => {
  monitor.metric('http.requests_total', 1, { method: req.method, path: req.path });
  next();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await monitor.stop();
  process.exit(0);
});
