"use client";

import { useRef, useEffect } from 'react';

interface DragToCloseOptions {
  onClose: () => void;
  threshold?: number; // Percentage of height that triggers close
  elementId?: string; // Optional ID of drag handle element
}

export default function useDragToClose({
  onClose,
  threshold = 0.15, // Default threshold: 15% of element height
  elementId
}: DragToCloseOptions) {
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);
  
  useEffect(() => {
    const handleElement = elementId ? document.getElementById(elementId) : null;
    
    if (!handleElement) return; // Return if handle element not found
    
    const modalElement = handleElement.closest('[id$="-tray"], [class*="modal"], [class*="fixed"]');
    if (!modalElement) return; // Return if no parent modal/tray element found
    
    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate on handle element
      startYRef.current = e.touches[0].clientY;
      currentYRef.current = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      
      currentYRef.current = e.touches[0].clientY;
      
      // Calculate drag distance
      const dragDistance = currentYRef.current - startYRef.current;
      
      if (dragDistance > 0) { // Only allow downward dragging
        // Apply transform to follow finger
        modalElement.style.transform = `translateY(${dragDistance}px)`;
        modalElement.style.transition = 'none';
        
        // Add opacity effect as it's dragged down
        const elementHeight = modalElement.offsetHeight;
        const dragPercentage = dragDistance / elementHeight;
        modalElement.style.opacity = `${1 - dragPercentage * 0.5}`; // Subtle opacity change
        
        // Prevent scrolling while dragging
        e.preventDefault();
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (startYRef.current === null || currentYRef.current === null) return;
      
      const elementHeight = modalElement.offsetHeight;
      const dragDistance = currentYRef.current - startYRef.current;
      const dragPercentage = dragDistance / elementHeight;
      
      // If dragged past threshold, close the modal
      if (dragPercentage > threshold && dragDistance > 20) { // At least 20px of drag
        // Animation before closing
        modalElement.style.transform = `translateY(${elementHeight}px)`;
        modalElement.style.opacity = '0';
        modalElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        
        // Delay close to allow animation
        setTimeout(() => {
          onClose();
          // Reset styles after closing
          modalElement.style.transform = '';
          modalElement.style.opacity = '1';
        }, 300);
      } else {
        // Reset position with animation
        modalElement.style.transform = '';
        modalElement.style.opacity = '1';
        modalElement.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
      }
      
      // Reset refs
      startYRef.current = null;
      currentYRef.current = null;
    };
    
    handleElement.addEventListener('touchstart', handleTouchStart);
    handleElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    handleElement.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      handleElement.removeEventListener('touchstart', handleTouchStart);
      handleElement.removeEventListener('touchmove', handleTouchMove);
      handleElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClose, threshold, elementId]);
}