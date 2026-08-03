import { capturePixelRatio } from './chartExport';

describe('capturePixelRatio', () => {
  // A short dashboard card: plenty of pixel budget to spare.
  const SHORT = 260;

  it('scales a narrow card up toward a shareable width', () => {
    // A 600px frame at 4x clears the 2400px target.
    expect(capturePixelRatio(600, SHORT, 1)).toBe(4);
  });

  it('never rasterizes below 3x, even for a wide card on a 1x display', () => {
    expect(capturePixelRatio(1600, SHORT, 1)).toBe(3);
    expect(capturePixelRatio(2400, SHORT, 1)).toBe(3);
  });

  it('follows a denser display when it asks for more than the floor', () => {
    expect(capturePixelRatio(2400, SHORT, 3.5)).toBe(3.5);
  });

  it('caps the ratio so a full-width card cannot balloon the raster', () => {
    expect(capturePixelRatio(100, SHORT, 8)).toBe(4);
  });

  it('falls back to the floor when the frame has not been laid out', () => {
    expect(capturePixelRatio(0, 0, 1)).toBe(3);
  });

  it('trades resolution for a canvas the browser will actually allocate', () => {
    // A full-width detail chart: 3x here would ask for ~19M pixels, past
    // what Safari will allocate.
    const ratio = capturePixelRatio(1532, 900, 2);
    expect(ratio).toBeLessThan(3);
    expect(1532 * ratio * (900 * ratio)).toBeLessThanOrEqual(12_000_000);
  });

  it('never shrinks an export below its on-screen size', () => {
    expect(capturePixelRatio(6000, 4000, 2)).toBe(1);
  });
});
