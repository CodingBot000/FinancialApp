import { describe, expect, it, vi } from 'vitest';

import {
  createLaunchPermissionRequester,
  type LaunchPermissionAdapter,
  type LaunchPermissionKind,
  type LaunchPermissionState,
} from './launch-permission-requester';

function adapter(
  kind: LaunchPermissionKind,
  state: LaunchPermissionState,
  order: string[],
): LaunchPermissionAdapter {
  return {
    kind,
    getState: vi.fn(async () => {
      order.push(`get:${kind}`);
      return state;
    }),
    request: vi.fn(async () => {
      order.push(`request:${kind}`);
    }),
  };
}

describe('LaunchPermissionRequester', () => {
  it('requests only undetermined permissions in a stable sequence', async () => {
    const order: string[] = [];
    const notifications = adapter('notifications', 'undetermined', order);
    const photos = adapter('photos', 'determined', order);
    const camera = adapter('camera', 'undetermined', order);

    await expect(
      createLaunchPermissionRequester([
        notifications,
        photos,
        camera,
      ]).requestPendingPermissions(),
    ).resolves.toEqual([
      { kind: 'notifications', outcome: 'requested' },
      { kind: 'photos', outcome: 'already-determined' },
      { kind: 'camera', outcome: 'requested' },
    ]);
    expect(order).toEqual([
      'get:notifications',
      'request:notifications',
      'get:photos',
      'get:camera',
      'request:camera',
    ]);
  });

  it('continues after one permission adapter fails', async () => {
    const order: string[] = [];
    const notifications = adapter('notifications', 'undetermined', order);
    notifications.request = vi.fn(async () => {
      order.push('request:notifications');
      throw new Error('example native failure');
    });
    const camera = adapter('camera', 'undetermined', order);

    await expect(
      createLaunchPermissionRequester([
        notifications,
        camera,
      ]).requestPendingPermissions(),
    ).resolves.toEqual([
      { kind: 'notifications', outcome: 'failed' },
      { kind: 'camera', outcome: 'requested' },
    ]);
    expect(camera.request).toHaveBeenCalledOnce();
  });
});
