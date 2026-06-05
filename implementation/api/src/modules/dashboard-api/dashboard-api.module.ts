import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardApiController } from './dashboard-api.controller';
import { Application } from '../storage/entities/application.entity';
import { TestRun } from '../storage/entities/test-run.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Application, TestRun])],
  controllers: [DashboardApiController],
})
export class DashboardApiModule {}
