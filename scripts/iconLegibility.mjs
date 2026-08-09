/**
 * Measures how legible an entity icon is on the dark theme, so
 * sync-entity-icons.mjs can bake the answer into the generated map instead of
 * anyone hand-maintaining a list of dark logos.
 *
 * The badge draws each icon as a circle directly on the page background, so
 * the measurement mirrors that: rasterize the artwork to a square, mask it to
 * the badge circle, composite it over the background color, and count the
 * pixels that end up indistinguishable from the page.
 */
import sharp from 'sharp';

/** Edge of the square the artwork is rasterized into before measuring. */
export const MEASURE_SIZE = 64;

/** --color-background in src/app/globals.css, what badges sit on. */
export const BACKGROUND_RGB = { r: 0x12, g: 0x13, b: 0x16 };

/**
 * The light disc AttributionBadge puts behind a dark logo, as it actually
 * renders: bg-white/90 over the page background.
 */
export const BACKDROP_RGB = { r: 231, g: 231, b: 232 };

/**
 * How far a composited pixel has to sit from a surface, on its furthest
 * channel, before it reads as something drawn on that surface rather than as
 * more of the surface.
 *
 * Distance rather than brightness is what matters. A brightness test alone
 * misreads dim but saturated brand colors that are perfectly clear against
 * the page, such as Base's #0052FF or Taiko's pink, while a brightness test
 * rescued by a saturation exemption would wave through a near-black
 * saturated glyph like #001000 that nobody can see.
 */
const BLEND_DELTA_MAX = 32;

/** Alpha below this contributes so little that the pixel is not "painted". */
const PAINTED_ALPHA_MIN = 0.05;

/** Alpha below this lets a backdrop show through the artwork. */
const SEE_THROUGH_ALPHA_MAX = 0.5;

/** Share of painted pixels that must vanish before an icon counts as dark. */
const DARK_FRACTION = 0.5;

/** Share of the circle that must be see-through for a backdrop to help. */
const TRANSPARENT_FRACTION = 0.1;

/** SVGs carry no pixel size; rasterize them well above MEASURE_SIZE. */
const SVG_DENSITY = 384;

/**
 * Does a composited 0-255 pixel disappear into the surface it was drawn on?
 */
export function blendsInto({ r, g, b }, surface) {
  return (
    Math.abs(r - surface.r) < BLEND_DELTA_MAX &&
    Math.abs(g - surface.g) < BLEND_DELTA_MAX &&
    Math.abs(b - surface.b) < BLEND_DELTA_MAX
  );
}

/** Source-over of a straight-alpha pixel onto an opaque surface. */
function over(pixels, i, alpha, surface) {
  return {
    r: pixels[i] * alpha + surface.r * (1 - alpha),
    g: pixels[i + 1] * alpha + surface.g * (1 - alpha),
    b: pixels[i + 2] * alpha + surface.b * (1 - alpha),
  };
}

/**
 * Measure a raw RGBA buffer of `size` x `size` pixels.
 *
 * Reports the share of painted pixels that vanish against the page
 * (`darkFraction`), the share that would vanish against the light backdrop
 * instead (`backdropFraction`), and the share of the badge circle the artwork
 * leaves see-through (`transparentFraction`). Pixels outside the circle are
 * ignored because the badge clips them away.
 */
export function measureRgba(pixels, size = MEASURE_SIZE) {
  const center = (size - 1) / 2;
  const radius = size / 2;
  let inCircle = 0;
  let seeThrough = 0;
  let painted = 0;
  let lostOnPage = 0;
  let lostOnBackdrop = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      if (dx * dx + dy * dy > radius * radius) {
        continue;
      }
      inCircle += 1;

      const i = (y * size + x) * 4;
      const alpha = pixels[i + 3] / 255;
      if (alpha < SEE_THROUGH_ALPHA_MAX) {
        seeThrough += 1;
      }
      if (alpha < PAINTED_ALPHA_MIN) {
        continue;
      }
      painted += 1;

      if (blendsInto(over(pixels, i, alpha, BACKGROUND_RGB), BACKGROUND_RGB)) {
        lostOnPage += 1;
      }
      if (blendsInto(over(pixels, i, alpha, BACKDROP_RGB), BACKDROP_RGB)) {
        lostOnBackdrop += 1;
      }
    }
  }

  return {
    darkFraction: painted === 0 ? 0 : lostOnPage / painted,
    backdropFraction: painted === 0 ? 0 : lostOnBackdrop / painted,
    transparentFraction: inCircle === 0 ? 0 : seeThrough / inCircle,
  };
}

/**
 * Turn a measurement into the flag the badge reads.
 *
 * Two failure modes need two answers, and the badge already handles one of
 * them for every icon by outlining it: that is the only thing that can
 * separate an opaque dark mark, such as Shape's solid black disc, from the
 * page. A backdrop is the other answer, and it only earns its place when the
 * artwork is dark, leaves enough of the circle see-through for the backdrop
 * to show, and actually reads once it is there. That last condition rules
 * out faint light artwork, which looks dark only because the page behind it
 * is, and would vanish all over again on white.
 */
export function classifyIcon({ darkFraction, backdropFraction, transparentFraction }) {
  const isDark = darkFraction >= DARK_FRACTION;
  const hasTransparency = transparentFraction >= TRANSPARENT_FRACTION;
  const readsOnBackdrop = backdropFraction < DARK_FRACTION;
  return {
    isDark,
    hasTransparency,
    readsOnBackdrop,
    needsLightBackdrop: isDark && hasTransparency && readsOnBackdrop,
  };
}

/**
 * Rasterize an icon file and classify it. Stretches to a square the way the
 * badge does (the img has both dimensions pinned and no object-fit), so the
 * measurement sees the same pixels the browser draws.
 */
export async function classifyIconBytes(bytes, label = 'icon') {
  let data;
  try {
    ({ data } = await sharp(bytes, { density: SVG_DENSITY })
      .resize(MEASURE_SIZE, MEASURE_SIZE, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }));
  } catch (error) {
    throw new Error(`Could not rasterize ${label} to measure legibility: ${error.message}`);
  }
  return classifyIcon(measureRgba(data));
}
