import type { AppStateStatus } from 'react-native';

export interface AppStatePort {
  readonly currentState: AppStateStatus;
  addEventListener(
    type: 'change',
    listener: (state: AppStateStatus) => void,
  ): { remove(): void };
}

export interface NetworkState {
  readonly isConnected?: boolean;
}

export interface NetworkPort {
  addNetworkStateListener(listener: (state: NetworkState) => void): {
    remove(): void;
  };
  getNetworkStateAsync(): Promise<NetworkState>;
}

export function installAppFocusListener({
  appState,
  isWeb,
  setFocused,
}: {
  readonly appState: AppStatePort;
  readonly isWeb: boolean;
  readonly setFocused: (focused: boolean) => void;
}) {
  if (isWeb) {
    return () => undefined;
  }

  setFocused(appState.currentState === 'active');
  const subscription = appState.addEventListener('change', (state) => {
    setFocused(state === 'active');
  });
  return () => subscription.remove();
}

export function createOnlineEventListener(network: NetworkPort) {
  return (setOnline: (online: boolean) => void) => {
    let receivedEvent = false;
    let active = true;
    const subscription = network.addNetworkStateListener((state) => {
      receivedEvent = true;
      setOnline(state.isConnected === true);
    });

    void network
      .getNetworkStateAsync()
      .then((state) => {
        if (active && !receivedEvent) {
          setOnline(state.isConnected === true);
        }
      })
      .catch(() => {
        // Preserve the last known state when a platform cannot read connectivity.
      });

    return () => {
      active = false;
      subscription.remove();
    };
  };
}
