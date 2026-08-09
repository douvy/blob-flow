import React from 'react';
import NetworkLink from '@/components/NetworkLink';

/** Panel grid placeholder, matching the kiosk's two-row layout. */
export function KioskPanelSkeleton() {
  return (
    <div className="grid h-full animate-pulse grid-rows-[3fr_2fr] gap-[1.2vh]">
      <div className="grid grid-cols-1 gap-[1.2vh] lg:grid-cols-12">
        <div className="rounded-xl bg-[#16181c] lg:col-span-7" />
        <div className="rounded-xl bg-[#16181c] lg:col-span-5" />
      </div>
      <div className="grid grid-cols-1 gap-[1.2vh] lg:grid-cols-12">
        <div className="rounded-xl bg-[#16181c] lg:col-span-6" />
        <div className="rounded-xl bg-[#16181c] lg:col-span-3" />
        <div className="rounded-xl bg-[#16181c] lg:col-span-3" />
      </div>
    </div>
  );
}

/**
 * Full-viewport kiosk shell with no data in it. Server-rendered as the
 * Suspense fallback for /live, which reads its focus from the URL and so
 * cannot itself prerender: without this the prerendered page is blank, and a
 * slow kiosk machine shows black until hydration finishes.
 */
export default function KioskSkeleton() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background text-bodyText">
      <div className="flex h-full flex-col gap-[1.2vh] p-[2.2vh]">
        <header className="flex shrink-0 items-center justify-between gap-4">
          {/* A link here too, so the wordmark does not become clickable only
              once the kiosk hydrates. */}
          <NetworkLink
            href="/"
            aria-label="Leave TV mode for the dashboard"
            className="font-windsor-bold text-[clamp(1rem,min(1.5vw,2.6vh),1.75rem)] leading-none text-titleText"
          >
            BlobFlow
          </NetworkLink>
          <span className="text-[clamp(0.7rem,min(1vw,1.8vh),1.1rem)] uppercase tracking-[0.15em] text-[#6e7687]">
            Connecting
          </span>
        </header>
        <div className="min-h-0 flex-1">
          <KioskPanelSkeleton />
        </div>
      </div>
    </div>
  );
}
