"use client";

import { useEffect, useState } from 'react';

type Listener = (now: number) => void;

const listeners = new Set<Listener>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function ensureInterval(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    const now = Date.now();
    listeners.forEach((listener) => listener(now));
  }, 1000);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  ensureInterval();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/**
 * Returns the current Unix timestamp (ms), ticking once per second.
 *
 * All subscribers share a single interval so rendering many relative-time
 * values stays cheap. The hook starts with the time captured at first render
 * (after hydration) and updates in place each tick.
 */
export function useNow(): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => subscribe(setNow), []);
  return now;
}
