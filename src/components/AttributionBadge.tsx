"use client";

import Image from 'next/image';
import React from 'react';
import { getAttributionImageSrc, getAttributionInitial } from '../utils';

/**
 * Provider/L2 logo for an attributed user, falling back to an initial for
 * unknown senders. Always decorative; render the name alongside it.
 */
export default function AttributionBadge({
  user,
  sizeClass,
}: {
  user: string;
  sizeClass: string;
}) {
  const imageSrc = getAttributionImageSrc(user);

  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt=""
        width={20}
        height={20}
        className={`${sizeClass} shrink-0 rounded-full`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full bg-gray-500 text-[9px] font-medium text-white`}
    >
      {getAttributionInitial(user)}
    </span>
  );
}
