"use client";

import React, { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveDataProvider } from '@/contexts/LiveDataContext';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useNetwork } from '@/hooks/useNetwork';

export default function AppProviders({ children }: { children: ReactNode }) {
  const { selectedNetwork } = useNetwork();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
            staleTime: 15_000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <TimeRangeProvider>
          <LiveDataProvider key={selectedNetwork.apiParam} network={selectedNetwork.apiParam}>
            {children}
          </LiveDataProvider>
        </TimeRangeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
