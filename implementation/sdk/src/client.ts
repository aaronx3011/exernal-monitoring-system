import { ConfigurationError } from './errors';
import type {
  AppStatus,
  EventPayload,
  HeartbeatPayload,
  MetricSample,
  MonitoringClientOptions,
  MetricsBuffer,
  StatusResponse,
} from './types';

const DEFAULTS = {
  heartbeatIntervalMs: 30_000,
  flushIntervalMs: 5_000,
  maxBufferSize: 100,
  maxRetries: 3,
};

export class MonitoringClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly appVersion?: string;
  private readonly heartbeatIntervalMs: number;
  private readonly flushIntervalMs: number;
  private readonly maxBufferSize: number;
  private readonly maxRetries: number;

  private buffer: MetricsBuffer = { metrics: [], events: [] };
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(options: MonitoringClientOptions) {
    if (!options.baseUrl) {
      throw new ConfigurationError('baseUrl is required');
    }
    if (!options.apiKey) {
      throw new ConfigurationError('apiKey is required');
    }

    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.appVersion = options.appVersion;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULTS.heartbeatIntervalMs;
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULTS.flushIntervalMs;
    this.maxBufferSize = options.maxBufferSize ?? DEFAULTS.maxBufferSize;
    this.maxRetries = options.maxRetries ?? DEFAULTS.maxRetries;
  }

  start(): void {
    this.stopped = false;

    this.doHeartbeat();

    if (this.heartbeatIntervalMs > 0) {
      this.heartbeatTimer = setInterval(() => this.doHeartbeat(), this.heartbeatIntervalMs);
    }

    if (this.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    }
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();

    this.stopped = true;
  }

  heartbeat(status: AppStatus, options?: { version?: string; uptime_s?: number; custom?: Record<string, unknown> }): void {
    const payload: HeartbeatPayload = { status };
    if (options?.version) payload.version = options.version;
    if (options?.uptime_s !== undefined) payload.uptime_s = options.uptime_s;
    if (options?.custom) payload.custom = options.custom;

    this.enqueue(() => this.send('/api/v1/heartbeat', payload, 'POST'));
  }

  metric(name: string, value: number, labels?: Record<string, string>): void {
    const sample: MetricSample = { name, value, labels, ts: new Date().toISOString() };
    this.addToBuffer('metrics', sample);
  }

  event(level: EventPayload['level'], message: string, attributes?: Record<string, unknown>): void {
    const event: EventPayload = { level, message, attributes, ts: new Date().toISOString() };
    this.addToBuffer('events', event);
  }

  async flush(): Promise<void> {
    const buffer = this.buffer;
    this.buffer = { metrics: [], events: [] };

    const hasMetrics = buffer.metrics.length > 0;
    const hasEvents = buffer.events.length > 0;

    if (!hasMetrics && !hasEvents) return;

    const requests: Promise<void>[] = [];

    if (hasMetrics) {
      requests.push(this.send('/api/v1/metrics', buffer.metrics, 'POST'));
    }

    if (hasEvents) {
      requests.push(this.send('/api/v1/events', buffer.events, 'POST'));
    }

    await Promise.allSettled(requests);
  }

  private addToBuffer<T extends keyof MetricsBuffer>(type: T, item: MetricsBuffer[T][number]): void {
    const buf = this.buffer[type] as Array<typeof item>;
    if (buf.length >= this.maxBufferSize) {
      buf.shift();
    }
    buf.push(item);
  }

  private enqueue(fn: () => Promise<void>): void {
    fn().catch(() => {});
  }

  private async send(
    path: string,
    body: unknown,
    _method: string,
    idempotencyKey?: string,
  ): Promise<void> {
    const key = idempotencyKey ?? this.generateIdempotencyKey();
    const url = `${this.baseUrl}${path}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (this.stopped) return;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'Idempotency-Key': key,
          },
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000;
          await this.sleep(delayMs);
          continue;
        }

        if (response.status === 401) {
          console.warn('[monitoring-sdk] Authentication failed — check your API key');
          return;
        }

        if (!response.ok) {
          const res = (await response.json().catch(() => ({}))) as StatusResponse;
          lastError = new Error(res.message ?? `HTTP ${response.status}`);
          continue;
        }

        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    if (lastError) {
      console.warn('[monitoring-sdk] Request failed after retries:', lastError.message);
    }
  }

  private generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }

  private async doHeartbeat(): Promise<void> {
    const payload: HeartbeatPayload = {
      status: 'up',
      version: this.appVersion,
      uptime_s: process.uptime(),
    };
    await this.send('/api/v1/heartbeat', payload, 'POST', this.generateIdempotencyKey());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
