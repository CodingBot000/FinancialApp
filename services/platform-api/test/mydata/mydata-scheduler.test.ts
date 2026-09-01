import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IdentityRepository } from '../../src/modules/identity/application/ports/identity-repository.port.js';
import { MyDataSchedulerService } from '../../src/modules/mydata/application/mydata-scheduler.service.js';
import { MyDataService } from '../../src/modules/mydata/application/mydata.service.js';
import type { InstitutionPort } from '../../src/modules/mydata/application/ports/institution.port.js';
import type { MyDataRepository } from '../../src/modules/mydata/application/ports/mydata-repository.port.js';
import type { SensitiveDataPort } from '../../src/modules/mydata/application/ports/sensitive-data.port.js';

function repositoryMock(): MyDataRepository {
  return {
    createConnection: vi.fn(),
    listConnections: vi.fn(),
    createSync: vi.fn().mockResolvedValue({
      created: true,
      sync: { syncId: 'sync-1' },
    }),
    getSync: vi.fn(),
    beginSync: vi.fn(),
    completeSync: vi.fn(),
    rescheduleOrFailSync: vi.fn(),
    listDueConnections: vi.fn().mockResolvedValue([]),
    listDueSyncIds: vi.fn().mockResolvedValue([]),
    recoverStaleSyncs: vi.fn().mockResolvedValue(0),
  } as MyDataRepository;
}

describe('MyData scheduler and retry coordination', () => {
  afterEach(() => {
    delete process.env.MYDATA_SYNC_MAX_ATTEMPTS;
    delete process.env.MYDATA_SYNC_RETRY_BACKOFF_MS;
  });

  it('recovers stale leases, queues due connections, and runs due jobs', async () => {
    const repository = repositoryMock();
    vi.mocked(repository.listDueConnections).mockResolvedValue([
      { connectionId: 'connection-1', userId: 'user-1' },
    ]);
    vi.mocked(repository.listDueSyncIds).mockResolvedValue([
      'sync-1',
      'sync-2',
    ]);
    const myDataService = {
      runSync: vi.fn().mockResolvedValue(undefined),
    } as unknown as MyDataService;
    const scheduler = new MyDataSchedulerService(repository, myDataService);
    const now = new Date('2026-09-02T00:00:00.000Z');

    await scheduler.tick(now);

    expect(repository.recoverStaleSyncs).toHaveBeenCalledOnce();
    expect(repository.createSync).toHaveBeenCalledWith(
      'user-1',
      'connection-1',
    );
    expect(myDataService.runSync).toHaveBeenCalledTimes(2);
    expect(myDataService.runSync).toHaveBeenCalledWith('sync-1');
    expect(myDataService.runSync).toHaveBeenCalledWith('sync-2');
  });

  it('reschedules an institution failure using stable retry policy', async () => {
    process.env.MYDATA_SYNC_MAX_ATTEMPTS = '4';
    process.env.MYDATA_SYNC_RETRY_BACKOFF_MS = '1000';
    const repository = repositoryMock();
    vi.mocked(repository.beginSync).mockResolvedValue({
      connectionId: 'connection-1',
      userId: 'user-1',
      ciphertext: Buffer.from('ciphertext'),
      encryptionKeyVersion: 'test-v1',
    });
    const identityRepository = {
      provisionFromOidc: vi.fn(),
    } as IdentityRepository;
    const institution = {
      fetchDataset: vi.fn().mockRejectedValue(new Error('HTTP 500')),
    } as InstitutionPort;
    const sensitiveData = {
      encrypt: vi.fn(),
      decrypt: vi.fn().mockResolvedValue('synthetic-customer'),
      lookupHash: vi.fn(),
    } as SensitiveDataPort;
    const service = new MyDataService(
      identityRepository,
      repository,
      institution,
      sensitiveData,
    );

    await service.runSync('sync-1');

    expect(repository.rescheduleOrFailSync).toHaveBeenCalledWith(
      'sync-1',
      'MYDATA_INSTITUTION_SYNC_FAILED',
      4,
      expect.any(Date),
    );
  });
});
