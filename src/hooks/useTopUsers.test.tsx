import { act, renderHook } from '@testing-library/react';
import { useApiData } from './useApiData';
import { useTopUsers } from './useTopUsers';
import { BackendUsersRange, TopUsersResponse, UsersUpdateEvent } from '../types';

let usersUpdateHandler: ((event: UsersUpdateEvent) => void) | undefined;

vi.mock('./useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('../contexts/LiveDataContext', () => ({
  useLiveBlobEvent: vi.fn((eventType: unknown, handler: unknown) => {
    if (eventType === 'users_update') {
      usersUpdateHandler = handler as (event: UsersUpdateEvent) => void;
    }
  }),
}));

const restData: TopUsersResponse = {
  data: [
    {
      id: 1,
      name: 'Arbitrum',
      address: '0x1111111111111111111111111111111111111111',
      attributed: true,
      dataCount: 6,
      percentage: 60,
      totalCostEth: '0.6',
      lastTimestamp: '2026-01-01T00:00:00.000Z',
    },
  ],
  hasServerShares: true,
};

function liveEvent(range: UsersUpdateEvent['range']): UsersUpdateEvent {
  return {
    type: 'users_update',
    range,
    data: [
      {
        network_id: 1,
        address: '0x3333333333333333333333333333333333333333',
        name: 'Optimism',
        blob_count: 9,
        total_cost_eth: '0.9',
        last_timestamp: '2026-01-01T00:01:00.000Z',
        blob_share_percent: 45,
      },
    ],
  };
}

function mockRest(overrides: {
  data?: TopUsersResponse;
  error?: Error | null;
  dataUpdatedAt?: number;
} = {}) {
  vi.mocked(useApiData<TopUsersResponse>).mockReturnValue({
    data: 'data' in overrides ? overrides.data : restData,
    isLoading: false,
    error: overrides.error ?? null,
    dataUpdatedAt: overrides.dataUpdatedAt,
    refetch: vi.fn(),
  });
}

function renderTopUsers(initialRange: BackendUsersRange = '1h') {
  return renderHook(({ range }: { range: BackendUsersRange }) => useTopUsers(10, 'mainnet', range), {
    initialProps: { range: initialRange },
  });
}

describe('useTopUsers', () => {
  beforeEach(() => {
    usersUpdateHandler = undefined;
    mockRest();
  });

  it('fetches through the shared range-scoped cache key', () => {
    renderTopUsers('7d');

    expect(vi.mocked(useApiData)).toHaveBeenCalledWith(
      expect.any(Function),
      ['top-users', 'mainnet', 10, '7d']
    );
  });

  it('overlays a live snapshot that is newer than the REST fetch', () => {
    mockRest({ dataUpdatedAt: 1000 });
    const { result } = renderTopUsers();

    expect(result.current.data?.data[0].name).toBe('Arbitrum');

    act(() => {
      usersUpdateHandler?.(liveEvent('1h'));
    });

    expect(result.current.data?.data[0].name).toBe('Optimism');
  });

  it('lets a REST fetch newer than the snapshot win, so refetches replace live rows', () => {
    // A reconnect invalidation or post-staleness remount lands after the last
    // event; the snapshot must not pin older rows on screen.
    mockRest({ dataUpdatedAt: Date.now() + 60_000 });
    const { result } = renderTopUsers();

    act(() => {
      usersUpdateHandler?.(liveEvent('1h'));
    });

    expect(result.current.data?.data[0].name).toBe('Arbitrum');
  });

  it('ignores events scoped to a different range', () => {
    const { result } = renderTopUsers();

    act(() => {
      usersUpdateHandler?.(liveEvent('24h'));
    });

    expect(result.current.data?.data[0].name).toBe('Arbitrum');
  });

  it('keeps snapshots per scope so returning to a window resumes its latest snapshot', () => {
    const { result, rerender } = renderTopUsers();

    act(() => {
      usersUpdateHandler?.(liveEvent('1h'));
    });
    expect(result.current.data?.data[0].name).toBe('Optimism');

    // Another window has no snapshot: REST data, not the 1h rows.
    rerender({ range: '24h' });
    expect(result.current.data?.data[0].name).toBe('Arbitrum');

    // Returning resumes from the 1h snapshot instead of rolling back to the
    // older cached fetch.
    rerender({ range: '1h' });
    expect(result.current.data?.data[0].name).toBe('Optimism');
  });

  it('masks the fetch error only while a newer snapshot is displayed', () => {
    const fetchError = new Error('users fetch failed');
    mockRest({ error: fetchError, dataUpdatedAt: 1000 });
    const { result } = renderTopUsers();

    expect(result.current.error).toBe(fetchError);

    act(() => {
      usersUpdateHandler?.(liveEvent('1h'));
    });

    // The snapshot is fresher than the failure, so reporting the error would
    // mislabel current rows as stale.
    expect(result.current.error).toBeNull();
  });
});
