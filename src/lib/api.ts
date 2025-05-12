import { API_BASE_URL } from '../constants';
import {
  Block,
  LatestBlocksResponse,
  MempoolResponse,
  StatsResponse,
  TopUsersResponse,
  User
} from '../types';

/**
 * Configuration for API requests including timeout and retry logic
 */
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

/**
 * Fetches data from the API with timeout, retry, and error handling
 * @param endpoint - API endpoint to fetch from
 * @param options - Fetch options
 * @param timeoutMs - Request timeout in milliseconds
 * @param retries - Number of retries for failed requests
 */
async function fetchApi<T>(
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
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      
      // Retry network errors
      if (
        error.message.includes('network') && 
        retries < MAX_RETRIES
      ) {
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchApi<T>(endpoint, options, timeoutMs, retries + 1);
      }
    }
    
    console.error('API fetch error:', error);
    throw error;
  }
}

/**
 * API methods for different endpoints with strong typing
 */
export const api = {
  /**
   * Get latest blocks with pagination
   * @param page - Page number (starts at 1)
   * @param limit - Number of items per page
   */
  getLatestBlocks: (page = 1, limit = 10) => 
    fetchApi<LatestBlocksResponse>(`/latest?page=${page}&limit=${limit}`),
  
  /**
   * Get specific block by number
   * @param blockNumber - Block number to retrieve
   */
  getBlockByNumber: (blockNumber: string) => 
    fetchApi<{ data: Block }>(`/latest/${blockNumber}`),
  
  /**
   * Get network stats data
   * @param timeframe - Optional timeframe filter (24h, 7d, 30d, all)
   */
  getStats: (timeframe?: '24h' | '7d' | '30d' | 'all') => {
    const query = timeframe ? `?timeframe=${timeframe}` : '';
    return fetchApi<StatsResponse>(`/stats${query}`);
  },
  
  /**
   * Get mempool data (pending transactions) with pagination
   * @param page - Page number (starts at 1)
   * @param limit - Number of items per page
   */
  getMempool: (page = 1, limit = 5) => 
    fetchApi<MempoolResponse>(`/mempool?page=${page}&limit=${limit}`),
  
  /**
   * Get top users data with pagination
   * @param page - Page number (starts at 1)
   * @param limit - Number of items per page
   */
  getTopUsers: (page = 1, limit = 5) => 
    fetchApi<TopUsersResponse>(`/users?page=${page}&limit=${limit}`),
  
  /**
   * Get specific user details by ID
   * @param userId - User ID to retrieve
   */
  getUserById: (userId: number) => 
    fetchApi<{ data: User }>(`/users/${userId}`),
};

export default api;