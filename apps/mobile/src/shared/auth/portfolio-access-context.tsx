import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type { BiometricGate, BiometricGateResult } from './biometric-gate';
import { createPortfolioBiometricGate } from './create-portfolio-biometric-gate';

export type PortfolioAccessPhase =
  'locked' | 'authenticating' | 'unlocked' | 'blocked';

export type PortfolioAccessState = Readonly<{
  lastResult: BiometricGateResult | undefined;
  phase: PortfolioAccessPhase;
}>;

export interface PortfolioAccess {
  readonly state: PortfolioAccessState;
  authenticate(): Promise<BiometricGateResult>;
  lock(): void;
  reset(): Promise<void>;
}

const initialState: PortfolioAccessState = {
  lastResult: undefined,
  phase: 'locked',
};

const PortfolioAccessContext = createContext<PortfolioAccess | undefined>(
  undefined,
);

export function PortfolioAccessProvider({
  biometricGate,
  children,
  onReset,
}: PropsWithChildren<{
  readonly biometricGate?: BiometricGate;
  readonly onReset?: () => Promise<void>;
}>) {
  const [defaultGate] = useState(createPortfolioBiometricGate);
  const activeGate = biometricGate ?? defaultGate;
  const [state, setState] = useState<PortfolioAccessState>(initialState);
  const stateRef = useRef<PortfolioAccessState>(initialState);
  const inFlightRef = useRef<Promise<BiometricGateResult> | undefined>(
    undefined,
  );
  const generationRef = useRef(0);

  const transition = useCallback((next: PortfolioAccessState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const authenticate = useCallback((): Promise<BiometricGateResult> => {
    if (stateRef.current.phase === 'unlocked') {
      return Promise.resolve({ status: 'authenticated' });
    }
    if (inFlightRef.current !== undefined) {
      return inFlightRef.current;
    }

    const generation = generationRef.current;
    transition({ lastResult: undefined, phase: 'authenticating' });

    const request = activeGate
      .authenticate()
      .catch((): BiometricGateResult => ({
        reason: 'system_error',
        status: 'reauthentication-required',
      }))
      .then((result) => {
        if (inFlightRef.current === request) {
          inFlightRef.current = undefined;
        }
        if (generation !== generationRef.current) {
          return { status: 'cancelled' } as const;
        }

        transition({
          lastResult: result,
          phase:
            result.status === 'authenticated'
              ? 'unlocked'
              : result.status === 'reauthentication-required'
                ? 'blocked'
                : 'locked',
        });
        return result;
      });

    inFlightRef.current = request;
    return request;
  }, [activeGate, transition]);

  const lock = useCallback(() => {
    generationRef.current += 1;
    transition(initialState);
  }, [transition]);

  const reset = useCallback(async () => {
    generationRef.current += 1;
    await onReset?.();
    transition(initialState);
  }, [onReset, transition]);

  const value = useMemo<PortfolioAccess>(
    () => ({ authenticate, lock, reset, state }),
    [authenticate, lock, reset, state],
  );

  return (
    <PortfolioAccessContext.Provider value={value}>
      {children}
    </PortfolioAccessContext.Provider>
  );
}

export function usePortfolioAccess() {
  const access = useContext(PortfolioAccessContext);
  if (access === undefined) {
    throw new Error(
      'usePortfolioAccess must be used within PortfolioAccessProvider',
    );
  }
  return access;
}

export function useOptionalPortfolioAccess() {
  return useContext(PortfolioAccessContext);
}
