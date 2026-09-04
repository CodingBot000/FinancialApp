import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { describe, expect, it } from 'vitest';

import { SkeletonBlock, TabScreenSkeleton } from './skeleton';

describe('skeleton components', () => {
  it('exposes one accessible busy state and hides decorative blocks', async () => {
    const view = await render(<TabScreenSkeleton />);
    const progress = view.getByRole('progressbar', {
      name: '화면을 준비하고 있어요.',
    });

    expect(progress.props.accessibilityState).toEqual({ busy: true });
    expect(view.queryAllByRole('progressbar')).toHaveLength(1);
  });

  it('adapts a block using semantic height and relative width', async () => {
    const view = await render(
      <SkeletonBlock height="title" testID="adaptive-skeleton" width="50%" />,
    );
    const style = StyleSheet.flatten(
      view.getByTestId('adaptive-skeleton', { includeHiddenElements: true })
        .props.style,
    );

    expect(style.height).toBe(32);
    expect(style.width).toBe('50%');
  });
});
