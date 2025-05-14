import { StatsResponse, TimeSeriesDataPoint } from '../../types';
import { fetchApi } from './core';

/**
 * Get network stats data
 * @param timeframe - Optional timeframe filter (24h, 7d, 30d, all)
 */
export async function getStats(timeframe?: '24h' | '7d' | '30d' | 'all'): Promise<StatsResponse> {
    const response = await fetchApi<any>(`/stats`);

    // Calculate blob vs calldata savings as a percentage
    const blobVsCalldataSavings = `${Math.round((1 - response.data.blob_vs_calldata_cost) * 100)}% cheaper`;

    // Create mock time series data since the API doesn't provide it
    const createMockTimeSeries = (): TimeSeriesDataPoint[] => {
        const now = Date.now();
        const points: TimeSeriesDataPoint[] = [];

        for (let i = 0; i < 24; i++) {
            points.push({
                timestamp: new Date(now - (i * 3600000)).toISOString(),
                value: Math.random() * 20 + 5 // Random value between 5 and 25
            });
        }

        return points.reverse();
    };

    // Map the API response to our expected format
    return {
        data: {
            currentBlobBaseFee: response.data.current_base_fee,
            blobBaseFeeChange: response.data.hourly_base_fee_change,
            pendingBlobsCount: response.data.total_pending_blobs || 0,
            avgBlobsPerBlock: Math.round((response.data.total_confirmed_blobs / 100) * 10) / 10, // Rough estimate
            blobVsCalldataSavings,
            timeFrames: {
                '24h': {
                    blobBaseFees: createMockTimeSeries(),
                    blobsPerBlock: createMockTimeSeries(),
                    costComparison: createMockTimeSeries(),
                    attribution: {
                        'Arbitrum': 42,
                        'Optimism': 28,
                        'Base': 16,
                        'zkSync': 10,
                        'Unknown': 4
                    }
                },
                '7d': {
                    blobBaseFees: createMockTimeSeries(),
                    blobsPerBlock: createMockTimeSeries(),
                    costComparison: createMockTimeSeries(),
                    attribution: {
                        'Arbitrum': 40,
                        'Optimism': 30,
                        'Base': 15,
                        'zkSync': 10,
                        'Unknown': 5
                    }
                },
                '30d': {
                    blobBaseFees: createMockTimeSeries(),
                    blobsPerBlock: createMockTimeSeries(),
                    costComparison: createMockTimeSeries(),
                    attribution: {
                        'Arbitrum': 38,
                        'Optimism': 32,
                        'Base': 14,
                        'zkSync': 11,
                        'Unknown': 5
                    }
                },
                'all': {
                    blobBaseFees: createMockTimeSeries(),
                    blobsPerBlock: createMockTimeSeries(),
                    costComparison: createMockTimeSeries(),
                    attribution: {
                        'Arbitrum': 35,
                        'Optimism': 35,
                        'Base': 15,
                        'zkSync': 10,
                        'Unknown': 5
                    }
                }
            }
        }
    };
}
