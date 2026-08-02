"use client";

import Image from 'next/image';
import React from 'react';
import {
  getAttributionImageSrc,
  getAttributionInitial,
  getAttributionTestnetLabel,
} from '../utils';

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
  const imageSrc = getAttributionImageSrc(user);
  const testnetLabel = getAttributionTestnetLabel(user);

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} title={title}>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          width={px}
          height={px}
          className={`${sizeClass} shrink-0 rounded-full`}
          // The optimizer refuses SVGs without dangerouslyAllowSVG; the
          // vector registry icons are tiny, so serve them as-is instead.
          unoptimized={imageSrc.endsWith('.svg')}
        />
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
