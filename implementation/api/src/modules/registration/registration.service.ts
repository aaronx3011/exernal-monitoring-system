import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Application } from '../storage/entities/application.entity';
import { ApiKey } from '../storage/entities/api-key.entity';
import { Organization } from '../storage/entities/organization.entity';
import { AuditLog } from '../storage/entities/audit-log.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateKeyDto } from './dto/create-key.dto';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @InjectRepository(Application)
    private readonly appRepository: Repository<Application>,
    @InjectRepository(ApiKey)
    private readonly keyRepository: Repository<ApiKey>,
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async createApp(dto: CreateApplicationDto, actorId: string, orgId?: string) {
    let targetOrgId = orgId;

    if (!targetOrgId) {
      const org = this.orgRepository.create({ name: `${dto.name} Org` });
      const savedOrg = await this.orgRepository.save(org);
      targetOrgId = savedOrg.id;
    }

    const existing = await this.appRepository.findOne({
      where: { name: dto.name, orgId: targetOrgId },
    });
    if (existing) {
      throw new ConflictException('Application with this name already exists in your organization');
    }

    const app = this.appRepository.create({
      name: dto.name,
      baseUrl: dto.baseUrl,
      healthPath: dto.healthPath || '/healthz',
      networkType: dto.networkType || 'public',
      environment: dto.environment || null,
      owner: dto.owner || null,
      tags: dto.tags || [],
      orgId: targetOrgId,
      status: 'active',
    });

    const savedApp = await this.appRepository.save(app);

    const { key, plaintext } = await this.generateKey(savedApp.id, 'default');

    await this.auditLogRepository.save({
      actor: actorId,
      action: 'application.created',
      targetType: 'application',
      targetId: savedApp.id,
      metadata: { name: savedApp.name, orgId: targetOrgId },
    });

    return {
      application: savedApp,
      apiKey: {
        id: key.id,
        prefix: key.prefix,
        label: key.label,
        createdAt: key.createdAt,
        plaintextKey: plaintext,
      },
    };
  }

  async listApplications(orgId: string, filters?: { environment?: string; tag?: string; status?: string }) {
    const query = this.appRepository.createQueryBuilder('app')
      .where('app.org_id = :orgId', { orgId });

    if (filters?.environment) {
      query.andWhere('app.environment = :env', { env: filters.environment });
    }
    if (filters?.tag) {
      query.andWhere(':tag = ANY(app.tags)', { tag: filters.tag });
    }
    if (filters?.status) {
      query.andWhere('app.status = :status', { status: filters.status });
    }

    return query.orderBy('app.created_at', 'DESC').getMany();
  }

  async getApplication(id: string, orgId: string) {
    const app = await this.appRepository.findOne({
      where: { id, orgId },
      relations: ['apiKeys'],
    });
    if (!app) {
      throw new NotFoundException('Application not found');
    }
    app.apiKeys = app.apiKeys.filter((k) => !k.revokedAt);
    return app;
  }

  async generateKey(applicationId: string, label?: string) {
    const app = await this.appRepository.findOne({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const rawBytes = crypto.randomBytes(32);
    const secretBase64 = rawBytes.toString('base64url');
    const prefixBytes = crypto.randomBytes(4);
    const prefix = prefixBytes.toString('base64url');
    const plaintext = `mk_${prefix}_${secretBase64}`;

    const hash = crypto.createHash('sha256').update(plaintext).digest('hex');

    const key = this.keyRepository.create({
      applicationId,
      keyHash: hash,
      prefix,
      label: label || null,
      scopes: [],
    });

    const saved = await this.keyRepository.save(key);

    return { key: saved, plaintext };
  }

  async rotateKey(keyId: string, actorId: string) {
    const key = await this.keyRepository.findOne({ where: { id: keyId }, relations: ['application'] });
    if (!key) {
      throw new NotFoundException('API key not found');
    }

    key.revokedAt = new Date();
    await this.keyRepository.save(key);

    const { key: newKey, plaintext } = await this.generateKey(key.applicationId, key.label || undefined);

    await this.auditLogRepository.save({
      actor: actorId,
      action: 'api_key.rotated',
      targetType: 'api_key',
      targetId: keyId,
      metadata: { newKeyId: newKey.id, applicationId: key.applicationId },
    });

    return { key: newKey, plaintext };
  }

  async revokeKey(keyId: string, actorId: string) {
    const key = await this.keyRepository.findOne({ where: { id: keyId } });
    if (!key) {
      throw new NotFoundException('API key not found');
    }

    key.revokedAt = new Date();
    await this.keyRepository.save(key);

    await this.auditLogRepository.save({
      actor: actorId,
      action: 'api_key.revoked',
      targetType: 'api_key',
      targetId: keyId,
      metadata: { applicationId: key.applicationId },
    });

    return { revoked: true };
  }

  async deleteApplication(appId: string, orgId: string, actorId: string) {
    const app = await this.appRepository.findOne({
      where: { id: appId, orgId },
      relations: ['apiKeys'],
    });
    if (!app) throw new NotFoundException('Application not found');

    await this.keyRepository.delete({ applicationId: appId });
    await this.appRepository.remove(app);

    await this.auditLogRepository.save({
      actor: actorId,
      action: 'application.deleted',
      targetType: 'application',
      targetId: appId,
      metadata: { name: app.name },
    });
  }

  async checkConnectivity(appId: string, orgId: string) {
    const app = await this.appRepository.findOne({ where: { id: appId, orgId } });
    if (!app) {
      throw new NotFoundException('Application not found');
    }

    if (app.networkType === 'private') {
      return { reachable: false, statusCode: null, latencyMs: null, error: 'Reachability check pending for private applications' };
    }

    const url = `${app.baseUrl.replace(/\/$/, '')}/${app.healthPath.replace(/^\//, '')}`;

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'manual',
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      return {
        reachable: true,
        statusCode: response.status,
        latencyMs,
        error: null,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        reachable: false,
        statusCode: null,
        latencyMs,
        error: err.name === 'AbortError' ? 'Request timed out after 10s' : err.message,
      };
    }
  }
}
