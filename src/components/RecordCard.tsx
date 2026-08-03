"use client";

import { Link as LinkIcon } from 'lucide-react';
import React from 'react';

export type RecordScope = 'live' | 'window' | 'all-time';

export type RecordAccent = 'blue' | 'green' | 'purple' | 'red' | 'yellow';

const ACCENT_GLOWS: Record<RecordAccent, string> = {
  blue: '#3b55e6',
  green: '#66cc99',
  purple: '#6a5acd',
  red: '#ff6b6b',
  yellow: '#e6c94a',
};

const ACCENT_VALUE_CLASSES: Record<RecordAccent, string> = {
  blue: 'text-lightBlue',
  green: 'text-green',
  purple: 'text-[#b3a6f5]',
  red: 'text-red',
  yellow: 'text-[#e6c94a]',
};

const SCOPE_PILL_CLASSES: Record<RecordScope, string> = {
  live: 'border-green/40 text-green',
  window: 'border-lightBlue/40 text-lightBlue',
  'all-time': 'border-[#b3a6f5]/40 text-[#b3a6f5]',
};

/**
 * One record on the /records page: a bold headline value with a scope pill
 * that says exactly what the record covers (a live streak, a rolling window,
 * or all indexed history) so window-scoped records never read as all-time
 * highs.
 *
 * The id is a stable anchor, so /records#full-block-streak deep-links to the
 * card; keep ids unchanged once published.
 */
export default function RecordCard({
  id,
  title,
  scope,
  scopeLabel,
  accent = 'blue',
  value,
  unit,
  caption,
  children,
  className = '',
}: {
  /** Stable anchor id; the card is linkable as /records#{id}. */
  id: string;
  title: string;
  scope: RecordScope;
  /** Short scope text shown in the pill, e.g. "Live" or "24h window". */
  scopeLabel: string;
  accent?: RecordAccent;
  value: React.ReactNode;
  unit?: string;
  caption?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`group relative scroll-mt-28 overflow-hidden rounded-lg border border-divider bg-gradient-to-b from-[#1a1c22] to-[#141519] p-5 sm:p-6 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid-size opacity-30"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-[0.14] blur-3xl"
        style={{ backgroundColor: ACCENT_GLOWS[accent] }}
        aria-hidden="true"
      />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wider text-[#8a93a5]">
              {title}
            </h2>
            <a
              href={`#${id}`}
              aria-label={`Link to ${title}`}
              className="text-[#4a5160] opacity-0 transition-opacity hover:text-titleText focus:opacity-100 group-hover:opacity-100"
            >
              <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${SCOPE_PILL_CLASSES[scope]}`}
          >
            {scope === 'live' && (
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-green"
                aria-hidden="true"
              />
            )}
            {scopeLabel}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className={`font-windsor-bold text-4xl leading-none tabular-nums sm:text-5xl ${ACCENT_VALUE_CLASSES[accent]}`}
          >
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-[#8a93a5]">{unit}</span>
          )}
        </div>

        {caption && <p className="mt-3 text-sm text-[#a9adb6]">{caption}</p>}

        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  );
}
