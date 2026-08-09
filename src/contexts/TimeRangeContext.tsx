"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DEFAULT_TIME_RANGE, type TimeRange } from '@/constants';
import { trackEvent } from '@/lib/analytics';

export type { TimeRange };

interface TimeRangeContextValue {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

const TimeRangeContext = createContext<TimeRangeContextValue>({
  timeRange: DEFAULT_TIME_RANGE,
  setTimeRange: () => {},
});

export function TimeRangeProvider({
  children,
  initialRange = DEFAULT_TIME_RANGE,
}: {
  children: ReactNode;
  initialRange?: TimeRange;
}) {
  const [range, setRange] = useState<TimeRange>(initialRange);

  // Reported from the render-scoped value rather than inside the state
  // updater, which Strict Mode invokes twice and would double count.
  const setTimeRange = (next: TimeRange) => {
    if (next !== range) {
      trackEvent('time-range-change', { range: next, previous: range });
    }
    setRange(next);
  };

  return (
    <TimeRangeContext.Provider value={{ timeRange: range, setTimeRange }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}
