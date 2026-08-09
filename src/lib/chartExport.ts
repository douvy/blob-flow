"use client";

/**
 * Client-side chart image export. Renders a chart node into a branded frame
 * off-screen and encodes it as a PNG via html-to-image, then copies the image
 * to the clipboard or downloads it where the async Clipboard API is missing.
 */

import { toBlob } from 'html-to-image';
import { SITE_NAME, SITE_URL } from '@/constants';
import { formatDate } from '@/utils';

export interface ChartCaptureMeta {
  title: string;
  networkName: string;
  rangeLabel: string;
  capturedAt: Date;
}

export type ChartExportOutcome = 'copied' | 'downloaded';

/** Colors mirroring the app theme (globals.css / CHART_CARD_CLASS). */
const FRAME_BACKGROUND = '#121316';
const CARD_BACKGROUND = '#14161a';
const CARD_BORDER = '#23252a';
const MUTED_TEXT = '#6e7687';

const FRAME_PADDING = 24;
const CARD_PADDING = 20;

/**
 * html-to-image serializes the DOM into a standalone SVG, so web fonts must be
 * inlined as data URLs or the render falls back to system fonts. The woff2
 * sources match the @font-face rules in globals.css.
 */
const FONT_SOURCES = [
  { family: 'GT Flexa', url: '/fonts/GT Flexa/GT-Flexa-Standard-Regular.woff2' },
  { family: 'Windsor Bold', url: '/fonts/WindsorBold/WindsorBold.woff2' },
];

const LOGO_URL = '/images/logo.png';

let fontEmbedCssPromise: Promise<string> | null = null;

async function fetchAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${url}`));
    reader.readAsDataURL(blob);
  });
}

/** Fetches and caches the @font-face CSS with woff2 files inlined as data URLs. */
function getFontEmbedCss(): Promise<string> {
  if (!fontEmbedCssPromise) {
    const pending = Promise.all(
      FONT_SOURCES.map(async ({ family, url }) => {
        const dataUrl = await fetchAsDataUrl(url);
        return `@font-face { font-family: '${family}'; src: url('${dataUrl}') format('woff2'); font-weight: normal; font-style: normal; }`;
      })
    ).then((rules) => rules.join('\n'));
    fontEmbedCssPromise = pending;
    // Do not cache a rejection: a transient fetch failure should not disable
    // font embedding for the rest of the session.
    pending.catch(() => {
      if (fontEmbedCssPromise === pending) fontEmbedCssPromise = null;
    });
  }
  return fontEmbedCssPromise;
}

function styled<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Partial<CSSStyleDeclaration>,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  Object.assign(element.style, styles);
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatTimestamp(capturedAt: Date): string {
  const time = capturedAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatDate(capturedAt)}, ${time}`;
}

/**
 * Builds the branded frame around a clone of the chart node: logo and app
 * name, chart title, network and range, capture time, and site watermark.
 * The mount positions the frame off-screen so the on-page card never
 * changes; the frame itself must stay statically positioned because
 * html-to-image clones the target node's styles verbatim, and a fixed
 * off-screen root would render the whole image blank.
 */
