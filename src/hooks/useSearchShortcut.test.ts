import { renderHook } from '@testing-library/react';
import useSearchShortcut from './useSearchShortcut';

describe('useSearchShortcut', () => {
  it('triggers callback on slash key outside inputs', () => {
    const callback = vi.fn();
    renderHook(() => useSearchShortcut(callback));

    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('ignores slash key inside input fields', () => {
    const callback = vi.fn();
    renderHook(() => useSearchShortcut(callback));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });
});
