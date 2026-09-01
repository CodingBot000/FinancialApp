import { describe, expect, it, vi } from 'vitest';

import {
  createOnlineEventListener,
  installAppFocusListener,
  type AppStatePort,
  type NetworkPort,
} from './native-query-lifecycle';

describe('native query lifecycle', () => {
  it('reflects native app focus and removes its listener', () => {
    let listener: ((state: 'active' | 'background') => void) | undefined;
    const remove = vi.fn();
    const setFocused = vi.fn();
    const appState: AppStatePort = {
      addEventListener: (_type, nextListener) => {
        listener = nextListener;
        return { remove };
      },
      currentState: 'background',
    };

    const cleanup = installAppFocusListener({
      appState,
      isWeb: false,
      setFocused,
    });
    listener?.('active');
    cleanup();

    expect(setFocused).toHaveBeenNthCalledWith(1, false);
    expect(setFocused).toHaveBeenNthCalledWith(2, true);
    expect(remove).toHaveBeenCalledOnce();
  });

  it('uses the initial network state and ignores it after an event', async () => {
    let listener: ((state: { isConnected?: boolean }) => void) | undefined;
    const remove = vi.fn();
    const setOnline = vi.fn();
    const network: NetworkPort = {
      addNetworkStateListener: (nextListener) => {
        listener = nextListener;
        return { remove };
      },
      getNetworkStateAsync: async () => ({ isConnected: true }),
    };

    const cleanup = createOnlineEventListener(network)(setOnline);
    listener?.({ isConnected: false });
    await Promise.resolve();
    cleanup();

    expect(setOnline).toHaveBeenCalledOnce();
    expect(setOnline).toHaveBeenCalledWith(false);
    expect(remove).toHaveBeenCalledOnce();
  });
});
