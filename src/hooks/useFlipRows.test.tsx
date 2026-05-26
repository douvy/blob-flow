import React from 'react';
import { render } from '@testing-library/react';
import { useFlipRows } from './useFlipRows';

interface TestTableProps {
  rows: string[];
  resetKey?: unknown;
  mountTbody?: boolean;
}

function TestTable({ rows, resetKey, mountTbody = true }: TestTableProps) {
  const tbodyRef = React.useRef<HTMLTableSectionElement>(null);
  useFlipRows(tbodyRef, resetKey);
  if (!mountTbody) return null;
  return (
    <table>
      <tbody ref={tbodyRef}>
        {rows.map((k) => (
          <tr key={k} data-row-key={k}>
            <td>{k}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type FakeAnimation = {
  finish: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null;
  options: KeyframeAnimationOptions | number | undefined;
};

type AnimateMock = ReturnType<typeof vi.fn>;

function installAnimate(
  impl?: (keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: KeyframeAnimationOptions | number) => FakeAnimation
): { animations: FakeAnimation[]; spy: AnimateMock } {
  const animations: FakeAnimation[] = [];
  const spy = vi.fn(function (
    this: HTMLElement,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: KeyframeAnimationOptions | number
  ) {
    const animation: FakeAnimation = impl
      ? impl(keyframes, options)
      : { finish: vi.fn(), cancel: vi.fn(), keyframes, options };
    animations.push(animation);
    return animation as unknown as Animation;
  });
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: spy,
  });
  return { animations, spy };
}

function spyOnAnimate(): { animations: FakeAnimation[]; spy: AnimateMock } {
  return installAnimate();
}

function spyOnPositions(map: Record<string, number>) {
  return vi
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: Element) {
      const key = (this as HTMLElement).dataset?.rowKey;
      const top = key !== undefined && key in map ? map[key] : 0;
      return {
        top,
        left: 0,
        right: 0,
        bottom: top,
        width: 0,
        height: 0,
        x: 0,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    });
}

describe('useFlipRows', () => {
  afterEach(() => {
    // installAnimate adds a property that the default vi.restoreAllMocks() does
    // not undo. Remove it so the next test starts with a clean prototype.
    if (Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'animate')) {
      Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    }
  });

  it('does not animate on the initial render', () => {
    const { spy } = spyOnAnimate();
    spyOnPositions({ a: 0, b: 30, c: 60 });

    render(<TestTable rows={['a', 'b', 'c']} resetKey="net" />);

    expect(spy).not.toHaveBeenCalled();
  });

  it('skips when the row signature is unchanged', () => {
    const { spy } = spyOnAnimate();
    const rectSpy = spyOnPositions({ a: 0, b: 30, c: 60 });

    const { rerender } = render(<TestTable rows={['a', 'b', 'c']} resetKey="net" />);
    spy.mockClear();
    rectSpy.mockClear();

    rerender(<TestTable rows={['a', 'b', 'c']} resetKey="net" />);

    expect(spy).not.toHaveBeenCalled();
    // Bail-out path: we read row keys but skip measuring on the no-op rerender.
    expect(rectSpy).not.toHaveBeenCalled();
  });

  it('plays an enter animation for new rows and FLIP for shifted rows', () => {
    const { spy, animations } = spyOnAnimate();
    const rectSpy = spyOnPositions({ a: 0, b: 30, c: 60 });

    const { rerender } = render(<TestTable rows={['a', 'b', 'c']} resetKey="net" />);

    rectSpy.mockImplementation(function (this: Element) {
      const key = (this as HTMLElement).dataset?.rowKey;
      const positions: Record<string, number> = { z: 0, a: 30, b: 60, c: 90 };
      const top = key !== undefined && key in positions ? positions[key] : 0;
      return {
        top,
        left: 0,
        right: 0,
        bottom: top,
        width: 0,
        height: 0,
        x: 0,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    });

    rerender(<TestTable rows={['z', 'a', 'b', 'c']} resetKey="net" />);

    // z enters; a, b, c each shifted by 30px -> 4 animations.
    expect(spy).toHaveBeenCalledTimes(4);

    const enterAnim = animations[0];
    const enterFrames = enterAnim.keyframes as Keyframe[];
    expect(enterFrames[0]).toMatchObject({ opacity: 0, transform: 'translateY(-10px)' });
    expect(enterFrames[1]).toMatchObject({ opacity: 0.65, transform: 'translateY(-3px)' });
    expect(enterFrames[2]).toMatchObject({ opacity: 1, transform: 'translateY(0)' });
    expect(enterAnim.options).toMatchObject({
      duration: 1400,
      easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      fill: 'backwards',
    });

    const flipAnim = animations[1];
    const flipFrames = flipAnim.keyframes as Keyframe[];
    expect(flipFrames[0]).toMatchObject({ transform: 'translateY(-30px)' });
    expect(flipFrames[1]).toMatchObject({ transform: 'translateY(0)' });
    expect(flipAnim.options).toMatchObject({
      duration: 950,
      easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    });
  });

  it('finishes prior FLIP animations before re-measuring', () => {
    const { animations } = spyOnAnimate();
    const rectSpy = spyOnPositions({ a: 0, b: 30, c: 60 });

    const { rerender } = render(<TestTable rows={['a', 'b', 'c']} resetKey="net" />);

    // Trigger a first FLIP pass.
    rectSpy.mockImplementation(function (this: Element) {
      const key = (this as HTMLElement).dataset?.rowKey;
      const positions: Record<string, number> = { z: 0, a: 30, b: 60, c: 90 };
      const top = key !== undefined && key in positions ? positions[key] : 0;
      return { top, left: 0, right: 0, bottom: top, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    rerender(<TestTable rows={['z', 'a', 'b', 'c']} resetKey="net" />);

    const firstPass = [...animations];
    expect(firstPass.length).toBeGreaterThan(0);
    firstPass.forEach((a) => expect(a.finish).not.toHaveBeenCalled());

    // Second pass: another new row pushes everyone down again.
    rectSpy.mockImplementation(function (this: Element) {
      const key = (this as HTMLElement).dataset?.rowKey;
      const positions: Record<string, number> = { y: 0, z: 30, a: 60, b: 90, c: 120 };
      const top = key !== undefined && key in positions ? positions[key] : 0;
      return { top, left: 0, right: 0, bottom: top, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    rerender(<TestTable rows={['y', 'z', 'a', 'b', 'c']} resetKey="net" />);

    // All prior animations were finished before the new measurement.
    firstPass.forEach((a) => expect(a.finish).toHaveBeenCalledTimes(1));
  });

  it('cancels prior animations and skips animating when resetKey changes', () => {
    const { animations, spy } = spyOnAnimate();
    const rectSpy = spyOnPositions({ a: 0, b: 30, c: 60 });

    const { rerender } = render(<TestTable rows={['a', 'b', 'c']} resetKey="net-1" />);

    rectSpy.mockImplementation(function (this: Element) {
      const key = (this as HTMLElement).dataset?.rowKey;
      const positions: Record<string, number> = { z: 0, a: 30, b: 60, c: 90 };
      const top = key !== undefined && key in positions ? positions[key] : 0;
      return { top, left: 0, right: 0, bottom: top, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    rerender(<TestTable rows={['z', 'a', 'b', 'c']} resetKey="net-1" />);

    const beforeReset = [...animations];
    expect(beforeReset.length).toBeGreaterThan(0);
    spy.mockClear();

    // Network change: completely different data set.
    rectSpy.mockImplementation(function (this: Element) {
      const key = (this as HTMLElement).dataset?.rowKey;
      const positions: Record<string, number> = { x: 0, y: 30 };
      const top = key !== undefined && key in positions ? positions[key] : 0;
      return { top, left: 0, right: 0, bottom: top, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    rerender(<TestTable rows={['x', 'y']} resetKey="net-2" />);

    // Prior animations were cancelled, no new animations played on the reset render.
    beforeReset.forEach((a) => expect(a.cancel).toHaveBeenCalledTimes(1));
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not animate when prefers-reduced-motion is set', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', matchMedia);
    const { spy } = spyOnAnimate();
    const rectSpy = spyOnPositions({ a: 0, b: 30 });

    const { rerender } = render(<TestTable rows={['a', 'b']} resetKey="net" />);

    rectSpy.mockImplementation(function (this: Element) {
      const key = (this as HTMLElement).dataset?.rowKey;
      const positions: Record<string, number> = { c: 0, a: 30, b: 60 };
      const top = key !== undefined && key in positions ? positions[key] : 0;
      return { top, left: 0, right: 0, bottom: top, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    rerender(<TestTable rows={['c', 'a', 'b']} resetKey="net" />);

    expect(spy).not.toHaveBeenCalled();
  });

  it('is a no-op when the tbody ref is not attached', () => {
    const { spy } = spyOnAnimate();
    expect(() => {
      render(<TestTable rows={['a']} resetKey="net" mountTbody={false} />);
    }).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it('skips FLIP animations for rows whose position did not change meaningfully', () => {
    const { spy } = spyOnAnimate();
    spyOnPositions({ a: 0, b: 30 });

    const { rerender } = render(<TestTable rows={['a', 'b']} resetKey="net" />);
    spy.mockClear();
    // Order swap with no positional change (same mocked rects) -> no animations.
    rerender(<TestTable rows={['b', 'a']} resetKey="net" />);

    expect(spy).not.toHaveBeenCalled();
  });

  it('swallows errors from finish() and cancel() in the underlying Animation', () => {
    const { animations } = installAnimate((keyframes, options) => ({
      finish: vi.fn(() => {
        throw new Error('boom');
      }),
      cancel: vi.fn(() => {
        throw new Error('boom');
      }),
      keyframes,
      options,
    }));
    const rectSpy = spyOnPositions({ a: 0, b: 30 });

    const { rerender } = render(<TestTable rows={['a', 'b']} resetKey="net" />);

    rectSpy.mockImplementation(function (this: Element) {
      const key = (this as HTMLElement).dataset?.rowKey;
      const positions: Record<string, number> = { c: 0, a: 30, b: 60 };
      const top = key !== undefined && key in positions ? positions[key] : 0;
      return { top, left: 0, right: 0, bottom: top, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });

    // First FLIP pass: produces animations whose finish() throws.
    rerender(<TestTable rows={['c', 'a', 'b']} resetKey="net" />);
    expect(animations.length).toBeGreaterThan(0);

    rectSpy.mockImplementation(function (this: Element) {
      const key = (this as HTMLElement).dataset?.rowKey;
      const positions: Record<string, number> = { d: 0, c: 30, a: 60, b: 90 };
      const top = key !== undefined && key in positions ? positions[key] : 0;
      return { top, left: 0, right: 0, bottom: top, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });

    // Second pass: prior finish() throws are swallowed.
    expect(() => {
      rerender(<TestTable rows={['d', 'c', 'a', 'b']} resetKey="net" />);
    }).not.toThrow();

    // resetKey change: cancel() throws are also swallowed.
    expect(() => {
      rerender(<TestTable rows={['d', 'c', 'a', 'b']} resetKey="net-2" />);
    }).not.toThrow();
  });
});
