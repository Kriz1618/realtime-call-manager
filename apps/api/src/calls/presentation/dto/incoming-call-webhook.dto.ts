import type { IncomingCallWebhookPayload } from '@rcm/contracts';
import { IsInt, IsNotEmpty, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class IncomingCallWebhookDto implements IncomingCallWebhookPayload {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  callId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agent: string;

  @IsInt()
  @Min(0)
  durationSeconds: number;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  recordingUrl: string;
}
