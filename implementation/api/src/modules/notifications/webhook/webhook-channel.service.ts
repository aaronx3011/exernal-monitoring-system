import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../storage/entities/audit-log.entity';

@Injectable()
export class WebhookChannelService {
  private readonly logger = new Logger(WebhookChannelService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async send(webhookUrl: string, payload: any, auth?: { type: 'bearer'; token: string }) {
    const maxRetries = 5;
    const delays = [1000, 2000, 4000, 8000, 16000];

    let lastError: string | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Monitoring-Notifications/1.0',
        };

        if (auth?.type === 'bearer' && auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });

        const responseBody = await response.text();

        await this.deliveryLog({
          webhookUrl,
          success: response.ok,
          statusCode: response.status,
          responseBody: responseBody.substring(0, 1000),
          attempt,
          payload: JSON.stringify(payload).substring(0, 500),
        });

        if (response.ok) {
          return { success: true, statusCode: response.status };
        }

        lastError = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;
      } catch (err: any) {
        lastError = err.message;
        this.logger.warn(`Webhook attempt ${attempt + 1}/${maxRetries + 1} failed: ${err.message}`);
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }

    await this.deliveryLog({
      webhookUrl,
      success: false,
      statusCode: null,
      responseBody: lastError || 'Unknown error',
      attempt: maxRetries,
      payload: JSON.stringify(payload).substring(0, 500),
    });

    this.logger.error(`Webhook delivery failed after ${maxRetries + 1} attempts: ${lastError}`);
    return { success: false, error: lastError };
  }

  private async deliveryLog(entry: {
    webhookUrl: string;
    success: boolean;
    statusCode: number | null;
    responseBody: string | null;
    attempt: number;
    payload: string;
  }) {
    await this.auditLogRepository.save({
      actor: 'system',
      action: entry.success ? 'webhook.delivered' : 'webhook.failed',
      targetType: 'webhook',
      targetId: null,
      metadata: {
        webhookUrl: entry.webhookUrl,
        success: entry.success,
        statusCode: entry.statusCode,
        responsePreview: (entry.responseBody || '').substring(0, 200),
        attempt: entry.attempt,
        payloadPreview: entry.payload.substring(0, 200),
      },
    });
  }
}
