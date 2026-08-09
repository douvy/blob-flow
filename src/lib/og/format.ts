import type {
    BackendAttributionUsageChartResponse,
    BackendAttributionUsageShare,
    NewBlockData,
    Network,
    UserResponse,
} from '@/types';
import {
    formatCostEthOrWei,
    formatGwei,
    formatNumber,
    formatPercent,
    formatWeiToEth,
    truncateAddress,
} from '@/utils';
import { DEFAULT_NETWORK, SITE_NAME } from '@/constants';
import { DEFAULT_OG_SCOPE, type HomeOgData, type OgScope } from './data';

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
    /** Named on every card so a testnet unfurl is never mistaken for mainnet. */
    networkLabel: string;
    stats: OgStat[];
}

const TAGLINE = 'Real-time Ethereum EIP-4844 blob market analytics';

/** How a network is named in the card's corner. */
export function ogNetworkLabel(network: Network = DEFAULT_NETWORK): string {
    return `Ethereum ${network.name}`;
}

/**
 * Branded card used whenever the indexer is unreachable or a route param does
 * not resolve to indexed data. Never throws, so an unfurl always gets an image.
 */
export function buildFallbackCard(
    overrides: Partial<OgCardContent> = {},
    network: Network = DEFAULT_NETWORK
): OgCardContent {
    return {
        eyebrow: 'Ethereum blob analytics',
        title: SITE_NAME,
        subtitle: TAGLINE,
        networkLabel: ogNetworkLabel(network),
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

export function buildHomeCard(
    { pricing, attribution }: HomeOgData,
    { network, range }: OgScope = DEFAULT_OG_SCOPE
): OgCardContent | null {
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
            label: `Blobs (${range})`,
            value: formatNumber(attribution.summary.total_blobs),
            accent: 'green',
        });
    }

    return {
        eyebrow: 'Current blob base fee',
        title: formatGwei(pricing.current_base_fee_gwei, 4),
        subtitle: attribution ? shareSummaryLine(attribution, range) ?? TAGLINE : TAGLINE,
        networkLabel: ogNetworkLabel(network),
        stats,
    };
}

export function buildBlockCard(
    blockNumber: number,
    block: NewBlockData,
    network: Network = DEFAULT_NETWORK
): OgCardContent {
    const pricing = block.pricing;
    const blobCount = pricing?.blob_count ?? block.blob_count;
    const maxBlobs = pricing?.max_blobs ?? 0;
    const feeGwei = pricing?.blob_base_fee_gwei;
    const fullness = maxBlobs > 0 ? Math.round((blobCount / maxBlobs) * 100) : null;

    const stats: OgStat[] = [
        {
            label: 'Blobs',
            value: maxBlobs > 0 ? `${blobCount} of ${maxBlobs}` : formatNumber(blobCount),
            accent: 'blue',
        },
    ];

    if (fullness !== null) {
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
            fullness !== null
                ? `${blobCount} of ${maxBlobs} blobs, ${fullness}% full`
                : `${formatNumber(blobCount)} blob${blobCount === 1 ? '' : 's'} in this block`,
        networkLabel: ogNetworkLabel(network),
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

export function buildUserCard(
    address: string,
    user: UserResponse,
    network: Network = DEFAULT_NETWORK
): OgCardContent {
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
                : `${formatNumber(user.blob_count)} blobs sent`,
        networkLabel: ogNetworkLabel(network),
        stats,
    };
}
