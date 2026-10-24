import type { SetCallSpamRequest } from '@rcm/contracts';
import { IsBoolean } from 'class-validator';

export class SetSpamDto implements SetCallSpamRequest {
  @IsBoolean()
  isSpam: boolean;
}
