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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-container rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center">
            <span className={`w-4 h-4 rounded-full mr-3 ${userColor}`}></span>
            <h2 className="text-xl font-windsor-bold text-titleText">{userName} Details</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-opacity-30 bg-gray-800">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-titleText uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-titleText uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-titleText uppercase tracking-wider">Cost</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-titleText uppercase tracking-wider">Block / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {detailItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800 hover:bg-opacity-20 transition-colors">
                    <td className="py-3 px-4 text-sm font-mono text-bodyText">{item.id}</td>
                    <td className="py-3 px-4 text-sm text-bodyText">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        item.status === 'confirmed' 
                          ? 'bg-green-900 bg-opacity-30 text-green-300' 
                          : 'bg-yellow-900 bg-opacity-30 text-yellow-300'
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
        
        <div className="p-4 border-t border-gray-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}