import { Call, NewCallInput } from './call';
import { InvalidCallError, InvalidPhoneNumberError } from './errors';

const input: NewCallInput = {
  callId: 'c-10234',
  phoneNumber: '+573001234567',
  agent: 'agente-07',
  durationSeconds: 185,
  recordingUrl: 'https://grabaciones.ejemplo.com/c-10234.mp3',
};
const now = new Date('2026-10-23T12:00:00Z');

describe('Call', () => {
  it('is not a repeat caller when there are no previous calls', () => {
    const call = Call.create(input, 0, now);

    expect(call.isRepeatCaller).toBe(false);
    expect(call.isSpam).toBe(false);
    expect(call.toProps().receivedAt).toEqual(now);
  });

  it('is a repeat caller when the number called before', () => {
    expect(Call.create(input, 2, now).isRepeatCaller).toBe(true);
  });

  it('stores the phone number in E.164', () => {
    const call = Call.create({ ...input, phoneNumber: '+57 300 123 4567' }, 0, now);
    expect(call.phoneNumber.value).toBe('+573001234567');
  });

  it('can be marked and unmarked as spam, repeatedly', () => {
    const call = Call.create(input, 0, now);

    call.markAsSpam();
    call.markAsSpam();
    expect(call.isSpam).toBe(true);

    call.unmarkAsSpam();
    expect(call.isSpam).toBe(false);
  });

  it.each([
    ['empty callId', { callId: '  ' }],
    ['empty agent', { agent: '' }],
    ['negative duration', { durationSeconds: -1 }],
    ['fractional duration', { durationSeconds: 1.5 }],
    ['non-http recording url', { recordingUrl: 'ftp://x.com/a.mp3' }],
    ['malformed recording url', { recordingUrl: 'not a url' }],
  ])('rejects %s', (_label, override) => {
    expect(() => Call.create({ ...input, ...override }, 0, now)).toThrow(InvalidCallError);
  });

  it('rejects an invalid phone number', () => {
    expect(() => Call.create({ ...input, phoneNumber: '123' }, 0, now)).toThrow(
      InvalidPhoneNumberError,
    );
  });
});
