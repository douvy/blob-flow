import { isolateLegendKey } from './legendIsolation';

const ALL_KEYS = ['arbitrum', 'base', 'optimism'];

describe('isolateLegendKey', () => {
  it('hides every other series when all are visible', () => {
    const next = isolateLegendKey(new Set(), ALL_KEYS, 'base');

    expect(next).toEqual(new Set(['arbitrum', 'optimism']));
  });

  it('restores all series when the isolated series is clicked again', () => {
    const isolated = new Set(['arbitrum', 'optimism']);

    const next = isolateLegendKey(isolated, ALL_KEYS, 'base');

    expect(next).toEqual(new Set());
  });

  it('switches isolation when a different series is clicked', () => {
    const isolated = new Set(['arbitrum', 'optimism']);

    const next = isolateLegendKey(isolated, ALL_KEYS, 'arbitrum');

    expect(next).toEqual(new Set(['base', 'optimism']));
  });

  it('ignores stale hidden keys that are no longer in the legend', () => {
    const stale = new Set(['zksync']);

    const next = isolateLegendKey(stale, ALL_KEYS, 'base');

    expect(next).toEqual(new Set(['arbitrum', 'optimism']));
  });
});
