"use client";

import React from 'react';
import type { KioskFullness } from '@/lib/liveKiosk';

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getGaugeStroke(fullness: KioskFullness): string {
  if (fullness.isFull) return 'var(--color-red)';
  if (fullness.isAboveTarget) return '#fbbf24';
  return 'var(--color-green)';
}

/**
 * Blobspace fullness of the newest block as a ring plus a percentage.
 *
 * The percentage is `tabular-nums` and the blob count sits on its own line,
 * so the readout never changes width as the numbers change. A full block
 * turns the ring red; it gets no animated treatment of its own, since the
 * panel already flashes once per block.
 */
export default function KioskFullnessGauge({
  fullness,
  compact = false,
}: {
  fullness: KioskFullness;
  /** Smaller ring and type for the short bottom-row panel. */
  compact?: boolean;
}) {
  const stroke = getGaugeStroke(fullness);
  const dashOffset = CIRCUMFERENCE * (1 - fullness.percent / 100);
  const blobsLabel =
    fullness.maxBlobs > 0 ? `${fullness.blobCount}/${fullness.maxBlobs}` : `${fullness.blobCount}`;
  const ringSizeClass = compact
    ? 'aspect-square h-[min(100%,16vh)]'
    : 'aspect-square h-[min(100%,26vh)]';
  const percentSizeClass = compact
    ? 'text-[clamp(1.1rem,min(2.4vw,4.5vh),2.5rem)]'
    : 'text-[clamp(2rem,min(6vw,11vh),6rem)]';
  const blobsSizeClass = compact
    ? 'text-[clamp(0.55rem,min(0.8vw,1.4vh),0.9rem)]'
    : 'text-[clamp(0.7rem,min(1.4vw,2.4vh),1.35rem)]';

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className={`absolute ${ringSizeClass} -rotate-90`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fullness.percent)}
        aria-label={`Blobspace fullness ${Math.round(fullness.percent)} percent, ${blobsLabel} blobs`}
      >
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="#23252a"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset,stroke] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>

      <div className="relative flex flex-col items-center leading-none">
        <span
          className={`font-windsor-bold tabular-nums ${percentSizeClass}`}
          style={{ color: stroke }}
        >
          {Math.round(fullness.percent)}
          <span className="text-[0.45em]">%</span>
        </span>
        <span className={`mt-[0.4em] tabular-nums ${blobsSizeClass} text-[#a9adb6]`}>
          {blobsLabel} blobs
        </span>
      </div>
    </div>
  );
}
