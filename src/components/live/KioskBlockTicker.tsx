"use client";

import React from 'react';
import { formatFeeNumber } from '@/lib/blobFeeHero';
import type { KioskTickerSlot } from '@/lib/liveKiosk';

function slotToneClasses(slot: Extract<KioskTickerSlot, { kind: 'block' }>): string {
  // Focus mode: block-state tinting yields to the focus overlay. Mixing the
  // green/amber fills with the blue share layer reads as arbitrary
  // in-between colors from a distance.
  if (slot.focus) return 'border-divider bg-[#16181c]';
  if (slot.isFull) return 'border-red/60 bg-red/10';
  if (slot.isAboveTarget) return 'border-amber-400/40 bg-amber-400/5';
  return 'border-divider bg-[#16181c]';
}

function slotFillClass(slot: Extract<KioskTickerSlot, { kind: 'block' }>): string {
  if (slot.focus) return 'bg-white/10';
  if (slot.isFull) return 'bg-red/45';
  if (slot.isAboveTarget) return 'bg-amber-400/30';
  return 'bg-green/30';
}

/**
 * Recent blocks, newest on the left. Every slot is the same width whether or
 * not it holds a block, so the row is laid out identically on the first paint
 * and never reflows as blocks stream in.
 *
 * `newestKey` is the newest block's key: only that card runs the entry
 * animation, so the row does not re-animate wholesale on every render.
 */
export default function KioskBlockTicker({
  slots,
  newestKey,
}: {
  slots: KioskTickerSlot[];
  newestKey: string | null;
}) {
  return (
    <ol className="flex h-full items-stretch gap-2" aria-label="Recent blocks">
      {slots.map((slot) => {
        if (slot.kind === 'placeholder') {
          return (
            <li
              key={slot.key}
              aria-hidden="true"
              className="min-w-0 flex-1 rounded-md border border-divider bg-[#16181c] opacity-40"
            />
          );
        }

        const isNewest = slot.key === newestKey;

        return (
          <li
            key={slot.key}
            className={`relative min-w-0 flex-1 overflow-hidden rounded-md border ${slotToneClasses(slot)} ${
              isNewest
                ? 'animate-[kiosk-ticker-in_450ms_ease-out] motion-reduce:animate-none'
                : ''
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 bottom-0 ${slotFillClass(slot)}`}
              style={{ height: `${slot.fillPercent}%` }}
            />
            {/* Focus mode: the focused rollup's share of the block, drawn as a
                brighter layer over the muted whole-block fill. */}
            {slot.focus && slot.focus.percent > 0 && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 bg-blue/60"
                style={{ height: `${slot.focus.percent}%` }}
              />
            )}
            <div className="relative flex h-full w-full flex-col items-center justify-center gap-[0.35em] px-0.5">
              {/* Block numbers are eight digits wide and the cards are not, so
                  the label truncates rather than pushing the card open. */}
              <span className="w-full truncate text-center tabular-nums text-[clamp(0.5rem,min(0.6vw,1.1vh),0.8rem)] text-[#6e7687]">
                {slot.blockNumber.toLocaleString()}
              </span>
              {slot.focus ? (
                <>
                  <span
                    className={`font-windsor-bold tabular-nums leading-none text-[clamp(1rem,min(2vw,3.6vh),2.25rem)] ${
                      slot.focus.count ? 'text-lightBlue' : 'text-[#6e7687]'
                    }`}
                  >
                    {slot.focus.count ?? '·'}
                  </span>
                  <span className="w-full truncate text-center tabular-nums text-[clamp(0.5rem,min(0.7vw,1.2vh),0.8rem)] text-[#8b93a3]">
                    of {slot.blobCount}/{slot.maxBlobs > 0 ? slot.maxBlobs : '?'}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`font-windsor-bold tabular-nums leading-none text-[clamp(1rem,min(2vw,3.6vh),2.25rem)] ${
                      slot.isFull ? 'text-red' : 'text-white'
                    }`}
                  >
                    {slot.blobCount}
                    <span className="text-[0.5em] text-[#8b93a3]">
                      /{slot.maxBlobs > 0 ? slot.maxBlobs : '?'}
                    </span>
                  </span>
                  {slot.isFull ? (
                    <span className="text-[clamp(0.5rem,min(0.7vw,1.2vh),0.8rem)] font-medium uppercase tracking-widest text-red">
                      Full
                    </span>
                  ) : (
                    slot.feeGwei > 0 && (
                      <span className="w-full truncate text-center tabular-nums text-[clamp(0.5rem,min(0.7vw,1.2vh),0.8rem)] text-[#8b93a3]">
                        {formatFeeNumber(slot.feeGwei)}
                      </span>
                    )
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
