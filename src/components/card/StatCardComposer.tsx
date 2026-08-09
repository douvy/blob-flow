"use client";

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ImageDown, Link2 } from 'lucide-react';
import DataStateWrapper from '@/components/DataStateWrapper';
import StatCard from '@/components/card/StatCard';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import {
  availableMetrics,
  buildCardHref,
  cardDataNeeds,
  cardEntityOptions,
  CARD_RANGES,
  CARD_RANGE_LABELS,
  CARD_RANGE_SHORT_LABELS,
  MAX_CARD_METRICS,
  MIN_CARD_METRICS,
  normalizeCardParams,
  NETWORK_WIDE_ENTITY,
  NETWORK_WIDE_NAME,
  parseCardParams,
  resolveCard,
  type CardParams,
  type CardRange,
  type MetricId,
} from '@/lib/statCard';
import { ATTRIBUTION_ENTITY_LIMIT, SITE_URL } from '@/constants';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  BackendAttributionUsageChartResponse,
  BackendCostComparisonChartResponse,
  BlobPricing,
} from '@/types';

const PANEL_CLASS = 'rounded-lg border border-divider bg-[#14161a] p-4';
const BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-md border border-divider bg-[#1d1f23] px-3 py-2 text-sm text-bodyText transition-colors hover:bg-[#252936] hover:text-white focus:outline-none focus:ring-2 focus:ring-blue/60 disabled:cursor-not-allowed disabled:opacity-50';

/** Host shown on the card itself, matching the share image. */
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

/** Card surface, so an exported PNG has no transparent corners. */
const CARD_BACKGROUND = '#101216';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs uppercase tracking-[0.14em] text-[#6e7687]">{children}</div>
  );
}

