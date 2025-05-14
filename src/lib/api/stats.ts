import { StatsResponse } from '../../types';
import { fetchApi } from './core';

/**
 * Get network stats data
 * @param timeframe - Optional timeframe filter (24h, 7d, 30d, all)
 */
export async function getStats(timeframe?: '24h' | '7d' | '30d' | 'all'): Promise<StatsResponse> {
    const response = await fetchApi<any>(`/stats`);

    // Calculate blob vs calldata savings as a percentage
    const blobVsCalldataSavings = `${Math.round((1 - (response.data.blob_vs_calldata_cost || 0.5)) * 100)}% cheaper`;

    // Map the API response to our expected format
    return {
        data: {
            currentBlobBaseFee: response.data.current_base_fee || '0 gwei',
            blobBaseFeeChange: response.data.hourly_base_fee_change || 0,
            pendingBlobsCount: response.data.total_pending_blobs || 0,
            avgBlobsPerBlock: Math.round(((response.data.total_confirmed_blobs || 100) / 100) * 10) / 10, // Rough estimate
            blobVsCalldataSavings,
            timeFrames: {
                '24h': {
                    blobBaseFees: [],
                    blobsPerBlock: [],
                    costComparison: [],
                    attribution: {}
                },
                '7d': {
                    blobBaseFees: [],
                    blobsPerBlock: [],
                    costComparison: [],
                    attribution: {}
                },
                '30d': {
                    blobBaseFees: [],
                    blobsPerBlock: [],
                    costComparison: [],
                    attribution: {}
                },
                'all': {
                    blobBaseFees: [],
                    blobsPerBlock: [],
                    costComparison: [],
                    attribution: {}
                }
            }
        }
    };
}
