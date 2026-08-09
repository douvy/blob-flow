"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DEFAULT_TIME_RANGE, type TimeRange } from '@/constants';

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
  const [timeRange, setTimeRange] = useState<TimeRange>(initialRange);
  return (
    <TimeRangeContext.Provider value={{ timeRange, setTimeRange }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}
