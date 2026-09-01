import { afterEach, describe, expect, it, vi } from 'vitest';

import { OutboxSchedulerService } from '../../src/modules/trading/application/outbox-scheduler.service.js';
import type { OutboxPublisher } from '../../src/modules/trading/application/ports/outbox-publisher.port.js';
import type { TradingRepository } from '../../src/modules/trading/application/ports/trading-repository.port.js';
import type { OutboxClaim } from '../../src/modules/trading/domain/trading-model.js';
import { LocalOutboxPublisher } from '../../src/modules/trading/infrastructure/persistence/local-outbox.publisher.js';

const claim: OutboxClaim = {
  eventId: '10000000-0000-4000-8000-000000000001',
  aggregateType: 'TRADE_ORDER',
  aggregateId: '20000000-0000-4000-8000-000000000001',
  eventType: 'ORDER_SETTLED',
  payload: { outcome: 'FILLED', syntheticData: true },
  attempt: 1,
  workerId: 'worker-a',
};

function repositoryMock(): TradingRepository {
  return {
    claimOutbox: vi
      .fn()
      .mockResolvedValueOnce(claim)
      .mockResolvedValue(undefined),
    completeOutbox: vi.fn(),
    rescheduleOutbox: vi.fn(),
    recordOutboxDelivery: vi.fn(),
  } as unknown as TradingRepository;
}

describe('Outbox scheduler', () => {
  afterEach(() => {
    delete process.env.OUTBOX_PUBLISHER_BATCH_SIZE;
    delete process.env.OUTBOX_PUBLISHER_BACKOFF_MS;
    delete process.env.OUTBOX_PUBLISHER_MAX_ATTEMPTS;
  });

  it('publishes a claimed event and marks it processed', async () => {
    const repository = repositoryMock();
    const publisher = {
      publish: vi.fn().mockResolvedValue('DELIVERED'),
    } as OutboxPublisher;
    const scheduler = new OutboxSchedulerService(repository, publisher);

    await scheduler.tick(new Date('2026-09-02T00:00:00.000Z'));

    expect(publisher.publish).toHaveBeenCalledWith(claim);
    expect(repository.completeOutbox).toHaveBeenCalledWith(
      claim,
      expect.any(Date),
    );
    expect(repository.rescheduleOutbox).not.toHaveBeenCalled();
  });

  it('reschedules a failed publication without retrying an external call inline', async () => {
    process.env.OUTBOX_PUBLISHER_BACKOFF_MS = '1000';
    process.env.OUTBOX_PUBLISHER_MAX_ATTEMPTS = '4';
    const repository = repositoryMock();
    const publisher = {
      publish: vi.fn().mockRejectedValue(new Error('sink unavailable')),
    } as OutboxPublisher;
    const scheduler = new OutboxSchedulerService(repository, publisher);
    const now = new Date('2026-09-02T00:00:00.000Z');

    await scheduler.tick(now);

    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(repository.completeOutbox).not.toHaveBeenCalled();
    expect(repository.rescheduleOutbox).toHaveBeenCalledWith(
      claim,
      'OUTBOX_PUBLISH_FAILED',
      new Date('2026-09-02T00:00:01.000Z'),
      4,
    );
  });

  it('uses the durable repository receipt as the local idempotency boundary', async () => {
    const repository = repositoryMock();
    vi.mocked(repository.recordOutboxDelivery).mockResolvedValue('DUPLICATE');
    const publisher = new LocalOutboxPublisher(repository);

    await expect(publisher.publish(claim)).resolves.toBe('DUPLICATE');
    expect(repository.recordOutboxDelivery).toHaveBeenCalledWith(
      claim,
      'finapp-local-settlement-v1',
    );
  });
});
