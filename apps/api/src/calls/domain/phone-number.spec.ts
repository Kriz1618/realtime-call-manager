import { InvalidPhoneNumberError } from './errors';
import { PhoneNumber } from './phone-number';

describe('PhoneNumber', () => {
  it('normalizes different formats of the same number to E.164', () => {
    const a = PhoneNumber.create('+57 300 123 4567');
    const b = PhoneNumber.create('+573001234567');

    expect(a.value).toBe('+573001234567');
    expect(a.equals(b)).toBe(true);
  });

  it.each(['', 'abc', '3001234567', '+57'])('rejects %p', (raw) => {
    expect(() => PhoneNumber.create(raw)).toThrow(InvalidPhoneNumberError);
  });
});
