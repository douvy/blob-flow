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
  // A valid ?range= query param wins over the default, so a shared chart link
  // reproduces the range it was captured on; invalid values fall back
  // silently. The param acts as the default under any user selection rather
  // than as initial state because the URL store resolves right after
  // hydration and can change again on history traversal
  // (see useChartViewUrlParams).
  const urlParams = useChartViewUrlParams();
  const [selectedRange, setSelectedRange] = useState<TimeRange | null>(null);
  const [appliedParams, setAppliedParams] = useState(urlParams);

  // Render-phase reset when the URL store publishes new params (history
  // traversal, or a subscriber mounting after a navigation): a present range
  // takes over so the address bar and the charts cannot disagree, while an
  // absent one keeps the current view instead of resetting it to the default.
  if (urlParams !== appliedParams) {
    const currentRange = selectedRange ?? appliedParams.range ?? DEFAULT_TIME_RANGE;
    setAppliedParams(urlParams);
    setSelectedRange(urlParams.range ? null : currentRange);
  }

  const timeRange = selectedRange ?? urlParams.range ?? DEFAULT_TIME_RANGE;

  return (
    <TimeRangeContext.Provider value={{ timeRange, setTimeRange: setSelectedRange }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}
