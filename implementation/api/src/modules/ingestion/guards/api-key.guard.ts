import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKey } from '../../storage/entities/api-key.entity';
import { Application } from '../../storage/entities/application.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly keyRepository: Repository<ApiKey>,
    @InjectRepository(Application)
    private readonly appRepository: Repository<Application>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    const parts = token.split('_');
    if (parts.length < 3 || parts[0] !== 'mk') {
      throw new UnauthorizedException('Invalid API key format');
    }

    const prefix = parts[1];

    const keyRecord = await this.keyRepository.findOne({
      where: { prefix },
    });

    if (!keyRecord) {
      throw new UnauthorizedException('API key not found');
    }

    if (keyRecord.revokedAt && keyRecord.revokedAt <= new Date()) {
      throw new UnauthorizedException('API key has been revoked');
    }

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    if (hash !== keyRecord.keyHash) {
      throw new UnauthorizedException('Invalid API key');
    }

    const app = await this.appRepository.findOne({ where: { id: keyRecord.applicationId } });
    if (!app) {
      throw new UnauthorizedException('Application not found for this key');
    }

    request.application = app;
    request.apiKey = keyRecord;

    keyRecord.lastUsedAt = new Date();
    await this.keyRepository.save(keyRecord).catch((err) => {
      this.logger.warn(`Failed to update last_used_at for key ${keyRecord.id}: ${err.message}`);
    });

    return true;
  }
}
