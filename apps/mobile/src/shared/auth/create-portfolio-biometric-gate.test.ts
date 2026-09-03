import { describe, expect, it, vi } from 'vitest';

import type { BiometricGate } from './biometric-gate';
import { createPortfolioBiometricGate } from './create-portfolio-biometric-gate';

function gate(status: 'physical' | 'non-physical'): BiometricGate {
  return {
    authenticate: vi.fn().mockResolvedValue({
      status: status === 'physical' ? 'authenticated' : 'cancelled',
    }),
  };
}

describe('createPortfolioBiometricGate', () => {
  it('selects native biometrics on a physical device', async () => {
    const physicalGate = gate('physical');
    const nonPhysicalGate = gate('non-physical');
    const selected = createPortfolioBiometricGate({
      deviceRuntime: { isPhysicalDevice: () => true },
      nonPhysicalGate,
      physicalGate,
    });

    await expect(selected.authenticate()).resolves.toEqual({
      status: 'authenticated',
    });
    expect(physicalGate.authenticate).toHaveBeenCalledOnce();
    expect(nonPhysicalGate.authenticate).not.toHaveBeenCalled();
  });

  it('selects the local gate on an emulator, simulator, or web', async () => {
    const physicalGate = gate('physical');
    const nonPhysicalGate = gate('non-physical');
    const selected = createPortfolioBiometricGate({
      deviceRuntime: { isPhysicalDevice: () => false },
      nonPhysicalGate,
      physicalGate,
    });

    await expect(selected.authenticate()).resolves.toEqual({
      status: 'cancelled',
    });
    expect(nonPhysicalGate.authenticate).toHaveBeenCalledOnce();
    expect(physicalGate.authenticate).not.toHaveBeenCalled();
  });
});
