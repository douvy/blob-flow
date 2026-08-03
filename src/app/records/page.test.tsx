import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { DEFAULT_NETWORK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import type { BlobRecords } from '@/types';
import RecordsPage from './page';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement('img', props),
}));

vi.mock('@/hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

function makeRecords(overrides: Partial<BlobRecords> = {}): BlobRecords {
  return {
    streak: {
      consecutiveFullBlocks: 3,
      recentBlocksAboveTarget: 12,
      percentRecentBlocksAtMaxBlobs: 15,
    },
    fullBlockStreaks: null,
    aboveTargetStreaks: null,
    feePeaks: null,
    busiestHours: null,
    peakWindowFee: {
      window: '30d',
      p95Gwei: 5,
      perWindow: [
        { window: '24h', p95Gwei: 2 },
        { window: '30d', p95Gwei: 5 },
      ],
    },
    busiestWindow: {
      window: '1h',
      totalBlobs: 1_200,
      blobsPerHour: 1_200,
      perWindow: [{ window: '1h', totalBlobs: 1_200, blobsPerHour: 1_200 }],
    },
    topSpenders: [
      {
        key: 'base',
        name: 'Base',
        category: 'rollup',
        totalCostWei: '1690000000000000000000',
        spendSharePercent: 35.7,
        blobCount: 8_000_000,
      },
      {
        key: 'world_chain',
        name: 'World Chain',
        category: 'rollup',
        totalCostWei: '523000000000000000000',
        spendSharePercent: 11.1,
        blobCount: 2_700_000,
      },
    ],
    allTime: { totalBlobs: 21_000_000, averageBaseFee: '1.689 Gwei' },
    milestones: [
      {
        key: 'base',
        name: 'Base',
        category: 'rollup',
        blobCount: 8_000_000,
        blobSharePercent: 37,
        nextMilestone: 10_000_000,
        remainingToMilestone: 2_000_000,
        progressPercent: 80,
      },
    ],
    ...overrides,
  };
}

function mockRecords(records: BlobRecords) {
  vi.mocked(useApiData).mockReturnValue({
    data: records,
    isLoading: false,
    isFetching: false,
    error: null,
    dataUpdatedAt: 0,
    refetch: vi.fn(),
  });
}

describe('RecordsPage', () => {
  beforeEach(() => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
  });

  it('falls back to live and windowed cards without historical data', () => {
    mockRecords(makeRecords());
    render(<RecordsPage />);

    const streakCard = document.getElementById('full-block-streak')!;
    expect(within(streakCard).getByText('Live')).toBeInTheDocument();
    expect(
      within(streakCard).getByText(/15% of recent blocks hit the max blob count/)
    ).toBeInTheDocument();

    const feeCard = document.getElementById('peak-p95-fee')!;
    expect(within(feeCard).getByText('30d window')).toBeInTheDocument();
    expect(within(feeCard).getByText(/not an all-time high/)).toBeInTheDocument();

    const busiestCard = document.getElementById('busiest-window')!;
    expect(
      within(busiestCard).getByText(/led by the 1h window with 1,200 blobs/)
    ).toBeInTheDocument();
  });

  it('renders historical leaderboards when the records endpoint supplies them', () => {
    mockRecords(
      makeRecords({
        fullBlockStreaks: {
          current: {
            length: 2,
            startBlock: 23_411_999,
            endBlock: 23_412_000,
            endTimestamp: '2026-08-02T11:59:48Z',
          },
          top: [
            {
              length: 14,
              startBlock: 22_811_332,
              endBlock: 22_811_345,
              endTimestamp: '2026-05-14T09:12:00Z',
            },
            {
              length: 11,
              startBlock: 23_100_190,
              endBlock: 23_100_200,
              endTimestamp: '2026-06-30T17:40:00Z',
            },
          ],
        },
        aboveTargetStreaks: {
          current: null,
          top: [
            {
              length: 42,
              startBlock: 22_811_359,
              endBlock: 22_811_400,
              endTimestamp: '2026-05-14T09:23:00Z',
            },
          ],
        },
        feePeaks: [
          {
            blockNumber: 19_426_587,
            timestamp: '2024-03-13T13:35:00Z',
            feeGwei: 644,
            blobCount: 6,
          },
        ],
        busiestHours: [
          {
            hourStart: '2026-05-14T09:00:00Z',
            blobCount: 4_211,
            totalCostWei: '9000000000000000000',
          },
        ],
      })
    );
    render(<RecordsPage />);

    const streakCard = document.getElementById('full-block-streak')!;
    expect(
      within(streakCard).getByText(
        /Longest run of consecutive full blocks ever indexed, ended at/
      )
    ).toBeInTheDocument();
    expect(within(streakCard).getByText(/Current streak: 2\./)).toBeInTheDocument();
    expect(within(streakCard).getByText('14 blocks')).toBeInTheDocument();
    // The record's end block links from both the caption and its ranked row.
    const recordLinks = within(streakCard).getAllByRole('link', {
      name: '#22,811,345',
    });
    expect(recordLinks).toHaveLength(2);
    for (const link of recordLinks) {
      expect(link).toHaveAttribute('href', '/block/22811345');
    }

    const aboveTargetCard = document.getElementById('blocks-above-target')!;
    expect(within(aboveTargetCard).getByText('42')).toBeInTheDocument();
    expect(
      within(aboveTargetCard).getByText(/Current streak: 0\./)
    ).toBeInTheDocument();

    const feeCard = document.getElementById('peak-p95-fee')!;
    expect(within(feeCard).getByText('644.00')).toBeInTheDocument();
    expect(
      within(feeCard).getByText(/Highest blob base fee ever indexed/)
    ).toBeInTheDocument();

    const busiestCard = document.getElementById('busiest-window')!;
    expect(within(busiestCard).getByText('4,211')).toBeInTheDocument();
    // The record hour's date appears in both the caption and its ranked row.
    expect(within(busiestCard).getAllByText(/May 14, 2026/)).toHaveLength(2);

    // Historical cards must not carry the narrower fallback scope labels.
    expect(within(streakCard).queryByText('Live')).not.toBeInTheDocument();
    expect(within(feeCard).queryByText(/window$/)).not.toBeInTheDocument();
  });

  it('ranks top spenders with the record holder first', () => {
    mockRecords(makeRecords());
    render(<RecordsPage />);

    const spendersCard = document.getElementById('top-spenders')!;
    const rows = within(spendersCard).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Base');
    expect(rows[0]).toHaveTextContent('Record');
    expect(rows[1]).toHaveTextContent('World Chain');
    expect(
      within(spendersCard).getByText(
        /leads all attributed entities with 35.7% of blob spend across 8,000,000 blobs/
      )
    ).toBeInTheDocument();
  });
});
