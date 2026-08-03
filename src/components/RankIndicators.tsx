"use client";

import React from 'react';
import { ChevronDown, ChevronUp, Minus } from 'lucide-react';
import type { RankMovement } from '../lib/rankMovement';

// Medal accents for podium ranks 1-3: muted gold, silver, and bronze. Full
// saturation metallics glare against the near-black rows, so these are tuned
// down to sit with the rest of the dark palette.
const MEDAL_CLASSES: Record<number, string> = {
  1: 'border-[#d4a94a] bg-[#2a2312] text-[#ecd9a0]',
  2: 'border-[#9aa4b2] bg-[#23262c] text-[#d7dde6]',
  3: 'border-[#b0714a] bg-[#291d14] text-[#e0b494]',
};

/**
 * Rank marker for leaderboard rows: a medal-style disc for the podium
 * (ranks 1-3), a plain muted number for everyone else.
 */
export function RankMarker({ rank, size = 'md' }: { rank: number; size?: 'sm' | 'md' }) {
  const medal = MEDAL_CLASSES[rank];
  const sizeClasses = size === 'sm' ? 'h-5 w-5 text-[11px]' : 'h-6 w-6 text-xs';

  if (!medal) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center text-[#6e7787] ${sizeClasses}`}
      >
        <span aria-hidden="true">{rank}</span>
        <span className="sr-only">Rank {rank}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border font-windsor-bold ${medal} ${sizeClasses}`}
    >
      <span aria-hidden="true">{rank}</span>
      <span className="sr-only">Rank {rank}</span>
    </span>
  );
}

/**
 * Movement of a row relative to the ranking the user last saw. Undefined
 * movement (no baseline yet) renders nothing rather than a misleading badge.
 */
export function RankMovementIndicator({ movement }: { movement: RankMovement | undefined }) {
  if (!movement) return null;

  if (movement.kind === 'new') {
    return (
      <span className="rounded-sm border border-dividerBlue bg-darkBlue px-1 py-px text-[9px] font-medium uppercase tracking-wider text-lightBlue">
        <span aria-hidden="true">New</span>
        <span className="sr-only">New entry since your last visit</span>
      </span>
    );
  }

  if (movement.kind === 'same') {
    return (
      <span className="inline-flex items-center text-[#4d5461]">
        <Minus className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">No rank change since your last visit</span>
      </span>
    );
  }

  const up = movement.kind === 'up';
  const Icon = up ? ChevronUp : ChevronDown;
  const places = movement.places;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
        up ? 'text-green' : 'text-red'
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span aria-hidden="true">{places}</span>
      <span className="sr-only">
        {up ? 'Up' : 'Down'} {places} {places === 1 ? 'place' : 'places'} since your last visit
      </span>
    </span>
  );
}
