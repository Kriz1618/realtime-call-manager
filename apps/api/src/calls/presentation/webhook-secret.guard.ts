import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(config: ConfigService) {
    this.expected = digest(config.getOrThrow<string>('WEBHOOK_SECRET'));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-webhook-secret') ?? '';
    // Hashing first gives both buffers equal length, which timingSafeEqual requires.
    if (!timingSafeEqual(digest(provided), this.expected)) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    return true;
  }
}
