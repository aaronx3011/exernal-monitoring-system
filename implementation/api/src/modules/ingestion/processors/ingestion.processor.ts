import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    @InjectDataSource()
    private readonly defaultDataSource: DataSource,
    @InjectDataSource('timescale')
    private readonly timescaleDataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { type, applicationId, data } = job.data;

    switch (type) {
      case 'heartbeat':
        return this.processHeartbeatBatch(applicationId, data);
      case 'metrics':
        return this.processMetricsBatch(applicationId, data);
      case 'events':
        return this.processEventsBatch(applicationId, data);
      default:
        this.logger.warn(`Unknown job type: ${type}`);
    }
  }

  private async processHeartbeatBatch(applicationId: string, data: any) {
    const { status, version, uptime_s, custom } = data;

    await this.timescaleDataSource.query(
      `INSERT INTO metrics (time, application_id, metric_name, value, labels)
       VALUES (NOW(), $1, 'heartbeat_status', 1, $2::jsonb)`,
      [applicationId, JSON.stringify({ status, version, uptime_s, custom: custom || {} })],
    );

    await this.defaultDataSource.query(
      `UPDATE applications SET status = $1 WHERE id = $2`,
      [status === 'up' ? 'active' : status, applicationId],
    );
  }

  private async processMetricsBatch(applicationId: string, samples: any[]) {
    for (const sample of samples) {
      const ts = sample.ts ? new Date(sample.ts) : new Date();
      const labels = sample.labels ? JSON.stringify(sample.labels) : '{}';

      await this.timescaleDataSource.query(
        `INSERT INTO metrics (time, application_id, metric_name, value, labels)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [ts, applicationId, sample.name, sample.value, labels],
      );
    }
  }

  private async processEventsBatch(applicationId: string, events: any[]) {
    for (const event of events) {
      const ts = event.ts ? new Date(event.ts) : new Date();
      const attributes = event.attributes ? JSON.stringify(event.attributes) : '{}';

      await this.timescaleDataSource.query(
        `INSERT INTO metrics (time, application_id, metric_name, value, labels)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [ts, applicationId, `event.${event.level}`, 1, JSON.stringify({ message: event.message, attributes })],
      );
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }
}
