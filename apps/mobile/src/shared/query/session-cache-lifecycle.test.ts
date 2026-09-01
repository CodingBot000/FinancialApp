import { describe, expect, it, vi } from 'vitest';

import type { SessionPresence } from '../auth/auth-session-manager';
import {
  installSessionCacheClear,
  type SessionPresencePort,
} from './session-cache-lifecycle';

class TestSession implements SessionPresencePort {
  private listener: (() => void) | undefined;
  private presence: SessionPresence = 'active';

  getSessionPresence() {
    return this.presence;
  }

  subscribeToSessionPresence(listener: () => void) {
    this.listener = listener;
    return () => (this.listener = undefined);
  }

  transitionTo(presence: SessionPresence) {
    this.presence = presence;
    this.listener?.();
  }
}

describe('session query cache lifecycle', () => {
  it('clears user-scoped cache only when the session becomes absent', () => {
    const session = new TestSession();
    const clear = vi.fn();
    const cleanup = installSessionCacheClear({ clear, session });

    session.transitionTo('unavailable');
    session.transitionTo('active');
    session.transitionTo('absent');

    expect(clear).toHaveBeenCalledOnce();
    cleanup();
    session.transitionTo('absent');
    expect(clear).toHaveBeenCalledOnce();
  });
});
