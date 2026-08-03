import { buildSparkDataUrl, buildSparkGeometry } from './ogChartSpark';

const box = { width: 100, height: 50, padding: 5, gridLines: 2 };

function decodeDataUrl(dataUrl: string): string {
  return Buffer.from(dataUrl.replace('data:image/svg+xml;base64,', ''), 'base64').toString();
}

describe('buildSparkGeometry', () => {
  it('spans the box with the series and closes the area along the baseline', () => {
    const geometry = buildSparkGeometry([0, 5, 10], box);

    // Lowest value sits on the bottom inset, highest on the top inset.
    expect(geometry?.line).toBe('M5,45L50,25L95,5');
    expect(geometry?.area).toBe('M5,45L5,45L50,25L95,5L95,45Z');
  });

  it('centers a flat series instead of dividing by a zero range', () => {
    expect(buildSparkGeometry([7, 7, 7], box)?.line).toBe('M5,25L50,25L95,25');
  });

  it('centers a single point horizontally', () => {
    expect(buildSparkGeometry([3], box)?.line).toBe('M50,25');
  });

  it('skips non-finite values rather than emitting NaN coordinates', () => {
    const geometry = buildSparkGeometry([0, Number.NaN, 10], box);

    expect(geometry?.line).toBe('M5,45L95,5');
    expect(geometry?.line).not.toContain('NaN');
  });

  it('returns null when there is nothing plottable or no room to plot it', () => {
    expect(buildSparkGeometry([], box)).toBeNull();
    expect(buildSparkGeometry([Number.NaN], box)).toBeNull();
    expect(buildSparkGeometry([1, 2], { width: 8, height: 50, padding: 5 })).toBeNull();
  });

  it('spaces gridlines evenly inside the box', () => {
    expect(buildSparkGeometry([0, 10], box)?.gridY).toEqual([18.33, 31.67]);
  });
});

describe('buildSparkDataUrl', () => {
  it('encodes an SVG carrying the series paths and the given colors', () => {
    const dataUrl = buildSparkDataUrl([0, 5, 10], {
      ...box,
      stroke: '#3b55e6',
      fill: '#3b55e6',
    });
    const svg = decodeDataUrl(dataUrl ?? '');

    expect(svg).toContain('viewBox="0 0 100 50"');
    expect(svg).toContain('M5,45L50,25L95,5');
    expect(svg).toContain('stroke="#3b55e6"');
    expect(svg).toContain('stop-color="#3b55e6"');
  });

  it('returns null for an unplottable series so callers can fall back', () => {
    expect(buildSparkDataUrl([], { ...box, stroke: '#fff', fill: '#fff' })).toBeNull();
  });
});
