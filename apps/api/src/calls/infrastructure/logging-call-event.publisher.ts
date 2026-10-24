import { Injectable, Logger } from '@nestjs/common';
import type { Call } from '../domain/call';
import type { CallEventPublisher } from '../domain/ports/call-event-publisher';

@Injectable()
export class LoggingCallEventPublisher implements CallEventPublisher {
  private readonly logger = new Logger(LoggingCallEventPublisher.name);

  async callCreated(call: Call): Promise<void> {
    this.logger.log(`call.created ${call.callId}`);
  }

  async spamUpdated(call: Call): Promise<void> {
    this.logger.log(`call.spam_updated ${call.callId}`);
  }
}
