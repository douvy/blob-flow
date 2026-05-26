import { act, renderHook, waitFor } from '@testing-library/react';
import { useApiData } from './useApiData';
import { createQueryWrapper } from '../test/queryClient';

describe('useApiData', () => {
  it('fetches data and updates state on success', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ value: 42 });

    const { result } = renderHook(() => useApiData(fetchFn, ['test', 'success']), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.error).toBeNull();
  });

  it('stores errors when fetch fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue('boom');

    const { result } = renderHook(() => useApiData(fetchFn, ['test', 'error']), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toBe('Unknown error occurred');
  });

  it('supports manual refetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue('ok');

    const { result } = renderHook(() => useApiData(fetchFn, ['test', 'refetch']), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('refetches when the query key changes', async () => {
    const fetchFn = vi.fn().mockResolvedValue('ok');

    const { rerender } = renderHook(
      ({ network }) => useApiData(() => fetchFn(network), ['network-keyed', network]),
      { initialProps: { network: 'mainnet' }, wrapper: createQueryWrapper() }
    );

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

    rerender({ network: 'mainnet' });
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    rerender({ network: 'sepolia' });
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    expect(fetchFn).toHaveBeenLastCalledWith('sepolia');
  });

  it('returns a stable refetch identity across renders', async () => {
    const fetchFn = vi.fn().mockResolvedValue('ok');

    const { result, rerender } = renderHook(() => useApiData(fetchFn, ['test', 'stable']), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const first = result.current.refetch;

    rerender();
    expect(result.current.refetch).toBe(first);
  });

  it('shares cache between subscribers with the same query key', async () => {
    const fetchFn = vi.fn().mockResolvedValue('shared');
    const wrapper = createQueryWrapper();

    const { result: a } = renderHook(() => useApiData(fetchFn, ['shared-key']), { wrapper });
    const { result: b } = renderHook(() => useApiData(fetchFn, ['shared-key']), { wrapper });

    await waitFor(() => expect(a.current.isLoading).toBe(false));
    await waitFor(() => expect(b.current.isLoading).toBe(false));

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(a.current.data).toBe('shared');
    expect(b.current.data).toBe('shared');
  });
});
