import type {
    BackendAttributionUsageChartResponse,
    BackendBlobPricingResponse,
    NewBlockData,
    UserResponse,
} from '@/types';
import { NETWORKS } from '@/constants';
import {
    buildBlockCard,
    buildFallbackCard,
    buildHomeCard,
    buildUserCard,
    ogNetworkLabel,
    topAttributedShares,
} from './format';

function makeAttribution(
    shares: Array<{ name: string; blob_share_percent: number }>
): BackendAttributionUsageChartResponse {
    return {
        network_id: 1,
        network_name: 'mainnet',
        range: '24h',
        granularity: 'hour',
        bucket_seconds: 3600,
        start_time: '2026-08-01T00:00:00Z',
        end_time: '2026-08-02T00:00:00Z',
        generated_at: '2026-08-02T00:00:00Z',
        series: [],
        points: [],
        summary: {
            total_blobs: 12345,
            total_cost_wei: '1000000000000000000',
            shares: shares.map((share) => ({
                key: share.name.toLowerCase(),
                name: share.name,
                category: 'rollup',
                blob_count: 100,
                total_cost_wei: '0',
                blob_share_percent: share.blob_share_percent,
                spend_share_percent: share.blob_share_percent,
            })),
        },
    };
}

const pricing = {
    network_id: 1,
    network_name: 'mainnet',
    current_base_fee: '1500000000',
    current_base_fee_gwei: '1.5',
    current_excess_gas: 0,
    current_utilization: '0.66',
    predicted_next_fee: '1600000000',
    predicted_next_fee_gwei: '1.6',
    fork_stage: 'pectra',
    blob_params: { target: 6, max: 9, update_fraction: 1, target_gas: 0, max_gas: 0 },
    market_pressure: {
        recent_blocks_above_target: 12,
        consecutive_full_blocks: 2,
        percent_recent_blocks_at_max_blobs: 35,
        predicted_direction: 'up',
        next_block_fee_estimate: { low: '1', high: '2' },
    },
    recent_blocks: [],
} as unknown as BackendBlobPricingResponse;

describe('og/format', () => {
    it('ranks attributed shares and drops unknown buckets', () => {
        const attribution = makeAttribution([
            { name: 'Unknown', blob_share_percent: 50 },
            { name: 'Base', blob_share_percent: 30 },
            { name: 'Arbitrum One', blob_share_percent: 10 },
            { name: 'OP Mainnet', blob_share_percent: 5 },
            { name: 'zkSync Era', blob_share_percent: 3 },
            { name: 'Zero', blob_share_percent: 0 },
        ]);

        const shares = topAttributedShares(attribution);

        expect(shares.map((share) => share.name)).toEqual(['Base', 'Arbitrum One', 'OP Mainnet']);
    });

    it('builds the dashboard card from pricing and attribution for the given scope', () => {
        const attribution = makeAttribution([{ name: 'Base', blob_share_percent: 41.2 }]);

        const card = buildHomeCard(
            { pricing, attribution },
            { network: NETWORKS.MAINNET, range: '24h' }
        );

        expect(card).not.toBeNull();
        expect(card!.title).toBe('1.5 Gwei');
        expect(card!.subtitle).toBe('Base 41.2% of blobs (24h)');
        expect(card!.networkLabel).toBe('Ethereum Mainnet');
        expect(card!.stats.map((stat) => stat.label)).toEqual([
            'Predicted next fee',
            'Recent blocks at max',
            'Blobs (24h)',
        ]);
        expect(card!.stats.map((stat) => stat.value)).toEqual(['1.6 Gwei', '35%', '12,345']);
    });

    it('names a testnet on the card so its unfurl is never read as mainnet', () => {
        const attribution = makeAttribution([{ name: 'Base', blob_share_percent: 41.2 }]);

        const card = buildHomeCard(
            { pricing, attribution },
            { network: NETWORKS.SEPOLIA, range: '1h' }
        );

        expect(card!.networkLabel).toBe('Ethereum Sepolia');
        expect(ogNetworkLabel()).toBe('Ethereum Mainnet');
    });

    it('returns null for the dashboard card without pricing data', () => {
        expect(buildHomeCard({ pricing: null, attribution: null })).toBeNull();
    });

    it('builds the block card with fullness from blob counts', () => {
        const block = {
            block_number: 21834102,
            blob_count: 9,
            timestamp: '2026-08-02T00:00:00Z',
            blobs: [],
            pricing: {
                blob_count: 9,
                max_blobs: 9,
                blob_base_fee_gwei: '2.25',
            },
        } as unknown as NewBlockData;

        const card = buildBlockCard(21834102, block, NETWORKS.SEPOLIA);

        expect(card.title).toBe('Block 21,834,102');
        expect(card.subtitle).toBe('9 of 9 blobs, 100% full');
        expect(card.networkLabel).toBe('Ethereum Sepolia');
        expect(card.stats).toEqual([
            { label: 'Blobs', value: '9 of 9', accent: 'blue' },
            { label: 'Blobspace used', value: '100% full', accent: 'red' },
            { label: 'Blob base fee', value: '2.25 Gwei', accent: 'lightBlue' },
        ]);
    });

    it('builds the user card from server shares and wei cost', () => {
        const user: UserResponse = {
            network_id: 1,
            address: '0x1234567890abcdef1234567890abcdef12345678',
            name: 'Base',
            blob_count: 5000,
            total_cost_wei: '12300000000000000000',
            total_cost_eth: '12.3',
            last_timestamp: '2026-08-02T00:00:00Z',
            blob_share_percent: 41.2,
        };

        const card = buildUserCard(user.address, user);

        expect(card.title).toBe('Base');
        expect(card.subtitle).toBe('41.2% of all blobs, 12.3 ETH spent');
        expect(card.stats).toEqual([
            { label: 'Blobs sent', value: '5,000', accent: 'blue' },
            { label: 'Share of all blobs', value: '41.2%', accent: 'lightBlue' },
            { label: 'Total spend', value: '12.3 ETH', accent: 'green' },
        ]);
    });

    it('falls back to a truncated address for unattributed senders', () => {
        const user: UserResponse = {
            network_id: 1,
            address: '0x1234567890abcdef1234567890abcdef12345678',
            blob_count: 7,
            total_cost_eth: '',
            last_timestamp: '2026-08-02T00:00:00Z',
        };

        const card = buildUserCard(user.address, user);

        expect(card.title).toBe('0x1234...5678');
        expect(card.subtitle).toBe('7 blobs sent');
        expect(card.stats).toEqual([{ label: 'Blobs sent', value: '7', accent: 'blue' }]);
    });

    it('builds a branded fallback card with optional overrides', () => {
        expect(buildFallbackCard().title).toBe('BlobFlow');
        expect(buildFallbackCard().stats).toEqual([]);
        expect(buildFallbackCard({ title: 'Block 1' }, NETWORKS.SEPOLIA)).toMatchObject({
            title: 'Block 1',
            networkLabel: 'Ethereum Sepolia',
        });
    });
});
