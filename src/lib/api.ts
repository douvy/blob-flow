import { API_BASE_URL } from '../constants';

/**
 * Fetches data from the API
 * @param endpoint - API endpoint to fetch from
 * @param options - Fetch options
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

/**
 * API methods for different endpoints
 */
export const api = {
  /**
   * Get recent blocks
   */
  getRecentBlocks: () => fetchApi('/blocks/recent'),
  
  /**
   * Get specific block by hash
   */
  getBlockByHash: (hash: string) => fetchApi(`/blocks/${hash}`),
  
  /**
   * Get recent transactions
   */
  getRecentTransactions: () => fetchApi('/transactions/recent'),
  
  /**
   * Get metrics data
   */
  getMetrics: () => fetchApi('/metrics'),
};

export default api;