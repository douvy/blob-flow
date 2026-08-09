"use client";

import Link from '@/components/NetworkLink';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import React from 'react';
import FlippeningWatch from '@/components/FlippeningWatch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DEFAULT_FLIPPENING_TOP_N } from '@/lib/flippening';

/**
 * Methodology behind the help icon, so it does not take a block above the
 * data it explains. Radix opens tooltips on hover and focus only, which
 * would leave touch users with no way to read this, so the open state is
 * controlled and the trigger toggles it on click as well.
 */
function MethodologyTooltip() {
  const [open, setOpen] = React.useState(false);
  const openRef = React.useRef(false);
  const openBeforeTapRef = React.useRef(false);

  const setOpenState = React.useCallback((next: boolean) => {
    openRef.current = next;
    setOpen(next);
  }, []);

  return (
    <Tooltip open={open} onOpenChange={setOpenState}>
      {/*
        Radix closes a tooltip on pointerdown and on click, and its own
        handlers run after the trigger's, so a tap can never leave it open.
        Recording the state in the capture phase, before Radix closes it,
        lets the wrapper's click restore the toggle that touch users need.
      */}
      <span
        className="inline-flex translate-y-[3px]"
        onPointerDownCapture={() => {
          openBeforeTapRef.current = openRef.current;
        }}
        onClick={() => setOpenState(!openBeforeTapRef.current)}
      >
        <TooltipTrigger asChild>
          <button
            type="button"
            // Negative margin keeps the icon aligned while padding gives the
            // control a tap target larger than the 16px glyph.
            className="-m-2 inline-flex shrink-0 p-2 text-[#6e7787] transition-colors hover:text-bodyText focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue"
            aria-label="How flippening is measured"
          >
            <CircleHelp className="h-4 w-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
      </span>
      <TooltipContent
        side="bottom"
        align="center"
        collisionPadding={16}
        className="w-80 max-w-[calc(100vw-2rem)] px-3 py-2.5 text-[11px] leading-relaxed text-[#a9adb6]"
      >
        Each rollup&apos;s share is its slice of all blobs posted over the selected time period
        (the filter in the header). That share is recalculated as time moves forward, and a
        flip marks the moment one rollup&apos;s share passes another&apos;s. Near ties and
        leads that swap straight back are hidden as noise, and the catch-all Other and
        unattributed senders are left out.
      </TooltipContent>
    </Tooltip>
  );
}

export default function FlippeningPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/"
        className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>

      <section>
        <h1 className="text-3xl font-windsor-bold text-white mb-2">Flippening Watch</h1>
        {/* The icon sits inline after the sentence, so it reads as a footnote
            to that sentence rather than floating at the far edge of the row. */}
        <p className="mb-8 text-sm text-bodyText">
          Moments when one rollup&apos;s blob share crossed another&apos;s, tracked for the top{' '}
          {DEFAULT_FLIPPENING_TOP_N} rollups in the selected{' '}
          {/* Tied to the last word so the icon can never wrap onto a line of
              its own, orphaned from the sentence it annotates. */}
          <span className="whitespace-nowrap">
            window. <MethodologyTooltip />
          </span>
        </p>

        <FlippeningWatch />
      </section>
    </div>
  );
}
