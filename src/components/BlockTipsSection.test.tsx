import React from 'react';
import { render, screen } from '@testing-library/react';
import BlockTipsSection from './BlockTipsSection';
import type { BlockTipSummary } from '@/lib/blockTips';

const priced: BlockTipSummary = {
  totalBlobs: 3,
  pricedBlobs: 3,
  averageGwei: 3,
  maxGwei: 5,
  transactions: [
    { txHash: '0xop', attribution: 'Optimism', fromAddress: '0xa', blobCount: 2, pricedBlobCount: 2, priorityFeeGwei: 5 },
    { txHash: '0xarb', attribution: 'Arbitrum', fromAddress: '0xb', blobCount: 1, pricedBlobCount: 1, priorityFeeGwei: 1 },
  ],
};

describe('BlockTipsSection', () => {
  it('renders nothing for a block without blobs', () => {
    const { container } = render(
      <BlockTipsSection
        summary={{ totalBlobs: 0, pricedBlobs: 0, averageGwei: null, maxGwei: null, transactions: [] }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the tip chart for a priced block', () => {
    render(<BlockTipsSection summary={priced} />);

    expect(screen.getByRole('heading', { name: 'Tips' })).toBeInTheDocument();
    expect(screen.queryByText(/indexed before tips were tracked/)).not.toBeInTheDocument();
  });

  it('notes partial coverage when some blobs predate tip tracking', () => {
    render(
      <BlockTipsSection
        summary={{
          ...priced,
          totalBlobs: 5,
          transactions: [
            ...priced.transactions,
            { txHash: '0xold', attribution: 'Base', fromAddress: '0xc', blobCount: 2, pricedBlobCount: 0, priorityFeeGwei: null },
          ],
        }}
      />
    );

    expect(screen.getByText(/Tips recorded for 3 of 5 blobs/)).toBeInTheDocument();
  });

  it('explains an unpriced block instead of drawing an empty chart', () => {
    render(
      <BlockTipsSection
        summary={{
          totalBlobs: 2,
          pricedBlobs: 0,
          averageGwei: null,
          maxGwei: null,
          transactions: [
            { txHash: '0xold', attribution: 'Base', fromAddress: '0xc', blobCount: 2, pricedBlobCount: 0, priorityFeeGwei: null },
          ],
        }}
      />
    );

    expect(screen.getByText(/No tips recorded for this block/)).toBeInTheDocument();
  });
});
