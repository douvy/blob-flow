import { slugifyEntity } from './statCard';

/**
 * Path of the entity page for an attributed display name, or null when the
 * name cannot make a slug (so callers can fall back to an address page or
 * plain text). Network scoping stays with the caller: NetworkLink handles it
 * for anchors, router pushes wrap with networkPath.
 */
export function entityPagePath(name: string): string | null {
    const slug = slugifyEntity(name);
    return slug ? `/entity/${slug}` : null;
}
