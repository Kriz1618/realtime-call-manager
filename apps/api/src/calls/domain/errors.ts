export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCallError extends DomainError {}
export class InvalidPhoneNumberError extends DomainError {}
export class CallNotFoundError extends DomainError {}
export class InvalidQueryError extends DomainError {}
