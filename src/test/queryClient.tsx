import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createQueryWrapper(Wrapper?: React.ComponentType<{ children: React.ReactNode }>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    const content = Wrapper ? <Wrapper>{children}</Wrapper> : children;

    return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>;
  };
}
