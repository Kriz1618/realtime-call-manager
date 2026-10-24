import { Body, Controller, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { RegisterCallResponse } from '@rcm/contracts';
import type { Response } from 'express';
import { RegisterIncomingCall } from '../application/register-incoming-call';
import { IncomingCallWebhookDto } from './dto/incoming-call-webhook.dto';
import { toCallDto } from '../call.mapper';
import { WebhookSecretGuard } from './webhook-secret.guard';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly registerIncomingCall: RegisterIncomingCall) {}

  @Post('calls')
  @UseGuards(WebhookSecretGuard)
  async receive(
    @Body() body: IncomingCallWebhookDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RegisterCallResponse> {
    const { call, duplicated } = await this.registerIncomingCall.execute(body);
    // Retries must get a success status, otherwise the sender keeps retrying.
    res.status(duplicated ? HttpStatus.OK : HttpStatus.CREATED);
    return { duplicated, call: toCallDto(call) };
  }
}
