import { Controller, Post, Body, Headers, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { IngestionService } from './ingestion.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { MetricSampleDto } from './dto/metrics.dto';
import { EventDto } from './dto/events.dto';
import { ApiKeyGuard } from './guards/api-key.guard';

@ApiTags('Ingestion')
@Controller('ingest')
@UseGuards(ApiKeyGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('heartbeat')
  @ApiOperation({ summary: 'Push a heartbeat status update' })
  async ingestHeartbeat(
    @Body() dto: HeartbeatDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Req() req?: Request,
  ) {
    const applicationId = (req as any).application?.id;
    return this.ingestionService.enqueueHeartbeat(applicationId, dto, idempotencyKey);
  }

  @Post('metrics')
  @ApiOperation({ summary: 'Push metric samples' })
  async ingestMetrics(
    @Body() metrics: MetricSampleDto[],
    @Headers('idempotency-key') idempotencyKey?: string,
    @Req() req?: Request,
  ) {
    const applicationId = (req as any).application?.id;
    return this.ingestionService.enqueueMetrics(applicationId, metrics, idempotencyKey);
  }

  @Post('events')
  @ApiOperation({ summary: 'Push event logs' })
  async ingestEvents(
    @Body() events: EventDto[],
    @Headers('idempotency-key') idempotencyKey?: string,
    @Req() req?: Request,
  ) {
    const applicationId = (req as any).application?.id;
    return this.ingestionService.enqueueEvents(applicationId, events, idempotencyKey);
  }
}
