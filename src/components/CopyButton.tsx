"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, TriangleAlert } from 'lucide-react';

/** How long the button reports the outcome before returning to "Copy". */
export const COPY_FEEDBACK_MS = 1500;

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copies a value to the clipboard and reports what happened. Clipboard access
 * can be denied or missing entirely (older browsers, insecure origins), so a
 * failure is shown rather than leaving the click looking like it worked.
 */
export default function CopyButton({
  value,
  label,
  text = 'Copy',
  compact = false,
  className = '',
}: {
  /**
   * The value to copy, or a function returning it. The function form defers
   * to click time, for values that only exist in the browser.
   */
  value: string | (() => string);
  /** What is being copied, e.g. "transaction hash". Used for the aria-label. */
  label: string;
  /** Resting button text. Ignored when compact. */
  text?: string;
  /** Icon only, for use beside a value in a dense row. */
  compact?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    let outcome: CopyState = 'copied';
    try {
      await navigator.clipboard.writeText(typeof value === 'function' ? value() : value);
    } catch {
      outcome = 'failed';
    }

    setState(outcome);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState('idle'), COPY_FEEDBACK_MS);
  };

  const Icon = state === 'copied' ? Check : state === 'failed' ? TriangleAlert : Copy;
  const buttonText = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : text;

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      title={state === 'idle' ? `Copy ${label}` : buttonText}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded border border-divider text-blue transition-colors hover:border-[#3B55E6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B55E6] ${
        compact ? 'p-1' : 'px-2.5 py-1 text-sm'
      } ${className}`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${state === 'failed' ? 'text-red-300' : ''}`}
        aria-hidden="true"
      />
      {!compact && buttonText}
      <span role="status" className="sr-only">
        {state === 'copied' ? `${label} copied` : state === 'failed' ? `Could not copy ${label}` : ''}
      </span>
    </button>
  );
}
