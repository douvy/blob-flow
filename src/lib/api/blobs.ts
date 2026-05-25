import { ApiResponse, BlobPricingResponse, BlobResponse } from '../../types';
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

/**
 * Fetch current blob fee-market pricing and recent block utilization.
 */
export async function getBlobPricing(
  blocks = 120,
  network?: string
): Promise<BlobPricingResponse> {
  const response = await fetchApi<ApiResponse<BlobPricingResponse>>(
    `/blob/pricing?blocks=${blocks}`,
    network
  );

  return response.data;
}
