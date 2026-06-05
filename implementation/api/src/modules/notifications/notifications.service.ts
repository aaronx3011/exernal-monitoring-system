import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository, IsNull } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_PROVIDER } from '../redis/redis.module';
import { AlertRule } from '../storage/entities/alert-rule.entity';
import { AuditLog } from '../storage/entities/audit-log.entity';
import { Application } from '../storage/entities/application.entity';
import { WebhookChannelService } from './webhook/webhook-channel.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { SilenceDto } from './dto/silence.dto';
import { v4 as uuid } from 'uuid';

interface AlertEvent {
  type: string;
  applicationId: string;
  severity: string;
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
    @InjectRepository(AlertRule)
    private readonly alertRuleRepository: Repository<AlertRule>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @Inject(REDIS_PROVIDER)
    private readonly redis: Redis,
    private readonly webhookChannelService: WebhookChannelService,
  ) {}

  async evaluateRules(event: AlertEvent) {
    const rules = await this.alertRuleRepository.find({
      where: { enabled: true },
    });

    for (const rule of rules) {
      if (rule.applicationId && rule.applicationId !== event.applicationId) continue;

      const matches = this.matchRule(event, rule);
      if (!matches) continue;

      const alertId = await this.createAlert(event, rule);
      if (alertId) {
        await this.notificationsQueue.add('dispatch', {
          alertId,
          event,
          ruleId: rule.id,
        });
      }
    }
  }

  private matchRule(event: AlertEvent, rule: AlertRule): boolean {
    if (rule.conditionType === event.type) return true;

    const params = rule.parameters || {};
    if (params.eventType === event.type) return true;

    return false;
  }

  async createAlert(event: AlertEvent, rule: AlertRule): Promise<string | null> {
    const dedupKey = `alert:dedup:${rule.id}:${event.applicationId}:${event.type}`;
    const existing = await this.redis.get(dedupKey);

    if (existing) {
      this.logger.debug(`Alert already exists for dedup key ${dedupKey}`);
      return null;
    }

    const alertId = uuid();

    await this.redis.set(dedupKey, alertId, 'PX', 86400000);

    await this.auditLogRepository.save({
      actor: 'system',
      action: `alert.created.${event.severity}`,
      targetType: 'application',
      targetId: event.applicationId,
      metadata: {
        alertId,
        ruleId: rule.id,
        conditionType: rule.conditionType,
        severity: rule.severity,
        message: event.message,
        event,
      },
    });

    return alertId;
  }

  async resolveAlert(alertId: string) {
    const resolveKey = `alert:resolved:${alertId}`;
    await this.redis.set(resolveKey, new Date().toISOString(), 'PX', 86400000);

    await this.auditLogRepository.save({
      actor: 'system',
      action: 'alert.resolved',
      targetType: 'alert',
      targetId: alertId,
      metadata: { resolvedAt: new Date().toISOString() },
    });
  }

  async dispatch(alertId: string, event: AlertEvent, ruleId: string) {
    const rule = await this.alertRuleRepository.findOne({ where: { id: ruleId } });
    if (!rule) return;

    const throttleKey = `notify:throttle:${event.applicationId}:${rule.severity}`;
    const throttled = await this.redis.get(throttleKey);
    if (throttled) {
      this.logger.debug(`Notification throttled for ${event.applicationId}/${rule.severity}`);
      return;
    }

    await this.redis.set(throttleKey, '1', 'PX', 60000);

    const webhookUrl = await this.redis.get('notifications:webhook_url');
    if (!webhookUrl) {
      this.logger.warn('No webhook URL configured for notifications');
      return;
    }

    const webhookAuthToken = await this.redis.get('notifications:webhook_auth_token');
    const auth = webhookAuthToken ? { type: 'bearer' as const, token: webhookAuthToken } : undefined;

    const payload = {
      id: alertId,
      applicationId: event.applicationId,
      severity: rule.severity,
      conditionType: rule.conditionType,
      message: event.message,
      metadata: event.metadata || {},
      timestamp: new Date().toISOString(),
    };

    await this.webhookChannelService.send(webhookUrl, payload, auth);
  }

  async createAlertRule(dto: CreateAlertRuleDto) {
    const rule = this.alertRuleRepository.create({
      applicationId: dto.applicationId || null,
      conditionType: dto.conditionType,
      parameters: dto.parameters,
      severity: dto.severity as any,
      enabled: dto.enabled !== false,
    });
    return this.alertRuleRepository.save(rule);
  }

  async listAlertRules(applicationId?: string) {
    if (applicationId) {
      return this.alertRuleRepository.find({
        where: [{ applicationId }, { applicationId: IsNull() }],
        order: { createdAt: 'DESC' },
      });
    }
    return this.alertRuleRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateAlertRule(id: string, dto: Partial<CreateAlertRuleDto>) {
    const rule = await this.alertRuleRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Alert rule not found');

    if (dto.applicationId !== undefined) rule.applicationId = dto.applicationId || null;
    if (dto.conditionType !== undefined) rule.conditionType = dto.conditionType;
    if (dto.parameters !== undefined) rule.parameters = dto.parameters;
    if (dto.severity !== undefined) rule.severity = dto.severity as any;
    if (dto.enabled !== undefined) rule.enabled = dto.enabled;

    return this.alertRuleRepository.save(rule);
  }

  async deleteAlertRule(id: string) {
    const rule = await this.alertRuleRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Alert rule not found');
    return this.alertRuleRepository.remove(rule);
  }

  async getAlertTimeline() {
    const logs = await this.auditLogRepository.find({
      where: [
        { action: 'alert.created.critical' },
        { action: 'alert.created.warning' },
        { action: 'alert.created.info' },
        { action: 'alert.resolved' },
      ],
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return logs;
  }

  async sendTestNotification(webhookUrl?: string) {
    const url = webhookUrl || await this.redis.get('notifications:webhook_url');
    if (!url) {
      throw new NotFoundException('No webhook URL configured. Provide one in request body or set notifications:webhook_url in Redis.');
    }

    const payload = {
      id: uuid(),
      type: 'test',
      message: 'This is a test notification from the monitoring platform',
      timestamp: new Date().toISOString(),
    };

    const authToken = await this.redis.get('notifications:webhook_auth_token');
    const auth = authToken ? { type: 'bearer' as const, token: authToken } : undefined;

    return this.webhookChannelService.send(url, payload, auth);
  }

  async silenceRule(ruleId: string, dto: SilenceDto) {
    const rule = await this.alertRuleRepository.findOne({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Alert rule not found');

    const silenceKey = `silence:${ruleId}`;
    const silenceWindow = {
      startAt: dto.startAt,
      endAt: dto.endAt,
      reason: dto.reason,
    };

    await this.redis.set(silenceKey, JSON.stringify(silenceWindow), 'PX', 86400000 * 7);

    await this.auditLogRepository.save({
      actor: 'system',
      action: 'alert_rule.silenced',
      targetType: 'alert_rule',
      targetId: ruleId,
      metadata: silenceWindow,
    });

    return { silenced: true, ...silenceWindow };
  }
}
