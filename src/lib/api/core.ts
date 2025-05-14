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
        throw new Error('API request failed');
    }
}
