import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestingController } from './testing.controller';
import { TestingService } from './testing.service';
import { K6RunnerProcessor } from './processors/k6-runner.processor';
import { TestDefinition } from '../storage/entities/test-definition.entity';
import { TestRun } from '../storage/entities/test-run.entity';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'testing' }),
    TypeOrmModule.forFeature([TestDefinition, TestRun]),
  ],
  controllers: [TestingController],
  providers: [TestingService, K6RunnerProcessor],
  exports: [TestingService],
})
export class TestingModule {}
