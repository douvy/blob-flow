import type {
    BackendAttributionUsageChartResponse,
    BackendAttributionUsageShare,
    BackendBlobMarketChartResponse,
    BackendCostComparisonChartResponse,
    BackendStatsWindow,
    BackendStatsWindowsResponse,
    NewBlockData,
    UserResponse,
} from '@/types';
import {
    formatCostEthOrWei,
    formatGwei,
    formatNumber,
    formatPercent,
    formatUtilizationPercent,
    formatWeiToEth,
    formatWeiToGwei,
    truncateAddress,
} from '@/utils';
import type { HomeOgData } from './data';

/** Accent keys map to OG_COLORS in card.tsx. */
export type OgAccent = 'blue' | 'lightBlue' | 'green' | 'red';

export interface OgStat {
    label: string;
    value: string;
    accent?: OgAccent;
}

export interface OgCardContent {
    eyebrow: string;
    title: string;
    subtitle?: string;
    stats: OgStat[];
}

const TAGLINE = 'Real-time Ethereum EIP-4844 blob market analytics';

/**
 * Branded static card used whenever the indexer is unreachable or a route
 * param does not resolve to indexed data. Never throws, so an unfurl always
 * gets an image.
 */
export function buildFallbackCard(overrides: Partial<OgCardContent> = {}): OgCardContent {
    return {
        eyebrow: 'Ethereum blob analytics',
        title: 'BlobFlow',
        subtitle: TAGLINE,
        stats: [],
        ...overrides,
    };
}

/**
 * Largest attributed rollup shares, skipping unattributed buckets so the
 * headline reads as "top rollups" rather than "mostly Unknown".
 */
export function topAttributedShares(
    attribution: BackendAttributionUsageChartResponse,
    count = 3
): BackendAttributionUsageShare[] {
    return attribution.summary.shares
        .filter((share) => share.blob_share_percent > 0)
        .filter((share) => !['unknown', 'other'].includes(share.name.trim().toLowerCase()))
        .sort((a, b) => b.blob_share_percent - a.blob_share_percent)
        .slice(0, count);
}

function shareSummaryLine(
    attribution: BackendAttributionUsageChartResponse,
    windowLabel: string
): string | undefined {
    const shares = topAttributedShares(attribution);
    if (shares.length === 0) return undefined;

    const parts = shares.map(
        (share) => `${share.name} ${formatPercent(share.blob_share_percent)}`
    );
    return `${parts.join(', ')} of blobs (${windowLabel})`;
}

export function buildHomeCard({ pricing, attribution }: HomeOgData): OgCardContent | null {
    if (!pricing) return null;

    const stats: OgStat[] = [
        {
            label: 'Predicted next fee',
            value: formatGwei(pricing.predicted_next_fee_gwei, 4),
            accent: 'lightBlue',
        },
        {
            label: 'Recent blocks at max',
            value: formatPercent(pricing.market_pressure.percent_recent_blocks_at_max_blobs),
            accent: 'blue',
        },
    ];

    if (attribution) {
        stats.push({
            label: 'Blobs (24h)',
            value: formatNumber(attribution.summary.total_blobs),
            accent: 'green',
        });
    }

    return {
        eyebrow: 'Current blob base fee',
        title: formatGwei(pricing.current_base_fee_gwei, 4),
        subtitle: attribution ? shareSummaryLine(attribution, '24h') ?? TAGLINE : TAGLINE,
        stats,
    };
}

export function buildBaseFeeCard(chart: BackendBlobMarketChartResponse): OgCardContent {
    const { summary } = chart;
    return {
        eyebrow: 'Blob base fee, last 24h',
        title: formatGwei(summary.current_base_fee_gwei, 4),
        subtitle: 'Current blob base fee on Ethereum',
        stats: [
            { label: '24h average', value: formatGwei(summary.average_blob_base_fee_gwei, 4), accent: 'lightBlue' },
            { label: '24h p95', value: formatGwei(summary.p95_blob_base_fee_gwei, 4), accent: 'blue' },
            { label: '24h blobs', value: formatNumber(summary.total_blobs), accent: 'green' },
        ],
    };
}

export function buildGasUtilizationCard(chart: BackendBlobMarketChartResponse): OgCardContent {
    const { summary } = chart;
    const utilizationRatio = Number(summary.average_utilization);
    const utilization = Number.isFinite(utilizationRatio)
        ? formatUtilizationPercent(utilizationRatio * 100)
        : '-';

    return {
        eyebrow: 'Blob gas utilization, last 24h',
        title: `${utilization} of target`,
        subtitle: 'Average blob gas used versus the protocol target',
        stats: [
            { label: '24h blobs', value: formatNumber(summary.total_blobs), accent: 'green' },
            { label: 'Unique senders', value: formatNumber(summary.unique_senders), accent: 'lightBlue' },
            { label: 'Current fee', value: formatGwei(summary.current_base_fee_gwei, 4), accent: 'blue' },
        ],
    };
}

export function buildBlobUsageCard(
    attribution: BackendAttributionUsageChartResponse
): OgCardContent {
    const shares = topAttributedShares(attribution);
    const stats: OgStat[] = shares.map((share, index) => ({
        label: share.name,
        value: formatPercent(share.blob_share_percent),
        accent: (['blue', 'lightBlue', 'green'] as const)[index % 3],
    }));

    return {
        eyebrow: 'Blob usage by rollup, last 7d',
        title: `${formatNumber(attribution.summary.total_blobs)} blobs`,
        subtitle: 'Share of blobspace by L2 rollup',
        stats,
    };
}

