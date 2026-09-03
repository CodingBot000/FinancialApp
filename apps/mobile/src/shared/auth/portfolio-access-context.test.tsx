import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import type { BiometricGate, BiometricGateResult } from './biometric-gate';
import {
  PortfolioAccessProvider,
  usePortfolioAccess,
} from './portfolio-access-context';

function AccessHarness() {
  const access = usePortfolioAccess();
  return (
    <>
      <Text>{access.state.phase}</Text>
      <Pressable
        accessibilityLabel="인증"
        accessibilityRole="button"
        onPress={() => void access.authenticate()}
      />
      <Pressable
        accessibilityLabel="잠금"
        accessibilityRole="button"
        onPress={access.lock}
      />
      <Pressable
        accessibilityLabel="초기화"
        accessibilityRole="button"
        onPress={() => void access.reset()}
      />
    </>
  );
}

describe('PortfolioAccessProvider', () => {
  it('unlocks only after an authenticated biometric result', async () => {
    const onReset = vi.fn().mockResolvedValue(undefined);
    const biometricGate: BiometricGate = {
      authenticate: vi.fn().mockResolvedValue({ status: 'authenticated' }),
    };
    const view = await render(
      <PortfolioAccessProvider biometricGate={biometricGate} onReset={onReset}>
        <AccessHarness />
      </PortfolioAccessProvider>,
    );

    expect(view.getByText('locked')).toBeTruthy();
    fireEvent.press(view.getByLabelText('인증'));
    expect(await view.findByText('unlocked')).toBeTruthy();
    expect(biometricGate.authenticate).toHaveBeenCalledOnce();
    fireEvent.press(view.getByLabelText('초기화'));
    expect(await view.findByText('locked')).toBeTruthy();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('keeps one native request in flight across repeated presses', async () => {
    let finish: ((result: BiometricGateResult) => void) | undefined;
    const biometricGate: BiometricGate = {
      authenticate: vi.fn(
        () =>
          new Promise<BiometricGateResult>((resolve) => {
            finish = resolve;
          }),
      ),
    };
    const view = await render(
      <PortfolioAccessProvider biometricGate={biometricGate}>
        <AccessHarness />
      </PortfolioAccessProvider>,
    );

    const button = view.getByLabelText('인증');
    fireEvent.press(button);
    fireEvent.press(button);
    expect(biometricGate.authenticate).toHaveBeenCalledOnce();

    finish?.({ status: 'authenticated' });
    expect(await view.findByText('unlocked')).toBeTruthy();
  });
});
