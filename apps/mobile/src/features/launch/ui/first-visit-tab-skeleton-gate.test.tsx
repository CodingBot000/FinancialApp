import { useEffect, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppText, Button } from '../../../shared/design-system';
import {
  FIRST_VISIT_SKELETON_DURATION_MS,
  isFirstVisitSkeletonTab,
} from '../model/tab-skeleton-config';
import { TabSkeletonSessionProvider } from '../model/tab-skeleton-session';
import { FirstVisitTabSkeletonGate } from './first-visit-tab-skeleton-gate';

function MountedContent({ onMount }: { readonly onMount: () => void }) {
  useEffect(onMount, [onMount]);
  return <AppText>실제 화면</AppText>;
}

function RemountHarness() {
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <Button onPress={() => setMounted((current) => !current)}>
        화면 전환
      </Button>
      {mounted ? (
        <FirstVisitTabSkeletonGate tabName="coach">
          <AppText>코치 화면</AppText>
        </FirstVisitTabSkeletonGate>
      ) : null}
    </>
  );
}

describe('FirstVisitTabSkeletonGate', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mounts real content immediately and removes the first skeleton after the configured duration', async () => {
    const onMount = vi.fn();
    const view = await render(
      <TabSkeletonSessionProvider>
        <FirstVisitTabSkeletonGate tabName="index">
          <MountedContent onMount={onMount} />
        </FirstVisitTabSkeletonGate>
      </TabSkeletonSessionProvider>,
    );

    expect(onMount).toHaveBeenCalledOnce();
    expect(
      view.getByRole('progressbar', { name: '화면을 준비하고 있어요.' }),
    ).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(FIRST_VISIT_SKELETON_DURATION_MS);
    });
    expect(view.queryByRole('progressbar')).toBeNull();
    expect(view.getByText('실제 화면')).toBeTruthy();
  });

  it('does not show the skeleton again after the same tab gate remounts', async () => {
    const view = await render(
      <TabSkeletonSessionProvider>
        <RemountHarness />
      </TabSkeletonSessionProvider>,
    );
    await act(async () => {
      vi.advanceTimersByTime(FIRST_VISIT_SKELETON_DURATION_MS);
    });

    await fireEvent.press(view.getByRole('button', { name: '화면 전환' }));
    await fireEvent.press(view.getByRole('button', { name: '화면 전환' }));

    expect(view.getByText('코치 화면')).toBeTruthy();
    expect(view.queryByRole('progressbar')).toBeNull();
  });

  it('shows the skeleton again with a new app-session provider', async () => {
    const first = await render(
      <TabSkeletonSessionProvider>
        <FirstVisitTabSkeletonGate tabName="order">
          <AppText>주문 화면</AppText>
        </FirstVisitTabSkeletonGate>
      </TabSkeletonSessionProvider>,
    );
    expect(first.getByRole('progressbar')).toBeTruthy();
    await first.unmount();

    const restarted = await render(
      <TabSkeletonSessionProvider>
        <FirstVisitTabSkeletonGate tabName="order">
          <AppText>주문 화면</AppText>
        </FirstVisitTabSkeletonGate>
      </TabSkeletonSessionProvider>,
    );
    expect(restarted.getByRole('progressbar')).toBeTruthy();
  });

  it('excludes the my-info tab from first-visit skeleton routing', () => {
    expect(isFirstVisitSkeletonTab('index')).toBe(true);
    expect(isFirstVisitSkeletonTab('market')).toBe(true);
    expect(isFirstVisitSkeletonTab('coach')).toBe(true);
    expect(isFirstVisitSkeletonTab('order')).toBe(true);
    expect(isFirstVisitSkeletonTab('me')).toBe(false);
  });
});
