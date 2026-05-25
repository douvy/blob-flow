import { ApiResponse, BlobResponse } from '../../types';
import { fetchApi } from './core';

/**
 * Fetch raw blob records for chart data aggregation.
 * Returns unprocessed BlobResponse[] for client-side bucketing.
 */
export async function getRawBlobs(
  limit = 200,
  network?: string
): Promise<BlobResponse[]> {
  const response = await fetchApi<ApiResponse<BlobResponse[]>>(
    `/blob/latest?limit=${limit}`,
    network
  );
  return response.data;
}
