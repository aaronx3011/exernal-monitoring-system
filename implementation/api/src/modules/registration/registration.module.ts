import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { Application } from '../storage/entities/application.entity';
import { ApiKey } from '../storage/entities/api-key.entity';
import { Organization } from '../storage/entities/organization.entity';
import { AuditLog } from '../storage/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, ApiKey, Organization, AuditLog]),
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService],
  exports: [RegistrationService],
})
export class RegistrationModule {}
