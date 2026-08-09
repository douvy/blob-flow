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

// The network is a route segment, so the hook reads it out of the URL.
const route = { params: {} as Record<string, string>, pathname: '/' };

vi.mock('next/navigation', () => ({
  useParams: () => route.params,
  usePathname: () => route.pathname,
}));

const getNetworks = vi.mocked(api.getNetworks);

const BACKEND_NETWORKS: BackendNetwork[] = [
  { chain_id: 1, name: 'mainnet' },
  { chain_id: 11155111, name: 'sepolia' },
  { chain_id: 560048, name: 'hoodi' },
];

function onPath(pathname: string, network?: string) {
  route.pathname = pathname;
  route.params = network ? { network } : {};
}

describe('useNetwork', () => {
  beforeEach(() => {
    vi.mocked(api.getNetworks).mockReset();
    onPath('/');
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

  it('shows the default network on the bare paths', async () => {
    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));
    expect(result.current.selectedNetwork.apiParam).toBe(DEFAULT_NETWORK.apiParam);
  });

  it('reads the network out of the path', async () => {
    onPath('/hoodi/blocks', 'hoodi');

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.selectedNetwork.name).toBe('Hoodi'));
    expect(result.current.selectedNetwork.apiParam).toBe('hoodi');
  });

  it('accepts a network segment in any casing', async () => {
    onPath('/Hoodi/blocks', 'Hoodi');

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.selectedNetwork.apiParam).toBe('hoodi'));
  });

  it('trusts a dynamic-only path network while the list is in flight', () => {
    // Never resolves, so only the pre-fetch (fallback) path runs.
    getNetworks.mockReturnValue(new Promise(() => {}));
    onPath('/hoodi', 'hoodi');

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    // Hoodi is not in the hardcoded fallback, but must not flash to the
    // default and open the wrong live-data connection.
    expect(result.current.selectedNetwork.apiParam).toBe('hoodi');
    expect(result.current.selectedNetwork.name).toBe('Hoodi');
  });

  it('reports the path segment itself, so callers can strip it without the list', async () => {
    // The Header strips this segment to decide nav highlighting and whether
    // to show the time filters. Going by the option list instead loses both
    // on a dynamic network whenever GET /networks is in flight or failed.
    getNetworks.mockReturnValue(new Promise(() => {}));
    onPath('/hoodi/charts/base-fee', 'hoodi');

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    expect(result.current.pathNetwork).toBe('hoodi');
    expect(result.current.networkOptions.map((option) => option.apiParam)).not.toContain('hoodi');
  });

  it('reports no path network on the bare paths', async () => {
    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));
    expect(result.current.pathNetwork).toBeNull();
  });

  it('ignores a segment that is not shaped like a network', async () => {
    // The route matches any single segment; a value that cannot be a network
    // must never reach the API as a query value.
    onPath('/mainnet&limit=1/blocks', 'mainnet&limit=1');

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));
    expect(result.current.selectedNetwork.apiParam).toBe(DEFAULT_NETWORK.apiParam);
  });

  it('falls back to the hardcoded networks while the request is in flight', () => {
    getNetworks.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    expect(result.current.networkOptions).toHaveLength(Object.keys(NETWORKS).length);
    expect(result.current.selectedNetwork.name).toBe(DEFAULT_NETWORK.name);
  });

  it('keeps reading the path network when the list failed to load', async () => {
    getNetworks.mockRejectedValue(new Error('network down'));
    onPath('/hoodi/blocks', 'hoodi');

    const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

    // The segment was already validated server-side, so an unreachable list is
    // no reason to stop showing the network the URL asks for.
    await waitFor(() => expect(getNetworks).toHaveBeenCalled());
    expect(result.current.selectedNetwork.apiParam).toBe('hoodi');
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

  describe('switching network', () => {
    const assignSpy = vi.fn();
    const originalLocation = window.location;

    beforeEach(() => {
      assignSpy.mockReset();
      // Replace location so navigation can be observed in jsdom.
      delete (window as Window & { location?: Location }).location;
      (window as Window & { location: Location }).location = {
        ...originalLocation,
        search: '',
        hash: '',
        assign: assignSpy,
      };
    });

    function withLocation(search: string, hash: string) {
      (window as Window & { location: Location }).location = {
        ...window.location,
        search,
        hash,
        assign: assignSpy,
      };
    }

    afterEach(() => {
      (window as Window & { location: Location }).location = originalLocation;
    });

    it('keeps the current page and swaps the network segment', async () => {
      onPath('/block/123');
      const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });
      await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));

      act(() => {
        result.current.setSelectedNetwork({ name: 'Hoodi', apiParam: 'hoodi' });
      });

      expect(assignSpy).toHaveBeenCalledWith('/hoodi/block/123');
    });

    it('swaps a network the option list has not caught up with', async () => {
      // /networks is still in flight, so hoodi is not in networkOptions. The
      // segment must still be replaced rather than stacked onto.
      getNetworks.mockReturnValue(new Promise(() => {}));
      onPath('/hoodi/block/123', 'hoodi');
      const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });

      act(() => {
        result.current.setSelectedNetwork({ name: 'Sepolia', apiParam: 'sepolia' });
      });

      expect(assignSpy).toHaveBeenCalledWith('/sepolia/block/123');
    });

    it('carries the query string and fragment across the switch', async () => {
      onPath('/charts/base-fee');
      withLocation('?range=24h', '#chart');
      const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });
      await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));

      act(() => {
        result.current.setSelectedNetwork({ name: 'Sepolia', apiParam: 'sepolia' });
      });

      expect(assignSpy).toHaveBeenCalledWith('/sepolia/charts/base-fee?range=24h#chart');
    });

    it('returns to the bare paths for the default network', async () => {
      onPath('/hoodi/block/123', 'hoodi');
      const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });
      await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));

      act(() => {
        result.current.setSelectedNetwork(DEFAULT_NETWORK);
      });

      expect(assignSpy).toHaveBeenCalledWith('/block/123');
    });

    it('reports the switch to analytics before navigating away', async () => {
      const track = vi.fn();
      window.umami = { track };
      onPath('/block/123');
      const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });
      await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));

      act(() => {
        result.current.setSelectedNetwork({ name: 'Hoodi', apiParam: 'hoodi' });
      });

      expect(track).toHaveBeenCalledWith('network-switch', { from: 'mainnet', to: 'hoodi' });
      delete window.umami;
    });

    it('does not report re-selecting the network already shown', async () => {
      const track = vi.fn();
      window.umami = { track };
      onPath('/hoodi/block/123', 'hoodi');
      const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });
      await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));

      act(() => {
        result.current.setSelectedNetwork({ name: 'Hoodi', apiParam: 'hoodi' });
      });

      expect(track).not.toHaveBeenCalled();
      delete window.umami;
    });

    it('switches the dashboard without leaving a trailing slash', async () => {
      onPath('/');
      const { result } = renderHook(() => useNetwork(), { wrapper: createQueryWrapper() });
      await waitFor(() => expect(result.current.networkOptions).toHaveLength(3));

      act(() => {
        result.current.setSelectedNetwork({ name: 'Sepolia', apiParam: 'sepolia' });
      });

      expect(assignSpy).toHaveBeenCalledWith('/sepolia');
    });
  });
});
