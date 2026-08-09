"use client";

import Image from 'next/image';
import React from 'react';
import { useNetwork } from '../hooks/useNetwork';
import {
  attributionNeedsLightBackdrop,
  getAttributionImageSrc,
  getAttributionInitial,
  getAttributionTestnetLabel,
} from '../utils';

/**
 * Hairline outline drawn just inside the badge circle. Brand marks that are
 * dark all the way to their edge (Shape's black disc, X Layer, Blast) have
 * nothing to separate them from the #121316 page without it, and recoloring
 * the artwork is not an option. Rendered as an overlay rather than a ring on
 * the image itself, because an inset shadow on a replaced element is painted
 * underneath the image content.
 */
const ICON_OUTLINE = 'pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/12';

/**
 * Light disc behind a dark logo that leaves its circle see-through, so the
 * glyph reads as dark-on-light instead of dark-on-dark. The padding keeps a
 * sliver of backdrop visible at the edge, between the artwork and the
 * outline.
 */
const ICON_BACKDROP = 'bg-white/90 p-px';

/**
 * Amber strip naming a testnet, overlaid on the bottom edge of an entity
 * icon. Testnet entities reuse their mainnet brand marks, so the logo alone
 * cannot identify them; the ribbon makes the network explicit wherever an
 * icon renders. Position it inside a `relative` container.
 */
export function TestnetRibbon({ label, px }: { label: string; px: number }) {
  return (
    <span
      title={`${label} testnet`}
      className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-amber-400 px-0.5 font-semibold uppercase leading-normal text-black ring-1 ring-black/60"
      // The ribbon tracks the icon size so it stays legible on large
      // badges without swallowing the small table ones.
      style={{ fontSize: `${Math.max(6, Math.round(px * 0.25))}px` }}
    >
      {label}
    </span>
  );
}

/**
 * Provider/L2 logo for an attributed user, falling back to an initial for
 * unknown senders. Decorative by default; render the name alongside it or
 * pass a title for icon-only contexts.
 *
 * Testnet entities carry a TestnetRibbon naming the network (e.g. SEPOLIA).
 * Unknown senders inherit the ribbon from the selected network, so their
 * placeholder initials are marked on testnets too.
 */
export default function AttributionBadge({
  user,
  sizeClass,
  className = '',
  textClass = 'text-[9px]',
  px = 20,
  title,
  showTestnetLabel = true,
}: {
  user: string;
  sizeClass: string;
  /** Extra classes for the wrapper, e.g. margins. */
  className?: string;
  /** Font size of the fallback initial. */
  textClass?: string;
  /** Intrinsic pixel size requested from the image optimizer. */
  px?: number;
  /** Tooltip for icon-only contexts where the name is not shown alongside. */
  title?: string;
  /** Set false only when the caller overlays a shared ribbon of its own. */
  showTestnetLabel?: boolean;
}) {
  const { selectedNetwork } = useNetwork();
  const imageSrc = getAttributionImageSrc(user);
  const testnetLabel = getAttributionTestnetLabel(user, selectedNetwork);
  const backdrop = attributionNeedsLightBackdrop(user) ? ICON_BACKDROP : '';

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} title={title}>
      {imageSrc ? (
        <>
          <Image
            src={imageSrc}
            alt=""
            width={px}
            height={px}
            className={`${sizeClass} shrink-0 rounded-full ${backdrop}`}
            // The optimizer refuses SVGs without dangerouslyAllowSVG; the
            // vector registry icons are tiny, so serve them as-is instead.
            unoptimized={imageSrc.endsWith('.svg')}
          />
          <span aria-hidden="true" className={ICON_OUTLINE} />
        </>
      ) : (
        <span
          className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full bg-gray-500 ${textClass} font-medium text-white`}
        >
          {getAttributionInitial(user)}
        </span>
      )}
      {showTestnetLabel && testnetLabel && (
        <TestnetRibbon label={testnetLabel} px={px} />
      )}
    </span>
  );
}
