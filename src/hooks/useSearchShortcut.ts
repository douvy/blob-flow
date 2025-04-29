"use client";

import { useEffect } from 'react';

export default function useSearchShortcut(callback: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Open search modal on / key press, but ignore if typing in an input
      if (
        e.key === '/' && 
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        callback();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
}