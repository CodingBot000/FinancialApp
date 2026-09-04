import type { ForwardedRef, ReactNode } from 'react';
import { useState } from 'react';
import type * as ReactNative from 'react-native';
import type { ScrollViewProps } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativeSpies = vi.hoisted(() => ({ scrollTo: vi.fn() }));

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactNative>();
  const react = await import('react');
  const ScrollView = react.forwardRef(function MockScrollView(
    { children, ...props }: ScrollViewProps & { readonly children?: ReactNode },
    ref: ForwardedRef<{ scrollTo: (options: unknown) => void }>,
  ) {
    react.useImperativeHandle(ref, () => ({
      scrollTo: nativeSpies.scrollTo,
    }));
    return react.createElement('ScrollView', props, children);
  });
  return { ...actual, ScrollView };
});

import { AppText } from './app-text';
import { Button } from './button';
import { Screen, ScreenSafeAreaProvider } from './screen';

function StatefulContent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <AppText>상태 {count}</AppText>
      <Button onPress={() => setCount((current) => current + 1)}>
        상태 변경
      </Button>
    </>
  );
}

describe('Screen tab scroll reset', () => {
  beforeEach(() => nativeSpies.scrollTo.mockClear());

  it('resets scroll on a tab press without remounting screen content', async () => {
    const view = await render(
      <ScreenSafeAreaProvider includeTopInset={false} scrollResetRevision={0}>
        <Screen>
          <StatefulContent />
        </Screen>
      </ScreenSafeAreaProvider>,
    );
    await fireEvent.press(view.getByRole('button', { name: '상태 변경' }));
    expect(view.getByText('상태 1')).toBeTruthy();
    nativeSpies.scrollTo.mockClear();

    await view.rerender(
      <ScreenSafeAreaProvider includeTopInset={false} scrollResetRevision={1}>
        <Screen>
          <StatefulContent />
        </Screen>
      </ScreenSafeAreaProvider>,
    );

    expect(nativeSpies.scrollTo).toHaveBeenCalledOnce();
    expect(nativeSpies.scrollTo).toHaveBeenCalledWith({
      animated: false,
      y: 0,
    });
    expect(view.getByText('상태 1')).toBeTruthy();
  });

  it('does not reset a regular non-tab screen', async () => {
    await render(
      <Screen>
        <AppText>일반 화면</AppText>
      </Screen>,
    );

    expect(nativeSpies.scrollTo).not.toHaveBeenCalled();
  });
});
