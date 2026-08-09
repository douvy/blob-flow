import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useDeepLinkedTimeRange } from './useDeepLinkedTimeRange';
import { TimeRangeProvider, useTimeRange } from '@/contexts/TimeRangeContext';
import { DEFAULT_TIME_RANGE } from '@/constants';

const searchParams = { value: new URLSearchParams() };

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams.value,
}));

function renderDeepLinked(initialQuery = '') {
  searchParams.value = new URLSearchParams(initialQuery);
  return renderHook(
    () => {
      useDeepLinkedTimeRange();
      return useTimeRange();
    },
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <TimeRangeProvider>{children}</TimeRangeProvider>
      ),
    }
  );
}

describe('useDeepLinkedTimeRange', () => {
  it('leaves the default in place without a range param', () => {
    const { result } = renderDeepLinked();
    expect(result.current.timeRange).toBe(DEFAULT_TIME_RANGE);
  });

  it('applies a valid range param', () => {
    const { result } = renderDeepLinked('range=7d');
    expect(result.current.timeRange).toBe('7d');
  });

  it('falls back silently to the default for an invalid param', () => {
    // 'all' is a valid backend range but not one the header offers, so it is
    // treated like any other unusable value rather than special-cased.
    expect(renderDeepLinked('range=all').result.current.timeRange).toBe(DEFAULT_TIME_RANGE);
    expect(renderDeepLinked('range=2w').result.current.timeRange).toBe(DEFAULT_TIME_RANGE);
    expect(renderDeepLinked('range=').result.current.timeRange).toBe(DEFAULT_TIME_RANGE);
  });

  it('lets a header change win over the param already applied', () => {
    const { result } = renderDeepLinked('range=7d');
    act(() => result.current.setTimeRange('30d'));
    expect(result.current.timeRange).toBe('30d');
  });

  it('re-applies when the URL changes to a new range', () => {
    const { result, rerender } = renderDeepLinked('range=7d');
    act(() => result.current.setTimeRange('30d'));

    // History traversal or in-app navigation swaps the param without a
    // remount; the view has to follow the address bar.
    searchParams.value = new URLSearchParams('range=24h');
    rerender();

    expect(result.current.timeRange).toBe('24h');
  });

  it('keeps the current range when a navigation drops the param', () => {
    const { result } = renderDeepLinked('range=7d');
    act(() => result.current.setTimeRange('30d'));

    searchParams.value = new URLSearchParams();
    act(() => {});

    expect(result.current.timeRange).toBe('30d');
  });
});
