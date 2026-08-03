import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { resetChartViewParamsForTests } from '@/lib/chartViewUrl';
import { DEFAULT_TIME_RANGE, TimeRangeProvider, useTimeRange } from './TimeRangeContext';

function renderTimeRange() {
  return renderHook(() => useTimeRange(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <TimeRangeProvider>{children}</TimeRangeProvider>
    ),
  });
}

describe('TimeRangeProvider', () => {
  beforeEach(() => {
    resetChartViewParamsForTests();
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('defaults to 1h without a range param', () => {
    const { result } = renderTimeRange();
    expect(result.current.timeRange).toBe(DEFAULT_TIME_RANGE);
  });

  it('initializes from a valid ?range= param', () => {
    window.history.replaceState(null, '', '/charts/base-fee?range=7d');
    const { result } = renderTimeRange();
    expect(result.current.timeRange).toBe('7d');
  });

  it('caps ?range=all to 30d', () => {
    window.history.replaceState(null, '', '/charts/base-fee?range=all');
    const { result } = renderTimeRange();
    expect(result.current.timeRange).toBe('30d');
  });

  it('falls back silently to the default for an invalid param', () => {
    window.history.replaceState(null, '', '/charts/base-fee?range=2w');
    const { result } = renderTimeRange();
    expect(result.current.timeRange).toBe(DEFAULT_TIME_RANGE);
  });

  it('updates the range via setTimeRange', () => {
    const { result } = renderTimeRange();
    act(() => result.current.setTimeRange('30d'));
    expect(result.current.timeRange).toBe('30d');
  });

  function traverseTo(url: string) {
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  it('applies the range restored by a history traversal', () => {
    window.history.replaceState(null, '', '/charts/base-fee?range=7d');
    const { result } = renderTimeRange();
    expect(result.current.timeRange).toBe('7d');

    act(() => traverseTo('/charts/base-fee?range=24h'));
    expect(result.current.timeRange).toBe('24h');
  });

  it('lets a traversal override an earlier user selection', () => {
    window.history.replaceState(null, '', '/charts/base-fee?range=7d');
    const { result } = renderTimeRange();
    act(() => result.current.setTimeRange('30d'));

    act(() => traverseTo('/charts/base-fee?range=24h'));
    expect(result.current.timeRange).toBe('24h');
  });

  it('keeps the current view when a traversal has no range param', () => {
    window.history.replaceState(null, '', '/charts/base-fee?range=7d');
    const { result } = renderTimeRange();
    act(() => result.current.setTimeRange('30d'));

    act(() => traverseTo('/'));
    expect(result.current.timeRange).toBe('30d');
  });

  it('keeps the URL-seeded range when a traversal drops the params', () => {
    window.history.replaceState(null, '', '/charts/base-fee?range=7d');
    const { result } = renderTimeRange();

    act(() => traverseTo('/'));
    expect(result.current.timeRange).toBe('7d');
  });
});
