"use client";

import React, { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveDataProvider } from '@/contexts/LiveDataContext';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useNetwork } from '@/hooks/useNetwork';

export default function AppProviders({ children }: { children: ReactNode }) {
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
          <NetworkScopedProviders>{children}</NetworkScopedProviders>
        </TimeRangeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Reads the selected network to scope live data. Kept separate so it runs
// inside QueryClientProvider, since useNetwork now fetches the network list.
function NetworkScopedProviders({ children }: { children: ReactNode }) {
  const { selectedNetwork } = useNetwork();

  return (
    <LiveDataProvider key={selectedNetwork.apiParam} network={selectedNetwork.apiParam}>
      {children}
    </LiveDataProvider>
  );
}
