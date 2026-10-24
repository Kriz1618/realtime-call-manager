import { randomUUID } from 'node:crypto';
import { InvalidCallError } from './errors';
import { PhoneNumber } from './phone-number';

export interface NewCallInput {
  callId: string;
  phoneNumber: string;
  agent: string;
  durationSeconds: number;
  recordingUrl: string;
}

export interface CallProps {
  id: string;
  callId: string;
  phoneNumber: PhoneNumber;
  agent: string;
  durationSeconds: number;
  recordingUrl: string;
  isSpam: boolean;
  previousCallsCount: number;
  receivedAt: Date;
}

export class Call {
  private constructor(private readonly props: CallProps) {}

  static create(input: NewCallInput, previousCallsCount: number, now: Date): Call {
    const callId = input.callId.trim();
    const agent = input.agent.trim();

    if (!callId) throw new InvalidCallError('callId is required');
    if (!agent) throw new InvalidCallError('agent is required');
    if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 0) {
      throw new InvalidCallError('durationSeconds must be a non-negative integer');
    }
    if (!Number.isInteger(previousCallsCount) || previousCallsCount < 0) {
      throw new InvalidCallError('previousCallsCount must be a non-negative integer');
    }

    return new Call({
      id: randomUUID(),
      callId,
      phoneNumber: PhoneNumber.create(input.phoneNumber),
      agent,
      durationSeconds: input.durationSeconds,
      recordingUrl: Call.parseRecordingUrl(input.recordingUrl),
      isSpam: false,
      previousCallsCount,
      receivedAt: now,
    });
  }

  /** Rebuilds an existing call from persistence without re-running creation rules. */
  static restore(props: CallProps): Call {
    return new Call({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get callId(): string {
    return this.props.callId;
  }

  get phoneNumber(): PhoneNumber {
    return this.props.phoneNumber;
  }

  get isSpam(): boolean {
    return this.props.isSpam;
  }

  get isRepeatCaller(): boolean {
    return this.props.previousCallsCount > 0;
  }

  markAsSpam(): void {
    this.props.isSpam = true;
  }

  unmarkAsSpam(): void {
    this.props.isSpam = false;
  }

  toProps(): Readonly<CallProps> {
    return { ...this.props };
  }

  private static parseRecordingUrl(raw: string): string {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
      return url.toString();
    } catch {
      throw new InvalidCallError('recordingUrl must be a valid http(s) URL');
    }
  }
}
