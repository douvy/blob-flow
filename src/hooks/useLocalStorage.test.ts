import { act, renderHook } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  it('uses initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('reads initial value from localStorage', () => {
    localStorage.setItem('key', JSON.stringify('stored'));

    const { result } = renderHook(() => useLocalStorage('key', 'initial'));
    expect(result.current[0]).toBe('stored');
  });

  it('updates state and localStorage', () => {
    const { result } = renderHook(() => useLocalStorage<number>('count', 1));

    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(5);
    expect(localStorage.getItem('count')).toBe('5');
  });

  it('falls back to initial value on invalid JSON', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('bad', '{invalid-json');

    const { result } = renderHook(() => useLocalStorage('bad', 'fallback'));

    expect(result.current[0]).toBe('fallback');
    expect(errorSpy).toHaveBeenCalled();
  });
});
