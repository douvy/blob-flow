import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TimeRangeProvider, useTimeRange } from './TimeRangeContext';

function wrapper({ children }: { children: ReactNode }) {
  return <TimeRangeProvider>{children}</TimeRangeProvider>;
}

describe('TimeRangeProvider', () => {
  const track = vi.fn();

  beforeEach(() => {
    track.mockReset();
    window.umami = { track };
  });

  afterEach(() => {
    delete window.umami;
  });

  it('selects the new range and reports the one it replaced', () => {
    const { result } = renderHook(() => useTimeRange(), { wrapper });
    expect(result.current.timeRange).toBe('1h');

    act(() => result.current.setTimeRange('7d'));

    expect(result.current.timeRange).toBe('7d');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('time-range-change', { range: '7d', previous: '1h' });
  });

  it('reports nothing when the selected range is picked again', () => {
    const { result } = renderHook(() => useTimeRange(), { wrapper });

    act(() => result.current.setTimeRange('1h'));

    expect(result.current.timeRange).toBe('1h');
    expect(track).not.toHaveBeenCalled();
  });

  it('reports each step of a sequence exactly once', () => {
    const { result } = renderHook(() => useTimeRange(), { wrapper });

    act(() => result.current.setTimeRange('24h'));
    act(() => result.current.setTimeRange('30d'));

    expect(track.mock.calls).toEqual([
      ['time-range-change', { range: '24h', previous: '1h' }],
      ['time-range-change', { range: '30d', previous: '24h' }],
    ]);
  });
});
