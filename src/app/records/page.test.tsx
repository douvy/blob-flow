import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DEFAULT_NETWORK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import type { BlobRecords, StreakLeaderboard } from '@/types';
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

const EMPTY_BOARD: StreakLeaderboard = { current: null, top: [] };

function makeRecords(overrides: Partial<BlobRecords> = {}): BlobRecords {
  return {
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
    belowTargetStreaks: EMPTY_BOARD,
    feePeaks: [
      {
        blockNumber: 19_426_587,
        timestamp: '2024-03-13T13:35:00Z',
        feeGwei: 644,
        blobCount: 6,
      },
    ],
    expensiveBlocks: [
      {
        blockNumber: 19_426_588,
        timestamp: '2024-03-13T13:36:00Z',
        totalCostWei: '390497402831634432',
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
    busiestDays: [
      {
        dayStart: '2026-05-14T00:00:00Z',
        blobCount: 98_431,
        totalCostWei: '90000000000000000000',
      },
    ],
    priciestDays: [
      {
        dayStart: '2024-06-20T00:00:00Z',
        blobCount: 20_762,
        totalCostWei: '249270000000000000000',
      },
    ],
    utilizationDays: [
      {
        dayStart: '2026-05-14T00:00:00Z',
        averageUtilizationPercent: 87.42,
        blockCount: 7_150,
        blobCount: 39_204,
      },
    ],
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

function renderPage() {
  return render(
    <TooltipProvider delayDuration={0}>
      <RecordsPage />
    </TooltipProvider>
  );
}

describe('RecordsPage', () => {
  beforeEach(() => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
  });

  it('renders the historical leaderboards', () => {
    mockRecords(makeRecords());
    renderPage();

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

    const feeCard = document.getElementById('highest-base-fee')!;
    expect(within(feeCard).getByText('644.00')).toBeInTheDocument();
    expect(
      within(feeCard).getByText(/Highest blob base fee ever quoted/)
    ).toBeInTheDocument();
    // Peaks disclose their blob count: record-fee blocks are often empty.
    expect(within(feeCard).getByText('6 blobs')).toBeInTheDocument();

    const expensiveCard = document.getElementById('most-expensive-block')!;
    expect(
      within(expensiveCard).getByText(/The most spent on blobs in a single block/)
    ).toBeInTheDocument();

    const hourCard = document.getElementById('busiest-hour')!;
    expect(within(hourCard).getByText('4,211')).toBeInTheDocument();
    expect(within(hourCard).getAllByText(/May 14, 2026/)).toHaveLength(2);

    const dayCard = document.getElementById('busiest-day')!;
    expect(within(dayCard).getByText('98,431')).toBeInTheDocument();

    const priciestCard = document.getElementById('priciest-day')!;
    expect(
      within(priciestCard).getByText(/The most burned on blobs in a single UTC day/)
    ).toBeInTheDocument();
    expect(within(priciestCard).getByText('20,762 blobs')).toBeInTheDocument();

    const utilizationCard = document.getElementById('highest-utilization-day')!;
    // Headline value plus its ranked row repeat the record percentage.
    expect(within(utilizationCard).getAllByText('87.4%')).toHaveLength(2);

    // A board with no runs renders no card at all.
    expect(document.getElementById('below-target-streak')).toBeNull();
  });

  it('keeps the attribution caveat in a tooltip on the heading', async () => {
    mockRecords(makeRecords());
    renderPage();

    const user = userEvent.setup();
    expect(screen.queryByRole('tooltip')).toBeNull();

    await user.hover(
      screen.getByRole('button', { name: 'About these leaderboards' })
    );

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(
      /Leaderboards cover the indexer's full indexed history/
    );
    expect(tooltip).toHaveTextContent(/unattributed senders are not represented/);
  });

  it('omits cards whose sections are empty', () => {
    mockRecords(
      makeRecords({
        fullBlockStreaks: EMPTY_BOARD,
        aboveTargetStreaks: EMPTY_BOARD,
        belowTargetStreaks: EMPTY_BOARD,
        feePeaks: [],
        expensiveBlocks: [],
        busiestHours: [],
        busiestDays: [],
        priciestDays: [],
        utilizationDays: [],
      })
    );
    renderPage();

    for (const id of [
      'full-block-streak',
      'blocks-above-target',
      'below-target-streak',
      'highest-base-fee',
      'most-expensive-block',
      'busiest-hour',
      'busiest-day',
      'priciest-day',
      'highest-utilization-day',
    ]) {
      expect(document.getElementById(id)).toBeNull();
    }

    // Attribution and stats sections still render.
    expect(document.getElementById('top-spenders')).not.toBeNull();
    expect(document.getElementById('total-blobs')).not.toBeNull();
    expect(document.getElementById('rollup-milestones')).not.toBeNull();
  });

  it('ranks top spenders with the record holder first', () => {
    mockRecords(makeRecords());
    renderPage();

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
