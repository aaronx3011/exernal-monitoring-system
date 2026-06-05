import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProbingController } from './probing.controller';
import { ProbingService } from './probing.service';
import { ProbingProcessor } from './processors/probing.processor';
import { ProbingGateway } from './probing.gateway';
import { Application } from '../storage/entities/application.entity';
import { AuditLog } from '../storage/entities/audit-log.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'probing' }),
    TypeOrmModule.forFeature([Application, AuditLog]),
    RedisModule,
  ],
  controllers: [ProbingController],
  providers: [ProbingService, ProbingProcessor, ProbingGateway],
  exports: [ProbingService],
})
export class ProbingModule {}
