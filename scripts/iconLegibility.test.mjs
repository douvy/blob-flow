import {
  BACKDROP_RGB,
  BACKGROUND_RGB,
  MEASURE_SIZE,
  blendsInto,
  classifyIcon,
  classifyIconBytes,
  measureRgba,
} from './iconLegibility.mjs';

/** Fill a raw RGBA buffer with one color, for the simple whole-circle cases. */
function solid([r, g, b, a]) {
  const pixels = Buffer.alloc(MEASURE_SIZE * MEASURE_SIZE * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  }
  return pixels;
}

/** A dark glyph covering the left half of an otherwise transparent square. */
function halfDarkOnTransparent() {
  const pixels = Buffer.alloc(MEASURE_SIZE * MEASURE_SIZE * 4);
  for (let y = 0; y < MEASURE_SIZE; y++) {
    for (let x = 0; x < MEASURE_SIZE / 2; x++) {
      pixels[(y * MEASURE_SIZE + x) * 4 + 3] = 255;
    }
  }
  return pixels;
}

/** Minimal single-color SVG, for the end-to-end rasterizing path. */
function svg(fill) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">` +
      `<rect width="48" height="48" fill="${fill}"/></svg>`
  );
}

const rgb = (r, g, b) => ({ r, g, b });

describe('blendsInto', () => {
  it('treats near-background greys as lost on the page', () => {
    expect(blendsInto(rgb(0, 0, 0), BACKGROUND_RGB)).toBe(true);
    expect(blendsInto(BACKGROUND_RGB, BACKGROUND_RGB)).toBe(true);
    expect(blendsInto(rgb(40, 41, 44), BACKGROUND_RGB)).toBe(true);
  });

  it('keeps anything far enough from the page to read', () => {
    expect(blendsInto(rgb(255, 255, 255), BACKGROUND_RGB)).toBe(false);
    expect(blendsInto(rgb(60, 60, 60), BACKGROUND_RGB)).toBe(false);
  });

  it('keeps dim but saturated brand colors, which a luminance test would miss', () => {
    // Base blue and Taiko pink both sit low on the luminance scale yet read
    // clearly against the page.
    expect(blendsInto(rgb(0x00, 0x52, 0xff), BACKGROUND_RGB)).toBe(false);
    expect(blendsInto(rgb(0xe8, 0x1f, 0x9c), BACKGROUND_RGB)).toBe(false);
  });

  it('still loses a saturated near-black, which a saturation exemption would wave through', () => {
    expect(blendsInto(rgb(0x00, 0x10, 0x00), BACKGROUND_RGB)).toBe(true);
  });

  it('measures against the light backdrop too, where pale artwork is what disappears', () => {
    expect(blendsInto(rgb(255, 255, 255), BACKDROP_RGB)).toBe(true);
    expect(blendsInto(rgb(0, 0, 0), BACKDROP_RGB)).toBe(false);
  });
});

describe('measureRgba', () => {
  it('reports an opaque black square as lost on the page and readable on white', () => {
    const { darkFraction, backdropFraction, transparentFraction } = measureRgba(
      solid([0, 0, 0, 255])
    );
    expect(darkFraction).toBe(1);
    expect(backdropFraction).toBe(0);
    expect(transparentFraction).toBe(0);
  });

  it('reports an opaque white square as legible on the page', () => {
    expect(measureRgba(solid([255, 255, 255, 255])).darkFraction).toBe(0);
  });

  it('measures darkness over painted pixels only, so a small dark glyph still counts', () => {
    const { darkFraction, transparentFraction } = measureRgba(halfDarkOnTransparent());
    expect(darkFraction).toBe(1);
    expect(transparentFraction).toBeCloseTo(0.5, 1);
  });

  it('composites over each surface, so a faint wash is lost against both', () => {
    // White at 10% alpha lands a few points off #121316, and a few points off
    // the backdrop it would be moved onto.
    const { darkFraction, backdropFraction } = measureRgba(solid([255, 255, 255, 26]));
    expect(darkFraction).toBe(1);
    expect(backdropFraction).toBe(1);
  });

  it('ignores the corners the badge circle clips away', () => {
    const pixels = solid([255, 255, 255, 255]);
    // Black out the top-left corner, which falls outside the circle.
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const i = (y * MEASURE_SIZE + x) * 4;
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
      }
    }
    expect(measureRgba(pixels).darkFraction).toBe(0);
  });

  it('reports nothing dark for an entirely transparent square', () => {
    expect(measureRgba(solid([0, 0, 0, 0])).darkFraction).toBe(0);
  });
});

describe('classifyIcon', () => {
  it('backs a dark glyph that leaves the circle see-through', () => {
    expect(
      classifyIcon({ darkFraction: 1, backdropFraction: 0, transparentFraction: 0.7 })
    ).toMatchObject({ isDark: true, hasTransparency: true, needsLightBackdrop: true });
  });

  it('only outlines an opaque dark disc, which a backdrop could not reach', () => {
    expect(
      classifyIcon({ darkFraction: 1, backdropFraction: 0, transparentFraction: 0.02 })
    ).toMatchObject({ isDark: true, needsLightBackdrop: false });
  });

  it('leaves a legible logo alone even when it is mostly transparent', () => {
    expect(
      classifyIcon({ darkFraction: 0, backdropFraction: 0, transparentFraction: 0.65 })
    ).toMatchObject({ isDark: false, needsLightBackdrop: false });
  });

  it('withholds a backdrop that the artwork would disappear into as well', () => {
    // Faint pale artwork looks dark only because the page behind it is.
    expect(
      classifyIcon({ darkFraction: 1, backdropFraction: 1, transparentFraction: 0.7 })
    ).toMatchObject({ isDark: true, readsOnBackdrop: false, needsLightBackdrop: false });
  });
});

describe('classifyIconBytes', () => {
  it('flags a black SVG on a transparent field for a backdrop', async () => {
    const bytes = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">` +
        `<rect x="8" y="8" width="32" height="32" fill="#000000"/></svg>`
    );
    expect(await classifyIconBytes(bytes, 'black-glyph.svg')).toMatchObject({
      isDark: true,
      hasTransparency: true,
      needsLightBackdrop: true,
    });
  });

  it('flags an opaque black SVG as dark without a backdrop', async () => {
    expect(await classifyIconBytes(svg('#000000'), 'black.svg')).toMatchObject({
      isDark: true,
      hasTransparency: false,
      needsLightBackdrop: false,
    });
  });

  it('leaves a bright SVG unflagged', async () => {
    expect(await classifyIconBytes(svg('#ffffff'), 'white.svg')).toMatchObject({
      isDark: false,
      needsLightBackdrop: false,
    });
  });

  it('withholds a backdrop from a near-transparent white glyph', async () => {
    const bytes = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">` +
        `<rect x="8" y="8" width="32" height="32" fill="#ffffff" fill-opacity="0.1"/></svg>`
    );
    expect(await classifyIconBytes(bytes, 'faint.svg')).toMatchObject({
      isDark: true,
      needsLightBackdrop: false,
    });
  });

  it('names the icon when the artwork cannot be rasterized', async () => {
    await expect(classifyIconBytes(Buffer.from('not an image'), 'broken.png')).rejects.toThrow(
      /broken\.png/
    );
  });
});