export function buildCostComparisonCard(
    chart: BackendCostComparisonChartResponse
): OgCardContent {
    const { summary } = chart;
    return {
        eyebrow: 'Blobs versus calldata, last 7d',
        title: `${formatPercent(summary.savings_percent)} cheaper`,
        subtitle: 'What rollups saved by posting blobs instead of calldata',
        stats: [
            { label: 'Blob cost', value: formatWeiToEth(summary.blob_cost_wei, true), accent: 'green' },
            {
                label: 'Calldata equivalent',
                value: formatWeiToEth(summary.calldata_equivalent_cost_wei, true),
                accent: 'red',
            },
            { label: 'Saved', value: formatWeiToEth(summary.savings_wei, true), accent: 'lightBlue' },
        ],
    };
}

function findWindow(
    response: BackendStatsWindowsResponse,
    key: string
): BackendStatsWindow | undefined {
    return response.windows.find((window) => window.window === key);
}

export function buildRollingStatsCard(response: BackendStatsWindowsResponse): OgCardContent {
    const day = findWindow(response, '24h') ?? response.windows[0];
    const week = findWindow(response, '7d');

    const stats: OgStat[] = [];
    if (day) {
        const feeWei = day.average_blob_base_fee_wei ?? day.average_blob_base_fee;
        if (feeWei) {
            stats.push({ label: '24h avg fee', value: formatWeiToGwei(feeWei, 4), accent: 'lightBlue' });
        }
        stats.push({
            label: '24h unique senders',
            value: formatNumber(day.unique_senders),
            accent: 'blue',
        });
    }
    if (week) {
        stats.push({ label: '7d blobs', value: formatNumber(week.total_blobs), accent: 'green' });
    }

    return {
        eyebrow: 'Rolling market stats',
        title: day ? `${formatNumber(day.total_blobs)} blobs in 24h` : 'Blob market stats',
        subtitle: 'Rolling blob market activity on Ethereum',
        stats,
    };
}

export function buildChartCard(
    slug: string,
    data:
        | BackendBlobMarketChartResponse
        | BackendAttributionUsageChartResponse
        | BackendCostComparisonChartResponse
        | BackendStatsWindowsResponse
        | null
): OgCardContent | null {
    if (!data) return null;

    switch (slug) {
        case 'base-fee':
            return buildBaseFeeCard(data as BackendBlobMarketChartResponse);
        case 'gas-utilization':
            return buildGasUtilizationCard(data as BackendBlobMarketChartResponse);
        case 'blob-usage':
            return buildBlobUsageCard(data as BackendAttributionUsageChartResponse);
        case 'cost-comparison':
            return buildCostComparisonCard(data as BackendCostComparisonChartResponse);
        case 'rolling-market-stats':
            return buildRollingStatsCard(data as BackendStatsWindowsResponse);
        default:
            return null;
    }
}

export function buildBlockCard(blockNumber: number, block: NewBlockData): OgCardContent {
    const pricing = block.pricing;
    const blobCount = pricing?.blob_count ?? block.blob_count;
    const maxBlobs = pricing?.max_blobs ?? 0;
    const feeGwei = pricing?.blob_base_fee_gwei;

    const stats: OgStat[] = [
        {
            label: 'Blobs',
            value: maxBlobs > 0 ? `${blobCount} of ${maxBlobs}` : formatNumber(blobCount),
            accent: 'blue',
        },
    ];

    if (maxBlobs > 0) {
        const fullness = Math.round((blobCount / maxBlobs) * 100);
        stats.push({
            label: 'Blobspace used',
            value: `${fullness}% full`,
            accent: fullness >= 100 ? 'red' : fullness > 0 ? 'green' : 'lightBlue',
        });
    }

    if (feeGwei) {
        stats.push({ label: 'Blob base fee', value: formatGwei(feeGwei, 4), accent: 'lightBlue' });
    }

    return {
        eyebrow: 'Block blob details',
        title: `Block ${formatNumber(blockNumber)}`,
        subtitle:
            maxBlobs > 0
                ? `${blobCount} of ${maxBlobs} blobs, ${Math.round((blobCount / maxBlobs) * 100)}% full`
                : `${formatNumber(blobCount)} blob${blobCount === 1 ? '' : 's'} in this block`,
        stats,
    };
}

function formatUserCost(user: UserResponse): string | null {
    try {
        if (user.total_cost_wei && /^\d+$/.test(user.total_cost_wei)) {
            return formatWeiToEth(user.total_cost_wei, true);
        }
        if (user.total_cost_eth) {
            return formatCostEthOrWei(user.total_cost_eth);
        }
    } catch {
        // Malformed cost fields fall through to "no cost stat".
    }
    return null;
}

export function buildUserCard(address: string, user: UserResponse): OgCardContent {
    const displayName = user.name || truncateAddress(user.address || address);
    const cost = formatUserCost(user);
    const share =
        typeof user.blob_share_percent === 'number' && Number.isFinite(user.blob_share_percent)
            ? formatPercent(user.blob_share_percent)
            : null;

    const stats: OgStat[] = [
        { label: 'Blobs sent', value: formatNumber(user.blob_count), accent: 'blue' },
    ];
    if (share) {
        stats.push({ label: 'Share of all blobs', value: share, accent: 'lightBlue' });
    }
    if (cost) {
        stats.push({ label: 'Total spend', value: cost, accent: 'green' });
    }

    const subtitleParts = [
        share ? `${share} of all blobs` : null,
        cost ? `${cost} spent` : null,
    ].filter(Boolean);

    return {
        eyebrow: 'Blob sender',
        title: displayName,
        subtitle:
            subtitleParts.length > 0
                ? subtitleParts.join(', ')
                : `${formatNumber(user.blob_count)} blobs sent on Ethereum`,
        stats,
    };
}
