import { act, renderHook, waitFor } from '@testing-library/react';
import { useApiData, usePaginatedApiData } from './useApiData';

describe('useApiData', () => {
  it('fetches data and updates state on success', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ value: 42 });

    const { result } = renderHook(() => useApiData(fetchFn));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.error).toBeNull();
  });

  it('stores errors when fetch fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue('boom');

    const { result } = renderHook(() => useApiData(fetchFn));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toBe('Unknown error occurred');
  });

  it('supports manual refetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue('ok');

    const { result } = renderHook(() => useApiData(fetchFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('usePaginatedApiData', () => {
  it('fetches with page and limit and supports pagination controls', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ items: [] });

    const { result } = renderHook(() => usePaginatedApiData(fetchFn, 'mainnet'));

    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith(1, 10, 'mainnet'));

    act(() => {
      result.current.pagination.nextPage();
    });
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith(2, 10, 'mainnet'));

    act(() => {
      result.current.pagination.prevPage();
    });
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith(1, 10, 'mainnet'));

    act(() => {
      result.current.pagination.goToPage(-5);
    });
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith(1, 10, 'mainnet'));

    act(() => {
      result.current.pagination.changeLimit(25);
    });
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith(1, 25, 'mainnet'));
  });
});
