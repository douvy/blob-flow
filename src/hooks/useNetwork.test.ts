import { act, renderHook, waitFor } from '@testing-library/react';
import { useNetwork } from './useNetwork';
import { DEFAULT_NETWORK, NETWORKS } from '../constants';
import { api } from '../lib/api';
import { createQueryWrapper } from '../test/queryClient';
import type { BackendNetwork } from '../types';

vi.mock('../lib/api', () => ({
  api: {
    getNetworks: vi.fn(),
  },
}));

const getNetworks = vi.mocked(api.getNetworks);

const BACKEND_NETWORKS: BackendNetwork[] = [
  { chain_id: 1, name: 'mainnet' },
  { chain_id: 11155111, name: 'sepolia' },
  { chain_id: 560048, name: 'hoodi' },
];

describe('useNetwork', () => {
  beforeEach(() => {
    vi.mocked(api.getNetworks).mockReset();
    window.localStorage.clear();
    getNetworks.mockResolvedValue({ success: true, data: BACKEND_NETWORKS });
  });

  it('loads the network list from the API and transforms it for the selector', async () => {
    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));

    expect(result.current.networkOptions.map((n) => n.name)).toEqual([
      'Mainnet',
      'Sepolia',
      'Hoodi',
    ]);
    expect(result.current.networkOptions.map((n) => n.apiParam)).toEqual([
      'mainnet',
      'sepolia',
      'hoodi',
    ]);
  });

  it('leaves icon undefined until the backend supplies one', async () => {
    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));
    expect(result.current.networkOptions.every((n) => n.icon === undefined)).toBe(true);
  });

  it('picks up optional icon and display_name fields when present', async () => {
    getNetworks.mockResolvedValue({
      success: true,
      data: [
        {
          chain_id: 1,
          name: 'mainnet',
          display_name: 'Ethereum Mainnet',
          icon: '/images/mainnet.png',
        },
        // Blank optional fields fall back gracefully.
        { chain_id: 11155111, name: 'sepolia', display_name: '   ', icon: '  ' },
      ],
    });

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    // Wait for the fetched data specifically (the fallback is also length 2).
    await waitFor(() =>
      expect(result.current.networkOptions[0].name).toBe('Ethereum Mainnet')
    );

    const [mainnet, sepolia] = result.current.networkOptions;
    expect(mainnet.name).toBe('Ethereum Mainnet');
    expect(mainnet.icon).toBe('/images/mainnet.png');
    // Whitespace-only fields are treated as absent.
    expect(sepolia.name).toBe('Sepolia');
    expect(sepolia.icon).toBeUndefined();
  });

  it('honors a persisted selection stored as an apiParam', async () => {
    window.localStorage.setItem('selectedNetwork', JSON.stringify('hoodi'));

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.selectedNetwork.name).toBe('Hoodi'));
    expect(result.current.selectedNetwork.apiParam).toBe('hoodi');
  });

  it('honors a legacy selection persisted as a display name', async () => {
    window.localStorage.setItem('selectedNetwork', JSON.stringify('Hoodi'));

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.selectedNetwork.apiParam).toBe('hoodi'));
  });

  it('selects a dynamic-only persisted network immediately while loading', () => {
    // Never resolves, so only the pre-fetch (fallback) path runs.
    getNetworks.mockReturnValue(new Promise(() => {}));
    window.localStorage.setItem('selectedNetwork', JSON.stringify('hoodi'));

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    // Hoodi is not in the hardcoded fallback, but must not flash to the default.
    expect(result.current.selectedNetwork.apiParam).toBe('hoodi');
    expect(result.current.selectedNetwork.name).toBe('Hoodi');
  });

  it('falls back to the hardcoded networks while the request is in flight', () => {
    getNetworks.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    expect(result.current.networkOptions).toHaveLength(Object.keys(NETWORKS).length);
    expect(result.current.selectedNetwork.name).toBe(DEFAULT_NETWORK.name);
  });

  it('resets to the default when a persisted network no longer exists', async () => {
    window.localStorage.setItem('selectedNetwork', JSON.stringify('holesky'));

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    // Once the list loads and holesky is absent, selection lands on the default.
    await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));
    expect(result.current.selectedNetwork.apiParam).toBe(DEFAULT_NETWORK.apiParam);
  });

  it('rewrites storage when a persisted network no longer exists', async () => {
    window.localStorage.setItem('selectedNetwork', JSON.stringify('holesky'));

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    // Storage is corrected to the resolved default so later reloads stay clean.
    await waitFor(() =>
      expect(window.localStorage.getItem('selectedNetwork')).toBe(
        JSON.stringify(DEFAULT_NETWORK.apiParam)
      )
    );
    expect(result.current.selectedNetwork.apiParam).toBe(DEFAULT_NETWORK.apiParam);
  });

  it('ignores malformed network entries with empty names', async () => {
    getNetworks.mockResolvedValue({
      success: true,
      data: [...BACKEND_NETWORKS, { chain_id: 999, name: '' }],
    });

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));
    expect(result.current.networkOptions.every((n) => n.apiParam !== '')).toBe(true);
  });

  it('updates selected network and persists selection', () => {
    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    // Replace location object so reload can be controlled in jsdom.
    delete (window as Window & { location?: Location }).location;
    (window as Window & { location: Location }).location = {
      ...originalLocation,
      reload: reloadSpy,
    };

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    act(() => {
      result.current.setSelectedNetwork(DEFAULT_NETWORK);
    });

    expect(window.localStorage.getItem('selectedNetwork')).toBe(JSON.stringify('mainnet'));
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    (window as Window & { location: Location }).location = originalLocation;
  });
});
