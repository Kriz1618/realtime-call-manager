import { Body, Controller, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RegisterCallResponse } from '@rcm/contracts';
import type { Response } from 'express';
import { RegisterIncomingCall } from '../application/register-incoming-call';
import { IncomingCallWebhookDto } from './dto/incoming-call-webhook.dto';
import { toCallDto } from '../call.mapper';
import { WebhookSecretGuard } from './webhook-secret.guard';

@Controller('webhooks')
@ApiTags('webhooks')
export class WebhooksController {
  constructor(private readonly registerIncomingCall: RegisterIncomingCall) {}

  @Post('calls')
  @UseGuards(WebhookSecretGuard)
  @ApiHeader({
    name: 'X-Webhook-Secret',
    description: 'Shared secret configured by WEBHOOK_SECRET.',
    required: true,
    example: 'RcM_webhook_auth_cb93cb15cf',
  })
  @ApiOperation({ summary: 'Register an incoming call webhook' })
  @ApiCreatedResponse({ description: 'Call created; duplicated is false.' })
  @ApiOkResponse({ description: 'Call already existed; duplicated is true.' })
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
