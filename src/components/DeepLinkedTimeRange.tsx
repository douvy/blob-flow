"use client";

import { Suspense } from 'react';
import { useDeepLinkedTimeRange } from '@/hooks/useDeepLinkedTimeRange';

function DeepLinkedTimeRangeInner() {
  useDeepLinkedTimeRange();
  return null;
}

/**
 * Applies a ?range= deep link on pages that render no chart shell of their
 * own (the dashboard). Renders nothing; it exists so a shared dashboard link
 * opens on the range it was captured at, the same as a chart page.
 *
 * The Suspense boundary is required: useDeepLinkedTimeRange reads
 * useSearchParams, which opts its subtree into client rendering on the
 * statically prerendered dashboard.
 */
export default function DeepLinkedTimeRange() {
  return (
    <Suspense fallback={null}>
      <DeepLinkedTimeRangeInner />
    </Suspense>
  );
}
