"use client";

import React from 'react';

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

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#14161a] rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden border border-divider">
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
        
        <div className="p-4 pt-0 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-divider">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[#6e7687] uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[#6e7687] uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[#6e7687] uppercase tracking-wider">Cost</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[#6e7687] uppercase tracking-wider">Block / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {detailItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#23252a] transition-colors">
                    <td className="py-3 px-4 text-sm font-mono text-bodyText">{item.id}</td>
                    <td className="py-3 px-4 text-sm text-bodyText">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        item.status === 'confirmed' 
                          ? 'bg-green text-[#14171f]' 
                          : 'bg-yellow text-black'
                      }`}>
                        {item.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-bodyText">{item.cost}</td>
                    <td className="py-3 px-4 text-sm text-bodyText">
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