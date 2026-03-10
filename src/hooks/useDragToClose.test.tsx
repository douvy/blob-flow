import React from 'react';
import { render } from '@testing-library/react';
import useDragToClose from './useDragToClose';

function touchEvent(type: string, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', {
    value: [{ clientY: y }],
    configurable: true,
  });
  return event;
}

function TestComponent({ onClose, threshold = 0.15 }: { onClose: () => void; threshold?: number }) {
  useDragToClose({ onClose, threshold, elementId: 'drag-handle' });

  return (
    <div id="test-tray" className="fixed">
      <div id="drag-handle">Handle</div>
    </div>
  );
}

describe('useDragToClose', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes when dragged past threshold', async () => {
    const onClose = vi.fn();
    render(<TestComponent onClose={onClose} />);

    const tray = document.getElementById('test-tray') as HTMLElement;
    const handle = document.getElementById('drag-handle') as HTMLElement;
    Object.defineProperty(tray, 'offsetHeight', { value: 200, configurable: true });

    handle.dispatchEvent(touchEvent('touchstart', 0));
    handle.dispatchEvent(touchEvent('touchmove', 120));
    handle.dispatchEvent(touchEvent('touchend', 120));

    await vi.advanceTimersByTimeAsync(300);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(tray.style.opacity).toBe('1');
    expect(tray.style.transform).toBe('');
  });

  it('resets position without closing when drag is below threshold', () => {
    const onClose = vi.fn();
    render(<TestComponent onClose={onClose} threshold={0.5} />);

    const tray = document.getElementById('test-tray') as HTMLElement;
    const handle = document.getElementById('drag-handle') as HTMLElement;
    Object.defineProperty(tray, 'offsetHeight', { value: 300, configurable: true });

    handle.dispatchEvent(touchEvent('touchstart', 100));
    handle.dispatchEvent(touchEvent('touchmove', 140));
    handle.dispatchEvent(touchEvent('touchend', 140));

    expect(onClose).not.toHaveBeenCalled();
    expect(tray.style.opacity).toBe('1');
    expect(tray.style.transform).toBe('');
  });
});
