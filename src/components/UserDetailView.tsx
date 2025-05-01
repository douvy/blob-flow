"use client";

import React from 'react';
import useScrollLock from '../hooks/useScrollLock';
import useDragToClose from '../hooks/useDragToClose';

interface DetailItem {
  id: string;
  status: 'confirmed' | 'pending';
  cost: string;
  blockNumber?: string;
  timestamp: string;
}

interface UserDetailViewProps {
  userId: number;
  userName: string;
  onClose: () => void;
}

export default function UserDetailView({ userId, userName, onClose }: UserDetailViewProps) {
  // Lock scrolling when the modal is open
  useScrollLock(true);
  
  // Sample data - would be fetched from API in production based on userId
  const detailItems: DetailItem[] = [
    {
      id: '0xabcd1234efgh5678',
      status: 'confirmed',
      cost: '0.00123 ETH',
      blockNumber: '19342751',
      timestamp: '30 sec ago'
    },
    {
      id: '0xijkl9012mnop3456',
      status: 'confirmed',
      cost: '0.00098 ETH',
      blockNumber: '19342749',
      timestamp: '2 min ago'
    },
    {
      id: '0xqrst7890uvwx1234',
      status: 'pending',
      cost: '0.00145 ETH',
      timestamp: '1 min ago'
    },
    {
      id: '0xyzab5678cdef9012',
      status: 'confirmed',
      cost: '0.00087 ETH',
      blockNumber: '19342747',
      timestamp: '4 min ago'
    },
    {
      id: '0xghij3456klmn7890',
      status: 'confirmed',
      cost: '0.00112 ETH',
      blockNumber: '19342745',
      timestamp: '6 min ago'
    },
    {
      id: '0xopqr1234stuv5678',
      status: 'pending',
      cost: '0.00132 ETH',
      timestamp: '3 min ago'
    }
  ];

  const userColors = {
    'Arbitrum': 'bg-blue-500',
    'Optimism': 'bg-red-500',
    'Base': 'bg-blue-300',
    'zkSync': 'bg-purple-500',
    'Unknown': 'bg-gray-500'
  };

  // @ts-ignore - We'll assume the color exists for the sample
  const userColor = userColors[userName] || 'bg-gray-500';
  
  // Handle click outside to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Handle Escape key to close modal
  React.useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose]);
  
  // Removed complex drag to close in favor of direct implementation

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-[1px] flex items-end md:items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="select-none bg-[#14161a] rounded-none md:rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] md:max-h-[80vh] h-[90vh] md:h-auto overflow-hidden border-t md:border border-divider"
        onMouseDown={(e) => {
          // Only apply on mobile
          if (window.innerWidth >= 768) return;
          
          // Prevent text selection
          e.preventDefault();
          
          const modal = e.currentTarget;
          const startY = e.clientY;
          let dragging = true;
          
          // Prevent text selection during drag
          document.body.style.userSelect = 'none';
          
          function onMouseMove(moveE) {
            if (!dragging) return;
            moveE.preventDefault();
            const deltaY = moveE.clientY - startY;
            if (deltaY > 0) {
              modal.style.transform = `translateY(${deltaY}px)`;
            }
          }
          
          function onMouseUp(upE) {
            dragging = false;
            document.body.style.userSelect = '';
            
            const deltaY = upE.clientY - startY;
            if (deltaY > 50) {
              // Apply final animation before closing
              modal.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
              modal.style.opacity = '0';
              modal.style.transform = `translateY(${window.innerHeight}px)`;
              
              // Delay close to allow animation
              setTimeout(() => {
                // Reset styles before closing to ensure clean reopening
                onClose();
                modal.style.opacity = '1';
                modal.style.transform = '';
                modal.style.transition = '';
              }, 200);
            } else {
              modal.style.transition = 'transform 0.2s ease-out';
              modal.style.transform = '';
              // Remove transition after animation completes
              setTimeout(() => {
                modal.style.transition = '';
              }, 200);
            }
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          }
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
        onTouchStart={(e) => {
          // Only apply on mobile
          if (window.innerWidth >= 768) return;
          
          const modal = e.currentTarget;
          const startY = e.touches[0].clientY;
          
          function onTouchMove(moveE) {
            const touchY = moveE.touches[0].clientY;
            const deltaY = touchY - startY;
            if (deltaY > 0) {
              modal.style.transform = `translateY(${deltaY}px)`;
              // Prevent scrolling while dragging
              moveE.preventDefault();
            }
          }
          
          function onTouchEnd(endE) {
            let deltaY = 0;
            if (endE.changedTouches && endE.changedTouches.length > 0) {
              deltaY = endE.changedTouches[0].clientY - startY;
            }
            
            if (deltaY > 50) {
              // Apply final animation before closing
              modal.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
              modal.style.opacity = '0';
              modal.style.transform = `translateY(${window.innerHeight}px)`;
              
              // Delay close to allow animation
              setTimeout(() => {
                // Reset styles before closing to ensure clean reopening
                onClose();
                modal.style.opacity = '1';
                modal.style.transform = '';
                modal.style.transition = '';
              }, 200);
            } else {
              modal.style.transition = 'transform 0.2s ease-out';
              modal.style.transform = '';
              // Remove transition after animation completes
              setTimeout(() => {
                modal.style.transition = '';
              }, 200);
            }
            
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
          }
          
          document.addEventListener('touchmove', onTouchMove, { passive: false });
          document.addEventListener('touchend', onTouchEnd);
        }}
      >
        <div className="w-full flex items-center justify-center pt-3 pb-1 md:hidden">
          <div className="w-16 h-1 bg-gray-300/20 rounded-full"></div>
        </div>
        <div className="flex items-center justify-between p-4 border-b border-divider">
          <div className="flex items-center w-full justify-center relative">
            <h2 className="text-xl font-windsor-bold text-titleText text-center">{userName} Details</h2>
            <button 
              onClick={onClose}
              className="text-[#6c727f] hover:text-white absolute right-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-4 pt-0 overflow-y-auto max-h-[calc(100vh-80px)] md:max-h-[calc(80vh-80px)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-divider w-max">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[#6e7687] uppercase tracking-wider whitespace-nowrap">ID</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[#6e7687] uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[#6e7687] uppercase tracking-wider whitespace-nowrap">Cost</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[#6e7687] uppercase tracking-wider whitespace-nowrap">Block / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {detailItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#23252a] transition-colors">
                    <td className="py-3 px-4 text-sm font-mono text-bodyText whitespace-nowrap">{item.id}</td>
                    <td className="py-3 px-4 text-sm text-bodyText whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        item.status === 'confirmed' 
                          ? 'bg-green text-[#14171f]' 
                          : 'bg-yellow text-black'
                      }`}>
                        {item.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-bodyText whitespace-nowrap">{item.cost}</td>
                    <td className="py-3 px-4 text-sm text-bodyText whitespace-nowrap">
                      {item.status === 'confirmed' 
                        ? `Block ${item.blockNumber} (${item.timestamp})` 
                        : `Pending (${item.timestamp})`
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}