export type LaunchPermissionKind = 'notifications' | 'photos' | 'camera';

export type LaunchPermissionState = 'undetermined' | 'determined';

export interface LaunchPermissionAdapter {
  readonly kind: LaunchPermissionKind;
  getState(): Promise<LaunchPermissionState>;
  request(): Promise<void>;
}

export type LaunchPermissionRequestResult = Readonly<{
  kind: LaunchPermissionKind;
  outcome: 'already-determined' | 'requested' | 'failed';
}>;

export interface LaunchPermissionRequester {
  requestPendingPermissions(): Promise<
    readonly LaunchPermissionRequestResult[]
  >;
}

export function createLaunchPermissionRequester(
  adapters: readonly LaunchPermissionAdapter[],
): LaunchPermissionRequester {
  return {
    async requestPendingPermissions() {
      const results: LaunchPermissionRequestResult[] = [];

      for (const adapter of adapters) {
        try {
          const state = await adapter.getState();
          if (state === 'undetermined') {
            await adapter.request();
            results.push({ kind: adapter.kind, outcome: 'requested' });
          } else {
            results.push({
              kind: adapter.kind,
              outcome: 'already-determined',
            });
          }
        } catch {
          results.push({ kind: adapter.kind, outcome: 'failed' });
        }
      }

      return results;
    },
  };
}
