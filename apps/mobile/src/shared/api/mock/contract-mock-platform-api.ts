import type { PlatformApi, PlatformHealthResponse } from '../platform-api';
import fixture from './fixtures/platform-health.success.json';

const platformHealthFixture = fixture as PlatformHealthResponse;

export class ContractMockPlatformApi implements PlatformApi {
  async getHealth(signal?: AbortSignal): Promise<PlatformHealthResponse> {
    signal?.throwIfAborted();
    return Promise.resolve(structuredClone(platformHealthFixture));
  }
}
