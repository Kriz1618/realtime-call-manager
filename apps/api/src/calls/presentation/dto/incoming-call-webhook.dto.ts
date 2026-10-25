import type { IncomingCallWebhookPayload } from '@rcm/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class IncomingCallWebhookDto implements IncomingCallWebhookPayload {
  @ApiProperty({ example: 'call-01J9Z8Y7X6W5V4U3T2S1R0Q', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  callId: string;

  @ApiProperty({ example: '+573001234567', maxLength: 32 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phoneNumber: string;

  @ApiProperty({ example: 'agente-07', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  agent: string;

  @ApiProperty({ example: 90, minimum: 0 })
  @IsInt()
  @Min(0)
  durationSeconds: number;

  @ApiProperty({ example: 'http://127.0.0.1:5173/sample.mp3', maxLength: 2048 })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  recordingUrl: string;
}
