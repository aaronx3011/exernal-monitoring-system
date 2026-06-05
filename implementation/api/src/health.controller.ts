import { Controller, Get, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get('healthz')
  healthz() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('readyz')
  async readyz() {
    let dbReady = false;
    try {
      await this.dataSource.query('SELECT 1');
      dbReady = true;
    } catch (err) {
      this.logger.error('Database health check failed', err as Error);
    }

    const isHealthy = dbReady;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      checks: {
        database: dbReady ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
