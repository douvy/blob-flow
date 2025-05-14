import { API_BASE_URL } from '../../constants';

/**
 * Configuration for API requests including timeout and retry logic
 */
export const DEFAULT_TIMEOUT_MS = 10000;
export const MAX_RETRIES = 2;

/**
 * Helper function to format relative time
 */
export function formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) {
        return `${diffSeconds} sec ago`;
    } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        return `${minutes} min ago`;
    } else if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

/**
 * Helper function to truncate address
 */
export function truncateAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...`;
}

/**
 * Fetches data from the API with timeout, retry, and error handling
 * @param endpoint - API endpoint to fetch from
 * @param options - Fetch options
 * @param timeoutMs - Request timeout in milliseconds
 * @param retries - Number of retries for failed requests
 */
export async function fetchApi<T>(
    endpoint: string,
    options?: RequestInit,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    retries: number = 0
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Merge options with abort signal
    const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        }
    };

    try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status >= 500 && retries < MAX_RETRIES) {
                // Server error, retry with exponential backoff
                const delay = Math.pow(2, retries) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchApi<T>(endpoint, options, timeoutMs, retries + 1);
            }

            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        console.error('API fetch error:', error);

        // If we're in development, return mock data for easier testing
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEV MODE] Returning mock data for: ${endpoint}`);
            return getMockData(endpoint) as T;
        }

        throw new Error('API request failed');
    }
}

/**
 * Get mock data for development and fallback
 */
export function getMockData(endpoint: string): any {
    // Return mock data based on endpoint
    if (endpoint.includes('/blob/latest')) {
        return {
            data: [
                {
                    tx_hash: '0xabcd1234efgh5678ijkl9012mnop3456qrst7890',
                    block_number: 19342751,
                    from_address: '0xDEF456...',
                    blob_index: 0,
                    blob_size_bytes: 128000,
                    timestamp: new Date(Date.now() - 30000).toISOString(),
                    user_attribution: 'Arbitrum'
                },
                {
                    tx_hash: '0xuvwx5678yz901234abcd5678efgh9012ijkl3456',
                    block_number: 19342750,
                    from_address: '0xABC123...',
                    blob_index: 1,
                    blob_size_bytes: 96000,
                    timestamp: new Date(Date.now() - 60000).toISOString(),
                    user_attribution: 'Optimism'
                }
            ],
            pagination: {
                has_next: true,
                has_previous: false,
                items_per_page: 10,
                next_cursor: 'next_page_cursor',
                previous_cursor: null,
                total_items: 100
            },
            success: true
        };
    }

    if (endpoint.includes('/stats')) {
        return {
            data: {
                current_base_fee: '12.45 gwei',
                hourly_base_fee_change: 0.8,
                pending_blobs_count: 237,
                average_base_fee: '10.2 gwei',
                average_tip: '1.5 gwei',
                average_total_cost: '0.00123 ETH',
                blob_vs_calldata_cost: 0.28,
                total_blobs: 1250,
                total_confirmed_blobs: 1000,
                last_indexed_block: 19342751,
                last_indexed_time: new Date().toISOString(),
                network_id: 1,
                network_name: 'Ethereum'
            },
            success: true
        };
    }

    if (endpoint.includes('/blob/mempool')) {
        return {
            data: [
                {
                    tx_hash: '0xabcd1234efgh5678ijkl9012mnop3456qrst7890',
                    from_address: '0xDEF456...',
                    blob_index: 0,
                    blob_size_bytes: 128000,
                    timestamp: new Date(Date.now() - 45000).toISOString(),
                    user_attribution: 'Arbitrum',
                    confirmed: false,
                    total_cost_eth: '0.00123'
                },
                {
                    tx_hash: '0xuvwx5678yz901234abcd5678efgh9012ijkl3456',
                    from_address: '0xABC123...',
                    blob_index: 0,
                    blob_size_bytes: 96000,
                    timestamp: new Date(Date.now() - 120000).toISOString(),
                    user_attribution: 'Optimism',
                    confirmed: false,
                    total_cost_eth: '0.00089'
                }
            ],
            pagination: {
                has_next: false,
                has_previous: false,
                items_per_page: 10,
                next_cursor: null,
                previous_cursor: null,
                total_items: 2
            },
            success: true
        };
    }

    if (endpoint.includes('/users')) {
        if (endpoint.match(/\/users\/\d+/)) {
            return {
                data: {
                    address: '0x1234567890abcdef1234567890abcdef12345678',
                    name: 'Arbitrum',
                    blob_count: 423,
                    last_timestamp: new Date(Date.now() - 1800000).toISOString(),
                    network_id: 1,
                    network_name: 'Ethereum',
                    total_cost_eth: '0.01'
                },
                success: true
            };
        }

        return {
            data: [
                {
                    address: '0x1234567890abcdef1234567890abcdef12345678',
                    name: 'Arbitrum',
                    blob_count: 423,
                    last_timestamp: new Date(Date.now() - 1800000).toISOString(),
                    network_id: 1,
                    network_name: 'Ethereum',
                    total_cost_eth: '0.01'
                },
                {
                    address: '0xabcdef1234567890abcdef1234567890abcdef12',
                    name: 'Optimism',
                    blob_count: 287,
                    last_timestamp: new Date(Date.now() - 3600000).toISOString(),
                    network_id: 1,
                    network_name: 'Ethereum',
                    total_cost_eth: '0.0075'
                }
            ],
            pagination: {
                has_next: false,
                has_previous: false,
                items_per_page: 10,
                next_cursor: null,
                previous_cursor: null,
                total_items: 2
            },
            success: true
        };
    }

    // Default empty response
    return { data: [], success: true };
}
