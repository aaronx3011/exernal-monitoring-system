import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WebhookChannelService } from './webhook/webhook-channel.service';
import { AlertRule } from '../storage/entities/alert-rule.entity';
import { AuditLog } from '../storage/entities/audit-log.entity';
import { Application } from '../storage/entities/application.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }),
    TypeOrmModule.forFeature([AlertRule, AuditLog, Application]),
    RedisModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, WebhookChannelService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
