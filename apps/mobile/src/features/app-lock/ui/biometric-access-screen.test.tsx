import { render } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

import type { BiometricGate } from '../../../shared/auth/biometric-gate';
import { PortfolioAccessProvider } from '../../../shared/auth/portfolio-access-context';
import { BiometricAccessScreen } from './biometric-access-screen';

describe('BiometricAccessScreen', () => {
  it('automatically completes after device authentication succeeds', async () => {
    const onAuthenticated = vi.fn().mockResolvedValue(undefined);
    const biometricGate: BiometricGate = {
      authenticate: vi.fn().mockResolvedValue({ status: 'authenticated' }),
    };

    await render(
      <PortfolioAccessProvider biometricGate={biometricGate}>
        <BiometricAccessScreen mode="setup" onAuthenticated={onAuthenticated} />
      </PortfolioAccessProvider>,
    );

    await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(biometricGate.authenticate).toHaveBeenCalledOnce();
  });

  it('stays locked and offers retry after cancellation', async () => {
    const onAuthenticated = vi.fn();
    const biometricGate: BiometricGate = {
      authenticate: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    };
    const view = await render(
      <PortfolioAccessProvider biometricGate={biometricGate}>
        <BiometricAccessScreen
          mode="unlock"
          onAuthenticated={onAuthenticated}
        />
      </PortfolioAccessProvider>,
    );

    expect(await view.findByRole('alert')).toHaveTextContent(
      '생체인증이 취소되었습니다. 준비되면 다시 시도해 주세요.',
    );
    expect(
      view.getByRole('button', { name: '생체인증 다시 시도' }),
    ).toBeTruthy();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('does not finish when the local completion marker cannot be saved', async () => {
    const biometricGate: BiometricGate = {
      authenticate: vi.fn().mockResolvedValue({ status: 'authenticated' }),
    };
    const view = await render(
      <PortfolioAccessProvider biometricGate={biometricGate}>
        <BiometricAccessScreen
          mode="setup"
          onAuthenticated={vi.fn().mockRejectedValue(new Error('failed'))}
        />
      </PortfolioAccessProvider>,
    );

    expect(await view.findByRole('alert')).toHaveTextContent(
      '인증 완료 상태를 기기에 저장하지 못했습니다. 다시 시도해 주세요.',
    );
  });
});
