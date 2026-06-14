import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @InjectDataSource('timescale')
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.createMetricsTable('metrics');
  }

  async ensureHypertable(
    tableName: string,
    timeColumn: string = 'time',
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `SELECT create_hypertable('${tableName}', '${timeColumn}', if_not_exists => true)`,
      );
      this.logger.log(`Hypertable ensured for ${tableName}`);
    } catch (err: any) {
      this.logger.warn(
        `Could not create hypertable for ${tableName}: ${err.message}`,
      );
    }
  }

  async insertMetric(
    tableName: string,
    data: {
      applicationId: string;
      metricName: string;
      value: number;
      labels?: Record<string, string>;
      time?: Date;
    },
  ): Promise<void> {
    const time = data.time || new Date();
    const labels = data.labels ? JSON.stringify(data.labels) : '{}';

    await this.dataSource.query(
      `INSERT INTO ${tableName} (time, application_id, metric_name, value, labels)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [time, data.applicationId, data.metricName, data.value, labels],
    );
  }

  async queryMetrics(
    tableName: string,
    filters: {
      applicationId?: string;
      metricName?: string;
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.applicationId) {
      conditions.push(`application_id = $${paramIndex++}`);
      params.push(filters.applicationId);
    }

    if (filters.metricName) {
      conditions.push(`metric_name = $${paramIndex++}`);
      params.push(filters.metricName);
    }

    if (filters.from) {
      conditions.push(`time >= $${paramIndex++}`);
      params.push(filters.from);
    }

    if (filters.to) {
      conditions.push(`time <= $${paramIndex++}`);
      params.push(filters.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;

    return this.dataSource.query(
      `SELECT * FROM ${tableName} ${where} ORDER BY time DESC LIMIT ${limit}`,
      params,
    );
  }

  async createMetricsTable(tableName: string): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        time TIMESTAMPTZ NOT NULL,
        application_id UUID NOT NULL,
        metric_name VARCHAR(255) NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        labels JSONB DEFAULT '{}'
      )
    `);

    await this.dataSource.query(`
      SELECT create_hypertable('${tableName}', 'time', if_not_exists => true)
    `);

    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_app_metric_time
      ON ${tableName} (application_id, metric_name, time DESC)
    `);

    this.logger.log(`Metrics table ${tableName} created and configured`);
  }
}
