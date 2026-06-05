import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { Application } from './entities/application.entity';
import { ApiKey } from './entities/api-key.entity';
import { AuditLog } from './entities/audit-log.entity';
import { User } from './entities/user.entity';
import { TestDefinition } from './entities/test-definition.entity';
import { TestRun } from './entities/test-run.entity';
import { AlertRule } from './entities/alert-rule.entity';
import { StorageService } from './storage.service';

const entities = [
  Organization,
  Application,
  ApiKey,
  AuditLog,
  User,
  TestDefinition,
  TestRun,
  AlertRule,
];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  providers: [StorageService],
  exports: [TypeOrmModule, StorageService],
})
export class StorageModule {}
