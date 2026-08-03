"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useChartViewUrlParams } from '@/lib/chartViewUrl';

export type TimeRange = '1h' | '24h' | '7d' | '30d';

export const DEFAULT_TIME_RANGE: TimeRange = '1h';

interface TimeRangeContextValue {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

const TimeRangeContext = createContext<TimeRangeContextValue>({
  timeRange: DEFAULT_TIME_RANGE,
  setTimeRange: () => {},
});

export function TimeRangeProvider({ children }: { children: ReactNode }) {
  // A valid ?range= query param wins over the default on load, so a shared
  // chart link reproduces the range it was captured on; invalid values fall
  // back silently. The param acts as the default under any user selection
  // rather than as initial state because it only resolves right after
  // hydration (see useChartViewUrlParams).
  const { range: urlRange } = useChartViewUrlParams();
  const [selectedRange, setSelectedRange] = useState<TimeRange | null>(null);
  const timeRange = selectedRange ?? urlRange ?? DEFAULT_TIME_RANGE;

  return (
    <TimeRangeContext.Provider value={{ timeRange, setTimeRange: setSelectedRange }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}
