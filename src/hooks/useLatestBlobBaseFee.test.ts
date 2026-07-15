import { selectLatestBlobBaseFee, LiveBlobBaseFee } from './useLatestBlobBaseFee';
import { BlobPricing, BlobPricingRecentBlock } from '@/types';

function makePricingHead(
  currentBaseFeeWei: string,
  recentBlockNumbers: number[]
): BlobPricing {
  return {
    currentBaseFeeWei,
    recentBlocks: recentBlockNumbers.map(
      (blockNumber) => ({ blockNumber }) as BlobPricingRecentBlock
    ),
  } as BlobPricing;
}

function makeLiveFee(overrides: Partial<LiveBlobBaseFee> = {}): LiveBlobBaseFee {
  return { network: 'mainnet', wei: '2000', blockNumber: 100, ...overrides };
}

describe('selectLatestBlobBaseFee', () => {
  it('returns null when no source has responded', () => {
    expect(selectLatestBlobBaseFee(null, undefined, 'mainnet')).toBeNull();
  });

  it('uses the live fee when REST has not responded', () => {
    expect(selectLatestBlobBaseFee(makeLiveFee(), undefined, 'mainnet')).toBe('2000');
  });

  it('uses the REST seed when no live fee has arrived', () => {
    const head = makePricingHead('3000', [99, 98]);
    expect(selectLatestBlobBaseFee(null, head, 'mainnet')).toBe('3000');
  });

  it('prefers the live fee when it is at or ahead of the REST head block', () => {
    const head = makePricingHead('3000', [100, 99]);
    expect(selectLatestBlobBaseFee(makeLiveFee({ blockNumber: 100 }), head, 'mainnet')).toBe(
      '2000'
    );
    expect(selectLatestBlobBaseFee(makeLiveFee({ blockNumber: 101 }), head, 'mainnet')).toBe(
      '2000'
    );
  });

  it('lets a newer REST poll overtake a stale live fee', () => {
    // Socket went quiet at block 100; REST advanced to block 110.
    const head = makePricingHead('3000', [110, 109]);
    expect(selectLatestBlobBaseFee(makeLiveFee({ blockNumber: 100 }), head, 'mainnet')).toBe(
      '3000'
    );
  });

  it('ignores live fees from another network', () => {
    const head = makePricingHead('3000', [90]);
    const foreign = makeLiveFee({ network: 'sepolia', blockNumber: 200 });
    expect(selectLatestBlobBaseFee(foreign, head, 'mainnet')).toBe('3000');
    expect(selectLatestBlobBaseFee(foreign, undefined, 'mainnet')).toBeNull();
  });

  it('prefers the live fee when the REST head carries no recent blocks', () => {
    const head = makePricingHead('3000', []);
    expect(selectLatestBlobBaseFee(makeLiveFee({ blockNumber: 1 }), head, 'mainnet')).toBe(
      '2000'
    );
  });
});