function buildCaptureFrame(
  node: HTMLElement,
  meta: ChartCaptureMeta,
  logoDataUrl: string | null
): { mount: HTMLElement; frame: HTMLElement } {
  const contentWidth = Math.max(node.offsetWidth, 320);
  const frameWidth = contentWidth + 2 * (FRAME_PADDING + CARD_PADDING + 1);

  const mount = styled('div', {
    position: 'fixed',
    left: '-100000px',
    top: '0',
  });

  const root = styled('div', {
    width: `${frameWidth}px`,
    padding: `${FRAME_PADDING}px`,
    backgroundColor: FRAME_BACKGROUND,
    fontFamily: "'GT Flexa', sans-serif",
    boxSizing: 'border-box',
  });

  const card = styled('div', {
    backgroundColor: CARD_BACKGROUND,
    border: `1px solid ${CARD_BORDER}`,
    borderRadius: '12px',
    padding: `${CARD_PADDING}px`,
    boxSizing: 'border-box',
  });

  const header = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '14px',
  });

  const brand = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  });
  if (logoDataUrl) {
    const logo = styled('img', {
      width: '28px',
      height: '28px',
      display: 'block',
    }) as HTMLImageElement;
    logo.src = logoDataUrl;
    logo.alt = '';
    brand.appendChild(logo);
  }
  brand.appendChild(
    styled(
      'div',
      {
        fontFamily: "'Windsor Bold', serif",
        fontSize: '20px',
        color: '#ffffff',
        lineHeight: '1',
      },
      SITE_NAME
    )
  );
  header.appendChild(brand);
  header.appendChild(
    styled(
      'div',
      { fontSize: '12px', color: MUTED_TEXT, textAlign: 'right' },
      `${meta.networkName} · ${meta.rangeLabel}`
    )
  );
  card.appendChild(header);

  card.appendChild(
    styled(
      'div',
      {
        fontSize: '16px',
        fontWeight: '500',
        color: '#ffffff',
        marginBottom: '14px',
      },
      meta.title
    )
  );

  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = `${contentWidth}px`;
  card.appendChild(clone);

  const footer = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginTop: '14px',
    fontSize: '11px',
    color: MUTED_TEXT,
  });
  footer.appendChild(styled('div', {}, `Captured ${formatTimestamp(meta.capturedAt)}`));
  footer.appendChild(styled('div', {}, SITE_URL.replace(/^https?:\/\//, '')));
  card.appendChild(footer);

  root.appendChild(card);
  mount.appendChild(root);
  return { mount, frame: root };
}

/**
 * Everything in the frame is vector (the Recharts SVG plus text), so
 * rasterizing above the display's own ratio keeps resolving more detail
 * rather than just inflating pixels. Scale is otherwise tied to the on-page
 * card, and a dashboard card's chart body is only 224px tall, which at 2x
 * exported small enough to look soft wherever it got scaled back up.
 */
const MIN_PIXEL_RATIO = 3;
/** Ceiling on the rasterized size: 4x a full-width card is already ~5000px. */
const MAX_PIXEL_RATIO = 4;
/** Width to aim for, so narrow cards still export something worth sharing. */
const TARGET_EXPORT_WIDTH = 2400;
/**
 * Total pixels the canvas may cover. A tall detail chart is wide *and* deep,
 * so a width-only cap can still ask for a canvas past what browsers allow:
 * Safari refuses to allocate much beyond 16M pixels, and every pixel costs
 * 4 bytes in the raster before the PNG encoder takes its own copy.
 */
const MAX_PIXEL_AREA = 12_000_000;

export function capturePixelRatio(
  frameWidth: number,
  frameHeight: number,
  devicePixelRatio = 1
): number {
  const toReachTarget = frameWidth > 0 ? TARGET_EXPORT_WIDTH / frameWidth : MIN_PIXEL_RATIO;
  const wanted = Math.min(
    MAX_PIXEL_RATIO,
    Math.max(MIN_PIXEL_RATIO, devicePixelRatio, toReachTarget)
  );

  const area = frameWidth * frameHeight;
  if (area <= 0) return wanted;
  // Area grows with the square of the ratio, so the affordable ratio is the
  // square root of the budget, rounded down so float error cannot land just
  // over it. Never drop below 1x: a smaller-than-CSS export would be worse
  // than a heavy one.
  const affordable = Math.floor(Math.sqrt(MAX_PIXEL_AREA / area) * 100) / 100;
  return Math.max(1, Math.min(wanted, affordable));
}

/**
 * Encodes a node as a PNG blob with the site's fonts inlined. Callers that
 * already render their own branded frame (the stat card) pass their node
 * straight in; charts go through captureChartImage, which wraps them first.
 */
export async function captureNodeImage(
  node: HTMLElement,
  backgroundColor: string = FRAME_BACKGROUND
): Promise<Blob> {
  const fontEmbedCss = await getFontEmbedCss().catch(() => '');

  const blob = await toBlob(node, {
    pixelRatio: capturePixelRatio(
      node.offsetWidth,
      node.offsetHeight,
      window.devicePixelRatio || 1
    ),
    backgroundColor,
    // With an explicit value html-to-image skips its own stylesheet scan;
    // an empty string (font fetch failed) lets it try that scan instead.
    fontEmbedCSS: fontEmbedCss || undefined,
  });
  if (!blob) throw new Error('Image encoding produced no data');
  return blob;
}

/** Renders the chart node inside the branded frame and encodes it as a PNG blob. */
export async function captureChartImage(
  node: HTMLElement,
  meta: ChartCaptureMeta
): Promise<Blob> {
  const logoDataUrl = await fetchAsDataUrl(LOGO_URL).catch(() => null);

  const { mount, frame } = buildCaptureFrame(node, meta, logoDataUrl);
  document.body.appendChild(mount);
  try {
    return await captureNodeImage(frame);
  } finally {
    mount.remove();
  }
}

function canCopyImages(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function'
  );
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function copyOrDownloadChartImage(
  node: HTMLElement,
  meta: ChartCaptureMeta,
  fileName: string
): Promise<ChartExportOutcome> {
  return copyOrDownloadImage(captureChartImage(node, meta), fileName);
}

/**
 * Copies the rendered PNG to the clipboard, downloading it instead where the
 * async Clipboard API is unavailable (Firefox before 127, older Safari). The
 * ClipboardItem is handed the pending blob promise synchronously so Safari
 * keeps the user-activation window open while the capture renders, which is
 * why this takes the promise rather than the blob.
 */
export async function copyOrDownloadImage(
  blobPromise: Promise<Blob>,
  fileName: string
): Promise<ChartExportOutcome> {
  if (canCopyImages()) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobPromise }),
      ]);
      return 'copied';
    } catch {
      // Clipboard writes can be rejected by permissions or focus loss even
      // when the capture succeeded; fall through to a download. A capture
      // failure rethrows from this await and reaches the caller.
      downloadBlob(await blobPromise, fileName);
      return 'downloaded';
    }
  }
  downloadBlob(await blobPromise, fileName);
  return 'downloaded';
}
