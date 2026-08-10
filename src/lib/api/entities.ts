import {
    ApiResponse,
    BackendEntityResponse,
    EntityDetail,
} from '../../types';
import { slugifyEntity } from '../statCard';
import { fetchApi, isNotFoundError } from './core';

export function transformEntityResponse(entity: BackendEntityResponse): EntityDetail {
    return {
        key: entity.key,
        // The backend key is underscore form; page URLs use the hyphen form,
        // which the endpoint canonicalizes back on request.
        slug: slugifyEntity(entity.key) || entity.key,
        name: entity.name,
        category: entity.category,
        addresses: entity.addresses.map((address) => ({
            address: address.address,
            dataCount: address.blob_count,
            totalCostEth: address.total_cost_eth,
            totalCostWei: address.total_cost_wei,
            lastTimestamp: address.last_timestamp ?? null,
            inRegistry: address.in_registry,
        })),
        totalDataCount: entity.blob_count,
        totalCostWei: entity.total_cost_wei,
        totalCostEth: entity.total_cost_eth,
        lastTimestamp: entity.last_timestamp ?? null,
        blobSharePercent: entity.blob_share_percent,
        spendSharePercent: entity.spend_share_percent,
    };
}

/**
 * Get an attributed entity by its URL slug: metadata, aggregates across
 * every attributed address, and the per-address breakdown (busiest first,
 * including registry addresses with no indexed activity).
 *
 * The endpoint canonicalizes any spelling of the key through the same slug
 * function that mints it, so the page's hyphenated slug resolves without
 * translation. Returns null when no attributed entity matches, mirroring
 * getUserByAddress's null for an unknown address.
 *
 * @param slug - Entity page slug (hyphen form) or backend key
 * @param network - Optional network parameter
 */
export async function getEntityBySlug(
    slug: string,
    network?: string
): Promise<EntityDetail | null> {
    const normalized = slugifyEntity(slug);
    if (!normalized) return null;

    try {
        const response = await fetchApi<ApiResponse<BackendEntityResponse>>(
            `/entities/${encodeURIComponent(normalized)}`,
            network
        );
        return transformEntityResponse(response.data);
    } catch (error) {
        if (isNotFoundError(error)) {
            return null;
        }
        throw error;
    }
}
