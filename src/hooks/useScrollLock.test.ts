import { renderHook } from '@testing-library/react';
import useScrollLock from './useScrollLock';

describe('useScrollLock', () => {
  it('locks body scroll and restores on cleanup', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1180, configurable: true });

    const { unmount } = renderHook(() => useScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.paddingRight).toBe('20px');

    unmount();

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    expect(scrollSpy).toHaveBeenCalledWith(0, 120);
  });

  it('removes overflow and padding immediately when unlocked', () => {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '10px';

    renderHook(() => useScrollLock(false));

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.paddingRight).toBe('');
  });
});
