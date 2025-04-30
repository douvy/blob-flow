"use client";

import { useEffect } from 'react';

/**
 * A React hook that prevents scrolling of the body element when active
 * 
 * @param isLocked - Boolean to determine if scrolling should be locked
 */
export default function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) {
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
      return;
    }

    // Save the current scroll position and padding
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Add padding right to prevent layout shift when scrollbar disappears
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    // Lock scrolling
    document.body.style.overflow = 'hidden';
    
    // Set the position to ensure page doesn't jump
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    return () => {
      // Restore scrolling when component unmounts or isLocked becomes false
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('width');
      document.body.style.removeProperty('padding-right');
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}