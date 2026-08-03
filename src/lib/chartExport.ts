"use client";

/**
 * Client-side chart image export. Renders a chart node into a branded frame
 * off-screen and encodes it as a PNG via html-to-image, then copies the image
 * to the clipboard or downloads it where the async Clipboard API is missing.
 */

import { toBlob } from 'html-to-image';
import { APP_NAME, SITE_URL } from '@/constants';
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
      APP_NAME
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

/** Renders the chart node inside the branded frame and encodes it as a PNG blob. */
export async function captureChartImage(
  node: HTMLElement,
  meta: ChartCaptureMeta
): Promise<Blob> {
  const [fontEmbedCss, logoDataUrl] = await Promise.all([
    getFontEmbedCss().catch(() => ''),
    fetchAsDataUrl(LOGO_URL).catch(() => null),
  ]);

  const { mount, frame } = buildCaptureFrame(node, meta, logoDataUrl);
  document.body.appendChild(mount);
  try {
    const blob = await toBlob(frame, {
      pixelRatio: 2,
      backgroundColor: FRAME_BACKGROUND,
      // With an explicit value html-to-image skips its own stylesheet scan;
      // an empty string (font fetch failed) lets it try that scan instead.
      fontEmbedCSS: fontEmbedCss || undefined,
    });
    if (!blob) throw new Error('Chart image encoding produced no data');
    return blob;
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

/**
 * Copies the rendered PNG to the clipboard, downloading it instead where the
 * async Clipboard API is unavailable (Firefox before 127, older Safari). The
 * ClipboardItem is handed the pending blob promise synchronously so Safari
 * keeps the user-activation window open while the capture renders.
 */
export async function copyOrDownloadChartImage(
  node: HTMLElement,
  meta: ChartCaptureMeta,
  fileName: string
): Promise<ChartExportOutcome> {
  const blobPromise = captureChartImage(node, meta);
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
