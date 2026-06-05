import { Injectable, Inject, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ProbingGateway } from './probing.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_PROVIDER } from '../redis/redis.module';
import { Application } from '../storage/entities/application.entity';
import { AuditLog } from '../storage/entities/audit-log.entity';
import { validateTargetUrl } from '../../common/middleware/ssrf-protection.middleware';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProbeConfigDto } from './dto/probe-config.dto';

export interface ProbeResult {
  reachable: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
}

@Injectable()
export class ProbingService implements OnModuleInit {
  private readonly logger = new Logger(ProbingService.name);

  constructor(
    @InjectQueue('probing')
    private readonly probingQueue: Queue,
    @InjectRepository(Application)
    private readonly appRepository: Repository<Application>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(REDIS_PROVIDER)
    private readonly redis: Redis,
    private readonly gateway: ProbingGateway,
  ) {}

  async onModuleInit() {
    await this.scheduleProbes();
  }

  async scheduleProbes() {
    const apps = await this.appRepository.find({ where: { status: 'active' } });

    for (const app of apps) {
      const interval = await this.redis.get(`probe:interval:${app.id}`);
      const intervalS = interval ? parseInt(interval, 10) : 60;

      await this.probingQueue.upsertJobScheduler(
        `probe:${app.id}`,
        { every: intervalS * 1000, immediately: false },
        { name: 'probe', data: { applicationId: app.id } },
      );
    }

    this.logger.log(`Scheduled probes for ${apps.length} applications`);
  }

  async getProbeConfig(appId: string, orgId: string) {
    const app = await this.appRepository.findOne({ where: { id: appId, orgId } });
    if (!app) throw new NotFoundException('Application not found');

    return {
      interval_s: parseInt(await this.redis.get(`probe:interval:${appId}`) || '60', 10),
      method: await this.redis.get(`probe:method:${appId}`) || 'GET',
      expected_status: parseInt(await this.redis.get(`probe:expected_status:${appId}`) || '200', 10),
      body_match: await this.redis.get(`probe:body_match:${appId}`) || null,
      timeout_ms: parseInt(await this.redis.get(`probe:timeout_ms:${appId}`) || '10000', 10),
      follow_redirects: (await this.redis.get(`probe:follow_redirects:${appId}`)) !== 'false',
      verify_tls: (await this.redis.get(`probe:verify_tls:${appId}`)) !== 'false',
    };
  }

  async updateProbeConfig(appId: string, orgId: string, dto: ProbeConfigDto) {
    const app = await this.appRepository.findOne({ where: { id: appId, orgId } });
    if (!app) throw new NotFoundException('Application not found');

    if (dto.interval_s) await this.redis.set(`probe:interval:${appId}`, String(dto.interval_s));
    if (dto.method) await this.redis.set(`probe:method:${appId}`, dto.method);
    if (dto.expected_status) await this.redis.set(`probe:expected_status:${appId}`, String(dto.expected_status));
    if (dto.body_match !== undefined) await this.redis.set(`probe:body_match:${appId}`, dto.body_match || '');
    if (dto.timeout_ms) await this.redis.set(`probe:timeout_ms:${appId}`, String(dto.timeout_ms));
    if (dto.follow_redirects !== undefined) await this.redis.set(`probe:follow_redirects:${appId}`, String(dto.follow_redirects));
    if (dto.verify_tls !== undefined) await this.redis.set(`probe:verify_tls:${appId}`, String(dto.verify_tls));

    await this.probingQueue.upsertJobScheduler(
      `probe:${appId}`,
      { every: dto.interval_s * 1000, immediately: false },
      { name: 'probe', data: { applicationId: appId } },
    );

    return { updated: true };
  }

  async executeProbe(applicationId: string): Promise<ProbeResult> {
    const app = await this.appRepository.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');

    const method = await this.redis.get(`probe:method:${applicationId}`) || 'GET';
    const timeoutMs = parseInt(await this.redis.get(`probe:timeout_ms:${applicationId}`) || '10000', 10);
    const expectedStatus = parseInt(await this.redis.get(`probe:expected_status:${applicationId}`) || '200', 10);
    const bodyMatch = await this.redis.get(`probe:body_match:${applicationId}`) || null;
    const followRedirects = (await this.redis.get(`probe:follow_redirects:${applicationId}`)) !== 'false';
    const verifyTls = (await this.redis.get(`probe:verify_tls:${applicationId}`)) !== 'false';

    const url = `${app.baseUrl.replace(/\/$/, '')}/${app.healthPath.replace(/^\//, '')}`;

    try {
      validateTargetUrl(url);
    } catch (err: any) {
      return { reachable: false, statusCode: null, latencyMs: 0, error: err.message };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method,
        signal: controller.signal,
        redirect: followRedirects ? 'follow' : 'manual',
        headers: { 'User-Agent': 'Monitoring-Probe/1.0' },
      } as any);
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;
      let bodyText: string | null = null;

      if (bodyMatch) {
        bodyText = await response.text();
      }

