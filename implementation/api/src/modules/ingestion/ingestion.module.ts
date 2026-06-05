import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { IngestionProcessor } from './processors/ingestion.processor';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiKey } from '../storage/entities/api-key.entity';
import { Application } from '../storage/entities/application.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'ingestion' }),
    TypeOrmModule.forFeature([ApiKey, Application]),
    RedisModule,
  ],
  controllers: [IngestionController],
  providers: [IngestionService, IngestionProcessor, ApiKeyGuard],
  exports: [IngestionService],
})
export class IngestionModule {}
