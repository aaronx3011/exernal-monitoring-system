export type AppStatus = 'up' | 'degraded' | 'down';

export interface HeartbeatPayload {
  status: AppStatus;
  version?: string;
  uptime_s?: number;
  custom?: Record<string, unknown>;
}

export interface MetricSample {
  name: string;
  value: number;
  labels?: Record<string, string>;
  ts?: string;
}

export interface EventPayload {
  level: 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  attributes?: Record<string, unknown>;
  ts?: string;
}

export interface MonitoringClientOptions {
  baseUrl: string;
  apiKey: string;
  appVersion?: string;
  heartbeatIntervalMs?: number;
  maxBufferSize?: number;
  flushIntervalMs?: number;
  maxRetries?: number;
}

export interface MetricsBuffer {
  metrics: MetricSample[];
  events: EventPayload[];
}

export interface StatusResponse {
  success: boolean;
  data?: unknown;
  message?: string;
}
