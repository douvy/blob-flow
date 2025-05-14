import { StatsResponse } from '../../types';
import { fetchApi } from './core';
import { formatWeiToReadable } from '../../utils';

/**
 * Get network stats data
 * @param timeframe - Optional timeframe filter (24h, 7d, 30d, all)
 * @param network - Optional network parameter
 */
export async function getStats(timeframe?: '24h' | '7d' | '30d' | 'all', network?: string): Promise<StatsResponse> {
    const response = await fetchApi<any>(`/stats`, network);

    // Calculate blob vs calldata savings as a percentage
    const blobVsCalldataSavings = `${Math.round((1 - (response.data.blob_vs_calldata_cost || 0.5)) * 100)}% cheaper`;

    // Map the API response to our expected format
    return {
        data: {
            currentBlobBaseFee: formatWeiToReadable(response.data.current_base_fee || '0'),
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
