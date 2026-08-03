"use client";

import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import FlippeningWatch from '@/components/FlippeningWatch';
import { DEFAULT_FLIPPENING_TOP_N } from '@/lib/flippening';

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
        <p className="text-sm text-bodyText mb-4">
          Moments when one rollup&apos;s blob share crossed another&apos;s, tracked for the top{' '}
          {DEFAULT_FLIPPENING_TOP_N} rollups in the selected window.
        </p>
        <div className="mb-8 flex max-w-3xl items-start gap-2.5 rounded-md border border-[#292e35] bg-[#17181b] px-3.5 py-3 text-sm text-[#a9adb6]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
          <p>
            Each rollup&apos;s share is its slice of all blobs posted over the selected time
            period (the filter in the header). That share is recalculated as time moves
            forward, and a flip marks the moment one rollup&apos;s share passes
            another&apos;s. Near ties and leads that swap straight back are hidden as noise,
            and the catch-all Other and unattributed senders are left out.
          </p>
        </div>

        <FlippeningWatch />
      </section>
    </div>
  );
}
