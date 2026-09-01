import { requireToken } from './session-errors';

export interface AccessTokenStore {
  clear(): void;
  read(): string | undefined;
  write(token: string): void;
}

export class MemoryAccessTokenStore implements AccessTokenStore {
  private token: string | undefined;

  clear() {
    this.token = undefined;
  }

  read() {
    return this.token;
  }

  write(token: string) {
    this.token = requireToken(token, 'access');
  }
}