export default function StatCardComposer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The network lives in the path (`/sepolia/card`), so the header's selector
  // switches networks for the card too.
  const { selectedNetwork } = useNetwork();
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const params = useMemo(
    () => parseCardParams(searchParams, selectedNetwork.apiParam),
    [searchParams, selectedNetwork.apiParam]
  );
  const isNetworkWide = params.entity === NETWORK_WIDE_ENTITY;
  const needs = cardDataNeeds(params.metrics);

  // The entity picker and the card's own subject both come out of this
  // response, so it asks for the whole registry rather than the backend's
  // default top-few breakout: an entity folded into "other" would be missing
  // from the picker and would degrade a valid ?entity= link to the
  // market-wide card.
  const fetchAttribution = useCallback(
    () => api.getAttributionUsageChart(params.range, params.network, 'auto', ATTRIBUTION_ENTITY_LIMIT),
    [params.range, params.network]
  );
  const fetchCostComparison = useCallback(
    () => api.getCostComparisonChart(params.range, params.network),
    [params.range, params.network]
  );
  const fetchPricing = useCallback(() => api.getBlobPricing(params.network), [params.network]);

  const {
    data: attribution,
    isLoading,
    error,
  } = useApiData<BackendAttributionUsageChartResponse>(fetchAttribution, [
    'card-attribution',
    params.network,
    params.range,
    ATTRIBUTION_ENTITY_LIMIT,
  ]);

  const { data: costComparison } = useApiData<BackendCostComparisonChartResponse>(
    fetchCostComparison,
    ['card-cost-comparison', params.network, params.range],
    { enabled: needs.costComparison }
  );

  const { data: pricing } = useApiData<BlobPricing>(
    fetchPricing,
    ['card-pricing', params.network],
    { enabled: needs.pricing }
  );

  const entityOptions = useMemo(() => cardEntityOptions(attribution), [attribution]);
  const { entity, stats } = useMemo(
    () =>
      resolveCard(params, {
        attribution,
        costComparison,
        baseFeeGwei: pricing?.currentBaseFeeGwei,
      }),
    [params, attribution, costComparison, pricing]
  );

  const cardHref = buildCardHref(params);

  const update = useCallback(
    (patch: Partial<CardParams>) => {
      const next = normalizeCardParams({ ...params, ...patch });
      setCopied(false);
      setExportError(null);
      setExportNote(null);
      router.replace(buildCardHref(next), { scroll: false });
    },
    [params, router]
  );

  const toggleMetric = useCallback(
    (id: MetricId) => {
      const selected = params.metrics.includes(id);
      if (selected && params.metrics.length <= MIN_CARD_METRICS) return;
      if (!selected && params.metrics.length >= MAX_CARD_METRICS) return;

      update({
        metrics: selected
          ? params.metrics.filter((metric) => metric !== id)
          : [...params.metrics, id],
      });
    },
    [params.metrics, update]
  );

  const copyLink = useCallback(async () => {
    setExportError(null);
    setExportNote(null);
    try {
      await navigator.clipboard.writeText(new URL(cardHref, window.location.origin).toString());
      setCopied(true);
    } catch {
      setExportError('Could not copy the link. Copy it from the address bar instead.');
    }
  }, [cardHref]);

  const copyImage = useCallback(async () => {
    const node = cardRef.current;
    if (!node) return;

    setExportError(null);
    setExportNote(null);
    setIsExporting(true);
    try {
      // Loaded on demand so the export library stays out of the page bundle.
      // The card is its own branded frame, so it is captured as it stands
      // rather than wrapped the way a chart is.
      const { captureNodeImage, copyOrDownloadImage } = await import('@/lib/chartExport');
      const outcome = await copyOrDownloadImage(
        captureNodeImage(node, CARD_BACKGROUND),
        `blobflow-${params.entity}-${params.range}.png`
      );
      setExportNote(outcome === 'copied' ? 'Card copied' : 'Card downloaded');
    } catch {
      setExportError('Could not render the card as an image.');
    } finally {
      setIsExporting(false);
    }
  }, [params.entity, params.range]);

  const metrics = availableMetrics(isNetworkWide);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className={PANEL_CLASS}>
          <FieldLabel>Entity</FieldLabel>
          <Select value={params.entity} onValueChange={(entitySlug) => update({ entity: entitySlug })}>
            <SelectTrigger className="w-full" aria-label="Select entity">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value={NETWORK_WIDE_ENTITY} textValue={NETWORK_WIDE_NAME}>
                  {NETWORK_WIDE_NAME}
                </SelectItem>
                {entityOptions.map((option) => (
                  <SelectItem key={option.slug} value={option.slug} textValue={option.name}>
                    <span className="flex items-center gap-2">
                      {option.iconSrc ? (
                        <Image
                          src={option.iconSrc}
                          alt=""
                          width={16}
                          height={16}
                          unoptimized={option.iconSrc.endsWith('.svg')}
                          className="h-4 w-4 shrink-0 rounded-full"
                        />
                      ) : null}
                      {option.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <p className="mt-3 text-xs text-[#6e7687]">
            Showing {selectedNetwork.name}. Switch networks in the header to card another one.
          </p>
        </div>

        <div className={PANEL_CLASS}>
          <FieldLabel>Range</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {CARD_RANGES.map((range: CardRange) => {
              const isActive = range === params.range;
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => update({ range })}
                  aria-pressed={isActive}
                  title={CARD_RANGE_LABELS[range]}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'border-blue bg-blue/20 text-white'
                      : 'border-divider bg-[#1d1f23] text-bodyText hover:bg-[#252936] hover:text-white'
                  }`}
                >
                  {CARD_RANGE_SHORT_LABELS[range]}
                </button>
              );
            })}
          </div>
        </div>

        <div className={PANEL_CLASS}>
          <FieldLabel>Metrics</FieldLabel>
          <p className="mb-3 text-xs text-[#6e7687]">
            Pick {MIN_CARD_METRICS} or {MAX_CARD_METRICS}.
          </p>
          <div className="flex flex-col gap-2">
            {metrics.map((metric) => {
              const isSelected = params.metrics.includes(metric.id);
              const atMax = !isSelected && params.metrics.length >= MAX_CARD_METRICS;
              const atMin = isSelected && params.metrics.length <= MIN_CARD_METRICS;

              return (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => toggleMetric(metric.id)}
                  aria-pressed={isSelected}
                  disabled={atMax || atMin}
                  title={
                    atMax
                      ? `A card holds at most ${MAX_CARD_METRICS} metrics`
                      : atMin
                        ? `A card needs at least ${MIN_CARD_METRICS} metrics`
                        : metric.hint
                  }
                  className={`rounded-md border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                    isSelected
                      ? 'border-blue bg-blue/15 text-white'
                      : 'border-divider bg-[#1d1f23] text-bodyText hover:bg-[#252936] hover:text-white disabled:opacity-40 disabled:hover:bg-[#1d1f23]'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected ? 'border-blue bg-blue' : 'border-[#3a3f4b]'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </span>
                    {metric.label}
                  </span>
                  <span className="mt-1 block pl-6 text-xs text-[#6e7687]">{metric.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <DataStateWrapper isLoading={isLoading} error={error}>
          <div className={PANEL_CLASS}>
            <div ref={cardRef}>
              <StatCard
                entity={entity}
                rangeLabel={CARD_RANGE_LABELS[params.range]}
                networkLabel={selectedNetwork.name}
                stats={stats}
                siteHost={SITE_HOST}
              />
            </div>
          </div>
        </DataStateWrapper>

        <div className={PANEL_CLASS}>
          <FieldLabel>Share</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyLink} className={BUTTON_CLASS}>
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Link2 className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={copyImage}
              disabled={isExporting}
              className={BUTTON_CLASS}
            >
              <ImageDown className="h-4 w-4" aria-hidden="true" />
              {isExporting ? 'Rendering...' : 'Copy as PNG'}
            </button>
          </div>
          <p className="mt-3 break-all text-xs text-[#6e7687]">{cardHref}</p>
          {(exportError || exportNote) && (
            <p className={`mt-2 text-xs ${exportError ? 'text-red' : 'text-[#6e7687]'}`} role="status">
              {exportError ?? exportNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
