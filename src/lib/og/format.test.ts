import type {
    BackendAttributionUsageChartResponse,
    BackendBlobPricingResponse,
    BackendStatsWindowsResponse,
    NewBlockData,
    UserResponse,
} from '@/types';
import {
    buildBlockCard,
    buildChartCard,
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

    it('builds the home card from pricing and attribution for the given scope', () => {
        const attribution = makeAttribution([{ name: 'Base', blob_share_percent: 41.2 }]);

        const card = buildHomeCard(
            { pricing, attribution },
            { network: 'mainnet', range: '24h' }
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

    it('defaults the home card to the default network and range', () => {
        const attribution = makeAttribution([{ name: 'Base', blob_share_percent: 41.2 }]);

        const card = buildHomeCard({ pricing, attribution });

        expect(card!.subtitle).toBe('Base 41.2% of blobs (1h)');
        expect(card!.stats[2].label).toBe('Blobs (1h)');
        expect(card!.networkLabel).toBe('Ethereum Mainnet');
    });

    it('names a non-default network on the card so a testnet unfurl is obvious', () => {
        const attribution = makeAttribution([{ name: 'Base', blob_share_percent: 41.2 }]);

        const card = buildHomeCard(
            { pricing, attribution },
            { network: 'sepolia', range: '1h' }
        );

        expect(card!.networkLabel).toBe('Ethereum Sepolia');
    });

    it('falls back to the default network label for a malformed network', () => {
        expect(ogNetworkLabel('../etc/passwd')).toBe('Ethereum Mainnet');
        expect(ogNetworkLabel()).toBe('Ethereum Mainnet');
    });

    it('returns null for the home card without pricing data', () => {
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

        const card = buildBlockCard(21834102, block, 'sepolia');

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

    it('falls back to a truncated address for unattributed users', () => {
        const user: UserResponse = {
            network_id: 1,
            address: '0x1234567890abcdef1234567890abcdef12345678',
            blob_count: 7,
            total_cost_eth: '',
            last_timestamp: '2026-08-02T00:00:00Z',
        };

        const card = buildUserCard(user.address, user);

        expect(card.title).toBe('0x1234...5678');
        expect(card.subtitle).toBe('7 blobs sent on Ethereum');
        expect(card.stats).toEqual([{ label: 'Blobs sent', value: '7', accent: 'blue' }]);
    });

    it('builds the rolling stats chart card from windows', () => {
        const windows: BackendStatsWindowsResponse = {
            network_id: 1,
            network_name: 'mainnet',
            generated_at: '2026-08-02T00:00:00Z',
            windows: [
                {
                    window: '24h',
                    duration_seconds: 86400,
                    start_time: '2026-08-01T00:00:00Z',
                    end_time: '2026-08-02T00:00:00Z',
                    average_blob_base_fee_wei: '1500000000',
                    total_blobs: 21000,
                    total_blob_gas_used: 0,
                    average_utilization: '0.5',
                    unique_senders: 87,
                },
                {
                    window: '7d',
                    duration_seconds: 604800,
                    start_time: '2026-07-26T00:00:00Z',
                    end_time: '2026-08-02T00:00:00Z',
                    total_blobs: 150000,
                    total_blob_gas_used: 0,
                    average_utilization: '0.5',
                    unique_senders: 120,
                },
            ],
        };

        const card = buildChartCard('rolling-market-stats', windows);

        expect(card).not.toBeNull();
        expect(card!.title).toBe('21,000 blobs in 24h');
        expect(card!.stats).toEqual([
            { label: '24h avg fee', value: '1.5 Gwei', accent: 'lightBlue' },
            { label: '24h unique senders', value: '87', accent: 'blue' },
            { label: '7d blobs', value: '150,000', accent: 'green' },
        ]);
    });

    it('labels chart cards with the requested range', () => {
        const chart = {
            summary: {
                current_base_fee_gwei: '1.5',
                average_blob_base_fee_gwei: '1.2',
                median_blob_base_fee_gwei: '1.1',
                p95_blob_base_fee_gwei: '2.0',
                total_blobs: 900,
                total_blob_gas_used: 0,
                average_utilization: '0.5',
                total_cost_wei: '0',
                unique_senders: 12,
            },
        } as unknown as Parameters<typeof buildChartCard>[1];

        const card = buildChartCard('base-fee', chart, { network: 'mainnet', range: '7d' });

        expect(card!.eyebrow).toBe('Blob base fee, last 7d');
        expect(card!.stats.map((stat) => stat.label)).toEqual([
            '7d average',
            '7d p95',
            '7d blobs',
        ]);
    });

    it('builds the blob-share card from the same attribution data as blob-usage', () => {
        const attribution = makeAttribution([
            { name: 'Base', blob_share_percent: 30 },
            { name: 'Arbitrum One', blob_share_percent: 20 },
        ]);

        const card = buildChartCard('blob-share', attribution, {
            network: 'mainnet',
            range: '7d',
        });

        expect(card).not.toBeNull();
        expect(card!.title).toBe('12,345 blobs');
        expect(card!.stats.map((stat) => stat.label)).toEqual(['Base', 'Arbitrum One']);
    });

    it('returns null for unknown chart slugs and missing data', () => {
        expect(buildChartCard('not-a-chart', makeAttribution([]))).toBeNull();
        expect(buildChartCard('base-fee', null)).toBeNull();
    });

    it('builds a branded fallback card with optional overrides', () => {
        expect(buildFallbackCard().title).toBe('BlobFlow');
        expect(buildFallbackCard({ title: 'Block 1' }).title).toBe('Block 1');
        expect(buildFallbackCard().stats).toEqual([]);
    });
});