      const statusMatches = response.status === expectedStatus;
      const bodyMatches = bodyMatch ? (bodyText || '').includes(bodyMatch) : true;

      return {
        reachable: statusMatches && bodyMatches,
        statusCode: response.status,
        latencyMs,
        error: !statusMatches ? `Expected status ${expectedStatus}, got ${response.status}` : !bodyMatches ? `Body did not contain: ${bodyMatch}` : null,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        reachable: false,
        statusCode: null,
        latencyMs,
        error: err.name === 'AbortError' ? 'Request timed out' : err.message,
      };
    }
  }

  async storeProbeResult(applicationId: string, result: ProbeResult) {
    this.gateway.emitProbeEvent('probing:result', { applicationId, result, timestamp: new Date() });

    const now = new Date();
    const labels = JSON.stringify({ statusCode: result.statusCode, error: result.error });

    await this.dataSource.query(
      `INSERT INTO metrics (time, application_id, metric_name, value, labels)
       VALUES ($1, $2, 'probe_latency_ms', $3, $4::jsonb)`,
      [now, applicationId, result.latencyMs, labels],
    );

    await this.dataSource.query(
      `INSERT INTO metrics (time, application_id, metric_name, value, labels)
       VALUES ($1, $2, 'probe_up', $3, $4::jsonb)`,
      [now, applicationId, result.reachable ? 1 : 0, labels],
    );
  }

  async evaluateState(applicationId: string, result: ProbeResult) {
    const stateKey = `probe:state:${applicationId}`;
    const historyKey = `probe:history:${applicationId}`;

    const threshold = 3;
    await this.redis.lpush(historyKey, result.reachable ? '1' : '0');
    await this.redis.ltrim(historyKey, 0, threshold - 1);

    const history = await this.redis.lrange(historyKey, 0, threshold - 1);
    if (history.length < threshold) return;

    const allFailures = history.every((v) => v === '0');
    const allSuccess = history.every((v) => v === '1');

    const currentState = await this.redis.get(stateKey) || 'up';

    if (allFailures && currentState !== 'down') {
      await this.redis.set(stateKey, 'down');
      await this.emitStateChange(applicationId, currentState, 'down', result);
    } else if (allSuccess && currentState !== 'up' && currentState !== 'active') {
      await this.redis.set(stateKey, 'up');
      await this.emitStateChange(applicationId, currentState, 'up', result);
    } else if (!allFailures && !allSuccess && currentState === 'up') {
      await this.redis.set(stateKey, 'degraded');
      await this.emitStateChange(applicationId, 'up', 'degraded', result);
    }
  }

  private async emitStateChange(applicationId: string, oldState: string, newState: string, result: ProbeResult) {
    this.logger.warn(`Application ${applicationId} state change: ${oldState} -> ${newState}`);
    this.gateway.emitProbeEvent('probing:state', { applicationId, oldState, newState, latencyMs: result.latencyMs, error: result.error, timestamp: new Date() });

    const dbStatus = newState === 'up' ? 'active' : newState;
    await this.appRepository.update(applicationId, { status: dbStatus as any });

    await this.auditLogRepository.save({
      actor: 'system',
      action: `probe.state_change.${newState}`,
      targetType: 'application',
      targetId: applicationId,
      metadata: { oldState, newState, latencyMs: result.latencyMs, error: result.error },
    });
  }

  async triggerProbeNow(appId: string, orgId: string) {
    const app = await this.appRepository.findOne({ where: { id: appId, orgId } });
    if (!app) throw new NotFoundException('Application not found');

    const result = await this.executeProbe(appId);
    await this.storeProbeResult(appId, result);
    await this.evaluateState(appId, result);
    return result;
  }

  async calculateUptime(appId: string, orgId: string, period: string = '24h') {
    const app = await this.appRepository.findOne({ where: { id: appId, orgId } });
    if (!app) throw new NotFoundException('Application not found');

    const from = new Date(
      Date.now() - (
        period === '5m' ? 5 * 60 * 1000 :
        period === '30m' ? 30 * 60 * 1000 :
        period === '1h' ? 60 * 60 * 1000 :
        period === '6h' ? 6 * 60 * 60 * 1000 :
        period === '24h' ? 24 * 60 * 60 * 1000 :
        period === '7d' ? 7 * 24 * 60 * 60 * 1000 :
        period === '30d' ? 30 * 24 * 60 * 60 * 1000 :
        24 * 60 * 60 * 1000
      ),
    );

    const results = await this.dataSource.query(
      `SELECT value FROM metrics
       WHERE application_id = $1 AND metric_name = 'probe_up' AND time >= $2
       ORDER BY time DESC`,
      [appId, from],
    );

    if (results.length === 0) {
      return { uptime: null, totalSamples: 0, upSamples: 0, period };
    }

    const upSamples = results.filter((r: any) => r.value === 1).length;
    const uptime = Number(((upSamples / results.length) * 100).toFixed(2));

    return { uptime, totalSamples: results.length, upSamples, period };
  }
}
