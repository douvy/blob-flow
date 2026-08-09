"use client";

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/**
 * A tooltip that also opens on tap.
 *
 * Radix opens tooltips on hover and focus only, and its trigger closes them
 * on pointerdown and on click, so a touch user can never read one. Recording
 * the open state in the capture phase, before Radix closes it, lets the
 * wrapper's click toggle it instead. Reach for this wherever the tooltip
 * carries content a touch user should be able to read; a hover-only Tooltip
 * is fine for hints that merely restate something already on screen.
 */
export default function TapTooltip({
  children,
  content,
  contentClassName,
  side = 'bottom',
  align = 'center',
}: {
  /** The trigger. Use a focusable element so keyboard users reach it. */
  children: React.ReactNode;
  content: React.ReactNode;
  contentClassName?: string;
  side?: React.ComponentProps<typeof TooltipContent>['side'];
  align?: React.ComponentProps<typeof TooltipContent>['align'];
}) {
  const [open, setOpen] = React.useState(false);
  const openRef = React.useRef(false);
  const openBeforeTapRef = React.useRef(false);

  const setOpenState = React.useCallback((next: boolean) => {
    openRef.current = next;
    setOpen(next);
  }, []);

  return (
    <Tooltip open={open} onOpenChange={setOpenState}>
      <span
        className="inline-flex"
        onPointerDownCapture={() => {
          openBeforeTapRef.current = openRef.current;
        }}
        onClick={() => setOpenState(!openBeforeTapRef.current)}
      >
        <TooltipTrigger asChild>{children}</TooltipTrigger>
      </span>
      <TooltipContent side={side} align={align} collisionPadding={16} className={contentClassName}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
