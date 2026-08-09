import { renderHook } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useApiData } from './useApiData';
import { useNetwork } from './useNetwork';
import { useRollupAddresses } from './useRollupAddresses';
import type { TopUsersResponse, User } from '../types';

vi.mock('./useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('./useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('../contexts/TimeRangeContext', () => ({
  useTimeRange: () => ({ timeRange: '24h', setTimeRange: vi.fn() }),
}));

function user(name: string, address: string, attributed = true): User {
  return {
    id: 1,
    name,
    address,
    attributed,
    dataCount: 10,
    percentage: 10,
    totalCostEth: '0.1',
    lastTimestamp: '2026-08-09T00:00:00.000Z',
  };
}

function renderWith(users: User[]) {
  const data: TopUsersResponse = { data: users, hasServerShares: true };
  vi.mocked(useApiData).mockReturnValue({ data } as unknown as ReturnType<typeof useApiData>);
  return renderHook(() => useRollupAddresses()).result.current;
}

describe('useRollupAddresses', () => {
  beforeEach(() => {
    vi.mocked(useApiData).mockReset();
    vi.mocked(useNetwork).mockReset();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
    } as unknown as ReturnType<typeof useNetwork>);
  });

  it('keys addresses by the rollup name folded to lower case', () => {
    const addresses = renderWith([user('Robinhood Chain', '0xaaa'), user('OP Mainnet', '0xbbb')]);

    expect(addresses.get('robinhood chain')).toBe('0xaaa');
    expect(addresses.get('op mainnet')).toBe('0xbbb');
  });

  it('keeps the busiest address when a rollup posts from several', () => {
    // Rows arrive busiest first, so the first one under a name is the one a
    // reader following the link would expect to land on.
    const addresses = renderWith([user('Base', '0xbusy'), user('Base', '0xquiet')]);

    expect(addresses.get('base')).toBe('0xbusy');
  });

  it('skips unattributed rows, which are named after their own address', () => {
    const addresses = renderWith([user('0x1234...5678', '0x1234000000000000000000000000000000005678', false)]);

    expect(addresses.size).toBe(0);
  });

  it('is empty before the request resolves', () => {
    vi.mocked(useApiData).mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useApiData
    >);

    expect(renderHook(() => useRollupAddresses()).result.current.size).toBe(0);
  });
});
