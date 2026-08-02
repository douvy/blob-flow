import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRawBlobAvailability } from './useRawBlobAvailability';
import { fetchRawBlobStatus } from '../lib/api/rawBlob';

vi.mock('../lib/api/rawBlob', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/rawBlob')>();
  return { ...actual, fetchRawBlobStatus: vi.fn() };
});

const fetchRawBlobStatusMock = vi.mocked(fetchRawBlobStatus);

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRawBlobAvailability', () => {
  beforeEach(() => {
    fetchRawBlobStatusMock.mockReset();
  });

  it('resolves true for the archived network', async () => {
    fetchRawBlobStatusMock.mockResolvedValue({ enabled: true, network: 'mainnet' });

    const { result } = renderHook(() => useRawBlobAvailability('Mainnet'), { wrapper });

    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stays false for other networks and disabled deployments', async () => {
    fetchRawBlobStatusMock.mockResolvedValue({ enabled: true, network: 'mainnet' });
    const other = renderHook(() => useRawBlobAvailability('sepolia'), { wrapper });
    await waitFor(() => expect(fetchRawBlobStatusMock).toHaveBeenCalled());
    expect(other.result.current).toBe(false);

    fetchRawBlobStatusMock.mockResolvedValue({ enabled: false, network: '' });
    const disabled = renderHook(() => useRawBlobAvailability('mainnet'), { wrapper });
    await waitFor(() => expect(fetchRawBlobStatusMock).toHaveBeenCalledTimes(2));
    expect(disabled.result.current).toBe(false);
  });
});
