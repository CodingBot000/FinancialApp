import type { SessionPresence } from '../auth/auth-session-manager';

export interface SessionPresencePort {
  getSessionPresence(): SessionPresence;
  subscribeToSessionPresence(listener: () => void): () => void;
}

export function installSessionCacheClear({
  clear,
  session,
}: {
  readonly clear: () => void;
  readonly session: SessionPresencePort;
}) {
  return session.subscribeToSessionPresence(() => {
    if (session.getSessionPresence() === 'absent') {
      clear();
    }
  });
}
