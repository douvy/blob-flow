import {
    ApiResponse,
    BackendEntityResponse,
    BlobResponse,
    EntityDetail,
} from '../../types';
import { slugifyEntity } from '../statCard';
import { fetchApi, isNotFoundError } from './core';
import { getUserBlobs } from './users';

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

/**
 * Get one merged blob list across several sender addresses, newest first.
 *
 * The blob list endpoints filter by a single `from` address, so an entity's
 * aggregated view fans out one request per address and merges client-side.
 * Each per-address request uses the full `limit`, so the merged top `limit`
 * is exact: no blob that belongs in it can be hiding past an address's cap.
 * Callers bound the fan-out by passing a capped address list.
 *
 * @param addresses - Sender addresses to merge (deduplicated here)
 * @param confirmed - true for confirmed blobs, false for mempool
 * @param limit - Number of blobs to return after the merge
 * @param network - Optional network parameter
 */
export async function getEntityBlobs(
    addresses: string[],
    confirmed: boolean,
    limit = 20,
    network?: string
): Promise<BlobResponse[]> {
    const unique = [...new Set(addresses)];
    if (unique.length === 0) return [];

    const lists = await Promise.all(
        unique.map((address) => getUserBlobs(address, confirmed, limit, network))
    );

    return lists
        .flat()
        .sort((a, b) => {
            const byTime = Date.parse(b.timestamp) - Date.parse(a.timestamp);
            if (byTime) return byTime;
            // Same-second blobs: keep block then index order stable.
            const byBlock = (b.block_number ?? 0) - (a.block_number ?? 0);
            if (byBlock) return byBlock;
            return a.blob_index - b.blob_index;
        })
        .slice(0, limit);
}
