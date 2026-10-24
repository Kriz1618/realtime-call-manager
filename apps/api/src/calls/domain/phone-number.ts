import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { InvalidPhoneNumberError } from './errors';

export class PhoneNumber {
  private constructor(readonly value: string) {}

  /** Parses user input; only international format ("+57...") is accepted. */
  static create(raw: string): PhoneNumber {
    const parsed = parsePhoneNumberFromString(raw.trim());
    if (!parsed?.isValid()) {
      throw new InvalidPhoneNumberError(`Invalid phone number: ${raw}`);
    }
    return new PhoneNumber(parsed.number);
  }

  /** Rebuilds from an already normalized value (e.g. read from the database). */
  static fromE164(value: string): PhoneNumber {
    return new PhoneNumber(value);
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
