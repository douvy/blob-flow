/**
 * Server-side chart rendering for social share cards.
 *
 * Recharts needs a DOM to measure and lay out, which the Open Graph image
 * route does not have, so share cards draw their own SVG from the same
 * backend series the on-page charts plot. Satori rasterizes an <img> whose
 * src is an SVG data URL, which is how the result reaches the card.
 */

export interface SparkGeometry {
  /** Stroke path along the series. */
  line: string;
  /** Closed path filling the area under the series. */
  area: string;
  /** Horizontal gridline offsets, top to bottom. */
  gridY: number[];
}

export interface SparkOptions {
  width: number;
  height: number;
  /** Inner padding so the stroke and its round caps stay inside the box. */
  padding?: number;
  gridLines?: number;
}

const DEFAULT_PADDING = 8;
const DEFAULT_GRID_LINES = 4;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Maps a numeric series onto line and area paths for a box of the given size.
 * A flat series (or a single point) renders as a centered horizontal line
 * rather than collapsing onto an edge or dividing by a zero range.
 */
export function buildSparkGeometry(
  values: readonly number[],
  { width, height, padding = DEFAULT_PADDING, gridLines = DEFAULT_GRID_LINES }: SparkOptions
): SparkGeometry | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;

  const innerWidth = width - 2 * padding;
  const innerHeight = height - 2 * padding;
  if (innerWidth <= 0 || innerHeight <= 0) return null;

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min;

  const xAt = (index: number) =>
    finite.length === 1
      ? padding + innerWidth / 2
      : padding + (index / (finite.length - 1)) * innerWidth;
  const yAt = (value: number) =>
    range === 0
      ? padding + innerHeight / 2
      : padding + innerHeight - ((value - min) / range) * innerHeight;

  const points = finite.map((value, index) => `${round(xAt(index))},${round(yAt(value))}`);
  const line = `M${points.join('L')}`;
  const area =
    `M${round(xAt(0))},${round(height - padding)}` +
    `L${points.join('L')}` +
    `L${round(xAt(finite.length - 1))},${round(height - padding)}Z`;

  const gridY = Array.from({ length: Math.max(0, gridLines) }, (_, index) =>
    round(padding + (innerHeight * (index + 1)) / (gridLines + 1))
  );

  return { line, area, gridY };
}

/**
 * Renders the series as a standalone SVG data URL. Returns null when there
 * is nothing plottable, letting the caller fall back to a text-only card.
 */
export function buildSparkDataUrl(
  values: readonly number[],
  options: SparkOptions & { stroke: string; fill: string }
): string | null {
  const geometry = buildSparkGeometry(values, options);
  if (!geometry) return null;

  const { width, height, stroke, fill } = options;
  const grid = geometry.gridY
    .map(
      (y) =>
        `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#23252a" stroke-width="1" />`
    )
    .join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${fill}" stop-opacity="0.55" />` +
    `<stop offset="100%" stop-color="${fill}" stop-opacity="0.04" />` +
    `</linearGradient></defs>` +
    grid +
    `<path d="${geometry.area}" fill="url(#spark)" />` +
    `<path d="${geometry.line}" fill="none" stroke="${stroke}" stroke-width="3" ` +
    `stroke-linecap="round" stroke-linejoin="round" />` +
    `</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
