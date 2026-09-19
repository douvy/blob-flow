"use client";

import React from 'react';
import Link from '@/components/NetworkLink';
import { Hammer } from 'lucide-react';
import { builderDisplayName, builderPagePath } from '@/lib/builders';
import type { BlockBuilderResponse } from '@/types';

/**
 * How an unregistered builder's identity was guessed. Builders that publish
 * a marker in the block's extra data are keyed off it; the rest fall back to
 * the fee recipient address, which is the weaker signal of the two.
 */
function derivedSourceLabel(builder: BlockBuilderResponse): string {
  const extraData = builder.extra_data_text?.trim() || builder.extra_data?.trim() || '';
  const hasExtraData = extraData !== '' && extraData !== '0x';
  return hasExtraData ? 'extra data' : 'fee recipient';
}

/**
 * Inline builder attribution for a block: a hammer, then the builder's name
 * linking to its page. Renders nothing when the block has no attribution, so
 * callers can drop it in unconditionally and blocks the backfill has not
 * reached simply show nothing rather than a placeholder.
 *
 * Unregistered builders (the key was derived rather than matched against the
 * registry) are muted and monospaced, with a title saying where the guess
 * came from.
 */
export default function BuilderTag({
  builder,
  className = '',
  compact = false,
}: {
  builder?: BlockBuilderResponse;
  /** Extra classes for the wrapper, e.g. margins. */
  className?: string;
  /** Tighter type and icon, for table rows and dense feeds. */
  compact?: boolean;
}) {
  if (!builder) return null;

  const name = builderDisplayName(builder);
  const title = builder.known
    ? `Built by ${name}`
    : `Unregistered builder: derived from ${derivedSourceLabel(builder)}`;
  const iconClass = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const textClass = compact ? 'text-xs' : 'text-sm';
  const nameClass = builder.known ? 'text-blue' : 'font-mono text-[#8a93a5]';

  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${textClass} ${className}`} title={title}>
      <Hammer className={`${iconClass} shrink-0 text-[#6e7787]`} aria-hidden="true" />
      <Link
        href={builderPagePath(builder.key)}
        className={`truncate hover:underline ${nameClass}`}
        // Block feeds make the whole row clickable, so a click on the builder
        // must not also toggle or navigate the row around it.
        onClick={(event) => event.stopPropagation()}
      >
        {name}
      </Link>
    </span>
  );
}
