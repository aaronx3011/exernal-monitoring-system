import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_PROVIDER } from '../redis/redis.module';
import { Application } from '../storage/entities/application.entity';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { MetricSampleDto } from './dto/metrics.dto';
import { EventDto } from './dto/events.dto';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectQueue('ingestion')
    private readonly ingestionQueue: Queue,
    @InjectRepository(Application)
    private readonly appRepository: Repository<Application>,
    @Inject(REDIS_PROVIDER)
    private readonly redis: Redis,
  ) {}

  async enqueueHeartbeat(applicationId: string, dto: HeartbeatDto, idempotencyKey?: string) {
    if (idempotencyKey) {
      const dedupKey = `dedup:heartbeat:${applicationId}:${idempotencyKey}`;
      const seen = await this.redis.set(dedupKey, '1', 'PX', 3600000, 'NX');
      if (!seen) {
        return { status: 200, message: 'Duplicate request (idempotency)' };
      }
    }

    await this.checkRateLimit(applicationId);

    await this.redis.set(`last_heartbeat:${applicationId}`, new Date().toISOString());

    await this.ingestionQueue.add('heartbeat', {
      type: 'heartbeat',
      applicationId,
      data: dto,
    });

    return { status: 202, message: 'Heartbeat enqueued' };
  }

  async enqueueMetrics(applicationId: string, metrics: MetricSampleDto[], idempotencyKey?: string) {
    if (idempotencyKey) {
      const dedupKey = `dedup:metrics:${applicationId}:${idempotencyKey}`;
      const seen = await this.redis.set(dedupKey, '1', 'PX', 3600000, 'NX');
      if (!seen) {
        return { status: 200, message: 'Duplicate request (idempotency)' };
      }
    }

    await this.checkRateLimit(applicationId);

    await this.ingestionQueue.add('metrics', {
      type: 'metrics',
      applicationId,
      data: metrics,
    });

    return { status: 202, message: 'Metrics enqueued' };
  }

  async enqueueEvents(applicationId: string, events: EventDto[], idempotencyKey?: string) {
    if (idempotencyKey) {
      const dedupKey = `dedup:events:${applicationId}:${idempotencyKey}`;
      const seen = await this.redis.set(dedupKey, '1', 'PX', 3600000, 'NX');
      if (!seen) {
        return { status: 200, message: 'Duplicate request (idempotency)' };
      }
    }

    await this.checkRateLimit(applicationId);

    await this.ingestionQueue.add('events', {
      type: 'events',
      applicationId,
      data: events,
    });

    return { status: 202, message: 'Events enqueued' };
  }

  private async checkRateLimit(applicationId: string) {
    const bucketKey = `ratelimit:${applicationId}`;
    const capacity = 100;
    const refillRate = 10;
    const now = Date.now();

    const bucket = await this.redis.get(bucketKey);
    let tokens: number;
    let lastRefill: number;

    if (bucket) {
      const parsed = JSON.parse(bucket);
      tokens = parsed.tokens;
      lastRefill = parsed.lastRefill;

      const elapsed = (now - lastRefill) / 1000;
      tokens = Math.min(capacity, tokens + elapsed * refillRate);
    } else {
      tokens = capacity;
      lastRefill = now;
    }

    if (tokens < 1) {
      const retryAfter = Math.ceil((1 - tokens) / refillRate);
      throw new HttpException(
        { status: 429, message: 'Rate limit exceeded', retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    tokens -= 1;
    await this.redis.set(bucketKey, JSON.stringify({ tokens, lastRefill: now }), 'PX', 60000);
  }

  async detectStaleApps() {
    const staleThreshold = 5 * 60 * 1000;
    const cutoff = new Date(Date.now() - staleThreshold);

    const apps = await this.appRepository.find({ where: { status: 'active' } });

    for (const app of apps) {
      const lastHeartbeat = await this.redis.get(`last_heartbeat:${app.id}`);
      if (!lastHeartbeat || new Date(lastHeartbeat) < cutoff) {
        app.status = 'degraded';
        await this.appRepository.save(app);
        this.logger.warn(`Application ${app.id} (${app.name}) marked degraded due to stale heartbeat`);
      }
    }
  }
}
