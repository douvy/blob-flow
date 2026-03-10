import { ApiResponse, BlobResponse } from '../../types';
import { fetchApi } from './core';

export interface ChartDataPoint {
    time: string;
    baseFee: number;
}

export interface CostDataPoint {
    time: string;
    blobCost: number;
}

export interface ChartData {
    baseFeeData: ChartDataPoint[];
    costData: CostDataPoint[];
}

/**
 * Fetches recent blobs and transforms them into time-series chart data.
 * Groups blobs by block and computes per-block averages.
 */
export async function getChartData(network?: string): Promise<ChartData> {
    const response = await fetchApi<ApiResponse<BlobResponse[]>>(
        `/blob/latest?limit=200`,
        network
    );

    const blobs = response.data;
    if (!blobs || blobs.length === 0) {
        return { baseFeeData: [], costData: [] };
    }

    // Group blobs by block number to get per-block aggregates
    const blockMap = new Map<number, {
        timestamp: string;
        baseFees: bigint[];
        costs: number[];
    }>();

    for (const blob of blobs) {
        const block = blob.block_number;
        if (!blockMap.has(block)) {
            blockMap.set(block, {
                timestamp: blob.timestamp,
                baseFees: [],
                costs: [],
            });
        }
        const entry = blockMap.get(block)!;

        if (blob.base_fee_per_blob_gas) {
            try {
                entry.baseFees.push(BigInt(blob.base_fee_per_blob_gas));
            } catch {
                // skip invalid values
            }
        }

        if (blob.total_cost_eth) {
            const cost = parseFloat(blob.total_cost_eth);
            if (!isNaN(cost)) {
                entry.costs.push(cost);
            }
        }
    }

    // Sort blocks chronologically (ascending)
    const sortedBlocks = Array.from(blockMap.entries())
        .sort(([a], [b]) => a - b);

    const baseFeeData: ChartDataPoint[] = [];
    const costData: CostDataPoint[] = [];

    for (const [, { timestamp, baseFees, costs }] of sortedBlocks) {
        const time = formatChartTime(timestamp);

        if (baseFees.length > 0) {
            const avgWei = baseFees.reduce((a, b) => a + b, BigInt(0)) / BigInt(baseFees.length);
            // Convert wei to gwei (1 gwei = 10^9 wei)
            const gwei = Number(avgWei) / 1e9;
            baseFeeData.push({ time, baseFee: parseFloat(gwei.toFixed(4)) });
        }

        if (costs.length > 0) {
            const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
            costData.push({ time, blobCost: parseFloat(avgCost.toFixed(6)) });
        }
    }

    return { baseFeeData, costData };
}

function formatChartTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
    });
}
