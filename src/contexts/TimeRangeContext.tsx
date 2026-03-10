"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TimeRange = '24h' | '7d' | '30d' | 'All';

interface TimeRangeContextValue {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

const TimeRangeContext = createContext<TimeRangeContextValue>({
  timeRange: '24h',
  setTimeRange: () => {},
});

export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  return (
    <TimeRangeContext.Provider value={{ timeRange, setTimeRange }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}
