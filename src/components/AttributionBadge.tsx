"use client";

import Image from 'next/image';
import React from 'react';
import {
  getAttributionImageSrc,
  getAttributionInitial,
  getAttributionTestnetLabel,
} from '../utils';

/**
 * Provider/L2 logo for an attributed user, falling back to an initial for
 * unknown senders. Always decorative; render the name alongside it.
 *
 * Testnet entities reuse their mainnet brand marks, so those badges carry a
 * small amber corner dot naming the network in its tooltip.
 */
export default function AttributionBadge({
  user,
  sizeClass,
  className = '',
  textClass = 'text-[9px]',
  px = 20,
}: {
  user: string;
  sizeClass: string;
  /** Extra classes for the wrapper, e.g. margins. */
  className?: string;
  /** Font size of the fallback initial. */
  textClass?: string;
  /** Intrinsic pixel size requested from the image optimizer. */
  px?: number;
}) {
  const imageSrc = getAttributionImageSrc(user);
  const testnetLabel = getAttributionTestnetLabel(user);

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
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
      {testnetLabel && (
        <span
          aria-hidden
          title={`${testnetLabel} testnet`}
          className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 ring-1 ring-black/60"
        />
      )}
    </span>
  );
}
