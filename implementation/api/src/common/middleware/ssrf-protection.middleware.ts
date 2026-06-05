import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as net from 'net';

const BLOCKED_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '100.64.0.0/10',
  '198.18.0.0/15',
];

const BLOCKED_HOSTS = [
  '169.254.169.254',
  '100.100.100.200',
  'metadata.google.internal',
  'metadata.googleapis.com',
];

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  if (parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19) return true;

  return false;
}

export function validateTargetUrl(urlStr: string): void {
  const parsed = new URL(urlStr);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException(
      `SSRF protection: only http/https protocols allowed, got ${parsed.protocol}`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  const BLOCKED_HOSTS = [
    '169.254.169.254',
    '100.100.100.200',
    'metadata.google.internal',
    'metadata.googleapis.com',
  ];

  if (BLOCKED_HOSTS.includes(hostname)) {
    throw new BadRequestException(
      `SSRF protection: target host is blocked: ${hostname}`,
    );
  }

  if (process.env.NODE_ENV !== 'development') {
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      throw new BadRequestException(
        `SSRF protection: localhost targets are blocked`,
      );
    }

    if (net.isIPv4(hostname) && isPrivateIP(hostname)) {
      throw new BadRequestException(
        `SSRF protection: private IP targets are blocked: ${hostname}`,
      );
    }

    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      throw new BadRequestException(
        `SSRF protection: internal DNS targets are blocked: ${hostname}`,
      );
    }
  }
}

@Injectable()
export class SsrfProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SsrfProtectionMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV === 'development') {
      next();
      return;
    }

    const targetUrl = req.body?.url || req.query?.url || req.headers['x-target-url'];

    if (targetUrl) {
      const urlStr = typeof targetUrl === 'string' ? targetUrl : String(targetUrl);

      try {
        const parsed = new URL(urlStr);

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new BadRequestException(
            `SSRF protection: only http/https protocols allowed, got ${parsed.protocol}`,
          );
        }

        const hostname = parsed.hostname.toLowerCase();

        if (BLOCKED_HOSTS.includes(hostname)) {
          throw new BadRequestException(
            `SSRF protection: target host is blocked: ${hostname}`,
          );
        }

        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
          throw new BadRequestException(
            `SSRF protection: localhost targets are blocked`,
          );
        }

        if (net.isIPv4(hostname) && isPrivateIP(hostname)) {
          throw new BadRequestException(
            `SSRF protection: private IP targets are blocked: ${hostname}`,
          );
        }

        if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
          throw new BadRequestException(
            `SSRF protection: internal DNS targets are blocked: ${hostname}`,
          );
        }
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        this.logger.warn(`SSRF protection: could not parse URL: ${urlStr}`);
      }
    }

    next();
  }
}
