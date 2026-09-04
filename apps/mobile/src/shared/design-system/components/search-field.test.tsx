import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchField } from './search-field';

describe('SearchField', () => {
  afterEach(cleanup);

  it('forwards both the keyboard action and the separate search button', async () => {
    const onSearch = vi.fn();
    const view = await render(
      <SearchField
        onChangeText={vi.fn()}
        onSearch={onSearch}
        value="삼성"
      />,
    );

    fireEvent(view.getByLabelText('종목명 또는 종목코드 검색'), 'submitEditing');
    fireEvent.press(view.getByRole('button', { name: '검색 실행' }));

    expect(onSearch).toHaveBeenCalledTimes(2);
  });
});
