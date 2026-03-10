import { act, renderHook } from '@testing-library/react';
import { useNetwork } from './useNetwork';
import { DEFAULT_NETWORK, NETWORKS } from '../constants';

describe('useNetwork', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads selected network from localStorage and exposes options', () => {
    window.localStorage.setItem('selectedNetwork', JSON.stringify('Sepolia'));

    const { result } = renderHook(() => useNetwork());

    expect(result.current.selectedNetwork.name).toBe('Sepolia');
    expect(result.current.networkOptions).toHaveLength(Object.keys(NETWORKS).length);
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

    const { result } = renderHook(() => useNetwork());

    act(() => {
      result.current.setSelectedNetwork(DEFAULT_NETWORK);
    });

    expect(window.localStorage.getItem('selectedNetwork')).toBe(JSON.stringify('Mainnet'));
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    (window as Window & { location: Location }).location = originalLocation;
  });
});
