import { API_BASE_URL } from '../constants';
import {
  Block,
  LatestBlocksResponse,
  MempoolResponse, 
  StatsResponse,
  TopUsersResponse,
  User,
  UserDetail
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
  
  // Always use mock data for now (both development and production)
  // You can change this back to environment-based logic later when you have a real API
  if (true) {
    // Create a simple mock that returns empty data but with proper structure
    console.log(`[DEV MODE] Simulating API call to: ${endpoint}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data based on endpoint
    if (endpoint.includes('/latest')) {
      return {
        data: [
          {
            id: 1,
            number: '19342751',
            blobCount: 6,
            timestamp: '30 sec ago',
            attribution: ['Arbitrum', 'Base']
          },
          {
            id: 2,
            number: '19342750',
            blobCount: 12,
            timestamp: '1 min ago',
            attribution: ['Arbitrum', 'Optimism', 'Base']
          },
          {
            id: 3,
            number: '19342749',
            blobCount: 3,
            timestamp: '2 min ago',
            attribution: ['Optimism']
          },
          {
            id: 4,
            number: '19342748',
            blobCount: 8,
            timestamp: '3 min ago',
            attribution: ['Arbitrum', 'zkSync']
          },
          {
            id: 5,
            number: '19342747',
            blobCount: 16,
            timestamp: '4 min ago',
            attribution: ['Optimism', 'Base', 'zkSync']
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 2,
          totalItems: 10,
          itemsPerPage: 5
        }
      } as T;
    }
    
    if (endpoint.includes('/stats')) {
      return {
        data: {
          currentBlobBaseFee: '12.45 gwei',
          blobBaseFeeChange: 0.8,
          pendingBlobsCount: 237,
          avgBlobsPerBlock: 16.4,
          blobVsCalldataSavings: '72% cheaper',
          timeFrames: {
            '24h': { blobBaseFees: [], blobsPerBlock: [], costComparison: [], attribution: {} },
            '7d': { blobBaseFees: [], blobsPerBlock: [], costComparison: [], attribution: {} },
            '30d': { blobBaseFees: [], blobsPerBlock: [], costComparison: [], attribution: {} },
            'all': { blobBaseFees: [], blobsPerBlock: [], costComparison: [], attribution: {} }
          }
        }
      } as T;
    }
    
    if (endpoint.includes('/mempool')) {
      return {
        data: [
          {
            id: 1,
            txHash: '0xabcd1234efgh5678ijkl9012mnop3456qrst7890',
            fromAddress: '0xDEF456...',
            user: 'Arbitrum',
            blobCount: 3,
            estimatedCost: '0.00123 ETH',
            timeInMempool: '45 sec'
          },
          {
            id: 2,
            txHash: '0xuvwx5678yz901234abcd5678efgh9012ijkl3456',
            fromAddress: '0xABC123...',
            user: 'Optimism',
            blobCount: 2,
            estimatedCost: '0.00089 ETH',
            timeInMempool: '2 min'
          },
          {
            id: 3,
            txHash: '0xmnop9012qrst3456uvwx7890yz901234abcd5678',
            fromAddress: '0x789EFG...',
            user: 'Base',
            blobCount: 1,
            estimatedCost: '0.00042 ETH',
            timeInMempool: '1 min'
          },
          {
            id: 4,
            txHash: '0xefgh3456ijkl7890mnop1234qrst5678uvwx9012',
            fromAddress: '0x456HIJ...',
            user: null,
            blobCount: 4,
            estimatedCost: '0.00157 ETH',
            timeInMempool: '30 sec'
          },
          {
            id: 5,
            txHash: '0xyzab5678cdef9012ghij3456klmn7890opqr1234',
            fromAddress: '0x123KLM...',
            user: 'zkSync',
            blobCount: 2,
            estimatedCost: '0.00098 ETH',
            timeInMempool: '5 min'
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 5,
          itemsPerPage: 5
        }
      } as T;
    }
    
    if (endpoint.includes('/users')) {
      if (endpoint.match(/\/users\/\d+/)) {
        return {
          data: {
            id: 1,
            name: 'Arbitrum',
            dataCount: 423,
            percentage: 42.3,
            dataIds: ['0xabcd...1234'],
            transactions: [
              {
                id: '0xabcd1234efgh5678',
                status: 'confirmed',
                cost: '0.00123 ETH',
                blockNumber: '19342751',
                timestamp: '30 sec ago'
              },
              {
                id: '0xijkl9012mnop3456',
                status: 'confirmed',
                cost: '0.00098 ETH',
                blockNumber: '19342749',
                timestamp: '2 min ago'
              },
              {
                id: '0xqrst7890uvwx1234',
                status: 'pending',
                cost: '0.00145 ETH',
                timestamp: '1 min ago'
              },
              {
                id: '0xyzab5678cdef9012',
                status: 'confirmed',
                cost: '0.00087 ETH',
                blockNumber: '19342747',
                timestamp: '4 min ago'
              },
              {
                id: '0xghij3456klmn7890',
                status: 'confirmed',
                cost: '0.00112 ETH',
                blockNumber: '19342745',
                timestamp: '6 min ago'
              }
            ],
            totalCost: '0.01 ETH',
            avgCostPerBlob: '0.001 ETH',
            firstSeen: '2 days ago',
            latestActivity: '30 min ago'
          }
        } as T;
      }
      
      return {
        data: [
          {
            id: 1,
            name: 'Arbitrum',
            dataCount: 423,
            percentage: 42.3,
            dataIds: ['0xabcd...1234']
          },
          {
            id: 2,
            name: 'Optimism',
            dataCount: 287,
            percentage: 28.7,
            dataIds: ['0xbeef...4321']
          },
          {
            id: 3,
            name: 'Base',
            dataCount: 156,
            percentage: 15.6,
            dataIds: ['0xface...cafb']
          },
          {
            id: 4,
            name: 'zkSync',
            dataCount: 98,
            percentage: 9.8,
            dataIds: ['0x1111...2222']
          },
          {
            id: 5,
            name: 'Unknown',
            dataCount: 36,
            percentage: 3.6,
            dataIds: ['0xaaaa...bbbb']
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 5,
          itemsPerPage: 5
        }
      } as T;
    }
    
    // Default empty response
    return {} as T;
  }
  
  // Create abort controller for timeout for real API calls
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
    fetchApi<{ data: UserDetail }>(`/users/${userId}`),
};

export default api;