"use client";

import Image from 'next/image';
import type { CardEntity, CardStat } from '@/lib/statCard';

/**
 * The shareable stat card.
 *
 * It is laid out for a 1200x630 social image and scaled to whatever width it
 * is dropped into: the root font size is 1cqw (one percent of the container),
 * and every size below is expressed in `em`, so the whole card scales as one
 * piece. That only holds while font-size overrides stay on leaf elements, since
 * an `em` on a child of a resized element would compound. Containers here keep
 * the inherited size and only use `em` for spacing.
 *
 * The Open Graph route renders the same design with inline styles (satori has
 * no Tailwind), so changes to this layout belong in both places.
 */

interface StatCardProps {
  entity: CardEntity;
  rangeLabel: string;
  /** Network name, shown so a testnet card cannot be mistaken for mainnet. */
  networkLabel: string;
  stats: CardStat[];
  siteHost: string;
}

function EntityMark({ entity }: { entity: CardEntity }) {
  if (entity.isNetworkWide) {
    return null;
  }

  if (!entity.iconSrc) {
    return (
      <span className="flex h-[5.6em] w-[5.6em] shrink-0 items-center justify-center rounded-full bg-[#2a2f3a] text-[2.6em] font-windsor-bold text-white">
        {entity.name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={entity.iconSrc}
      alt=""
      width={72}
      height={72}
      // The optimizer refuses SVGs without dangerouslyAllowSVG, and the
      // registry icons are tiny, so serve those as-is (matches AttributionBadge).
      unoptimized={entity.iconSrc.endsWith('.svg')}
      className="h-[5.6em] w-[5.6em] shrink-0 rounded-full"
    />
  );
}

export default function StatCard({
  entity,
  rangeLabel,
  networkLabel,
  stats,
  siteHost,
}: StatCardProps) {
  return (
    <div className="@container w-full">
      <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-[1.5em] border border-[#262a33] bg-[#101216] bg-[radial-gradient(circle_at_88%_-15%,rgba(59,85,230,0.32),transparent_58%)] text-[1cqw]">
        <div className="flex h-full w-full flex-col justify-between p-[4em]">
          <div className="flex items-center justify-between gap-[2em]">
            <div className="flex items-center gap-[1.2em]">
              <Image
                src="/images/logo.png"
                alt=""
                width={72}
                height={72}
                className="h-[3.2em] w-[3.2em]"
              />
              <span className="text-[2.4em] font-windsor-bold leading-none text-titleText">
                BlobFlow
              </span>
            </div>
            <span className="rounded-full border border-[#2c3140] bg-[#171a20] px-[1.4em] py-[0.6em] text-[1.5em] leading-none text-[#8b93a3]">
              {networkLabel} · {rangeLabel}
            </span>
          </div>

          {/* Entity and stats travel together, so a two-metric card does not
              leave a hole in the middle. */}
          <div className="flex flex-col gap-[2.4em]">
            <div className="flex items-center gap-[1.6em]">
              <EntityMark entity={entity} />
              <h2 className="text-[4.4em] font-windsor-bold leading-tight text-white">
                {entity.name}
              </h2>
            </div>

            <div className="flex flex-col">
              {stats.map((stat) => (
                <div
                  key={stat.id}
                  className="flex items-center justify-between gap-[2em] border-t border-[#23252a] py-[1.2em]"
                >
                  <span className="text-[1.7em] uppercase leading-none tracking-[0.16em] text-[#6e7687]">
                    {stat.label}
                  </span>
                  <span className="text-[3.4em] font-windsor-bold leading-none text-white">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[1.5em] leading-none">
            <span className="text-[#9ac4fd]">{siteHost}</span>
            <span className="text-[#6e7687]">Ethereum blob analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
}
