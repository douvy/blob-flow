"use client";

import React, { ReactNode } from 'react';
import { LiveDataProvider } from '@/contexts/LiveDataContext';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';
import { useNetwork } from '@/hooks/useNetwork';

export default function AppProviders({ children }: { children: ReactNode }) {
  const { selectedNetwork } = useNetwork();

  return (
    <TimeRangeProvider>
      <LiveDataProvider key={selectedNetwork.apiParam} network={selectedNetwork.apiParam}>
        {children}
      </LiveDataProvider>
    </TimeRangeProvider>
  );
}
