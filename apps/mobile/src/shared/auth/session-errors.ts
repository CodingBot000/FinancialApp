export class SessionExpiredError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      'The local session expired and requires OIDC reauthentication.',
      options,
    );
    this.name = 'SessionExpiredError';
  }
}

export class SessionPersistenceError extends Error {
  constructor(options?: ErrorOptions) {
    super('The local session could not be stored securely.', options);
    this.name = 'SessionPersistenceError';
  }
}

export function requireToken(value: string, kind: 'access' | 'refresh') {
  if (value.trim().length === 0) {
    throw new TypeError(`${kind} token must not be empty`);
  }

  return value;
}
