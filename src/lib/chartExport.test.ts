import { capturePixelRatio } from './chartExport';

describe('capturePixelRatio', () => {
  it('scales a narrow card up toward a shareable width', () => {
    // A 600px frame at 4x clears the 2400px target.
    expect(capturePixelRatio(600, 1)).toBe(4);
  });

  it('never rasterizes below 3x, even for a wide card on a 1x display', () => {
    expect(capturePixelRatio(1600, 1)).toBe(3);
    expect(capturePixelRatio(2400, 1)).toBe(3);
  });

  it('follows a denser display when it asks for more than the floor', () => {
    expect(capturePixelRatio(2400, 3.5)).toBe(3.5);
  });

  it('caps the ratio so a full-width card cannot balloon the raster', () => {
    expect(capturePixelRatio(100, 8)).toBe(4);
  });

  it('falls back to the floor when the frame has not been laid out', () => {
    expect(capturePixelRatio(0, 1)).toBe(3);
  });
});
