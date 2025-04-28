"use client";

import React, { useState } from 'react';

interface Block {
  id: number;
  number: string;
  blobCount: number;
  timestamp: string;
  attribution: string[];
}

export default function LatestBlocksTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sample data - would be fetched from an API in a real application
  const blocks: Block[] = [
    {
      id: 1,
      number: '19342751',
      blobCount: 6,
      timestamp: '30 sec ago',
      attribution: ['Arbitrum', 'Base']
    },
    {
      id: 2,
      number: '19342750',
      blobCount: 12,
      timestamp: '1 min ago',
      attribution: ['Arbitrum', 'Optimism', 'Base']
    },
    {
      id: 3,
      number: '19342749',
      blobCount: 3,
      timestamp: '2 min ago',
      attribution: ['Optimism']
    },
    {
      id: 4,
      number: '19342748',
      blobCount: 8,
      timestamp: '3 min ago',
      attribution: ['Arbitrum', 'zkSync']
    },
    {
      id: 5,
      number: '19342747',
      blobCount: 16,
      timestamp: '4 min ago',
      attribution: ['Optimism', 'Base', 'zkSync']
    },
    {
      id: 6,
      number: '19342746',
      blobCount: 4,
      timestamp: '5 min ago',
      attribution: ['Arbitrum']
    },
    {
      id: 7,
      number: '19342745',
      blobCount: 9,
      timestamp: '6 min ago',
      attribution: ['Optimism', 'zkSync']
    },
    {
      id: 8,
      number: '19342744',
      blobCount: 11,
      timestamp: '7 min ago',
      attribution: ['Arbitrum', 'Base']
    },
    {
      id: 9,
      number: '19342743',
      blobCount: 7,
      timestamp: '8 min ago',
      attribution: ['Base', 'Optimism']
    },
    {
      id: 10,
      number: '19342742',
      blobCount: 14,
      timestamp: '9 min ago',
      attribution: ['zkSync', 'Arbitrum', 'Base']
    }
  ];

  // Calculate pagination
  const totalPages = Math.ceil(blocks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBlocks = blocks.slice(indexOfFirstItem, indexOfLastItem);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <section className="mb-10">
      <h2 className="text-xl font-windsor-bold text-titleText mb-4">Latest Blocks</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full rounded-lg overflow-hidden bg-container">
          <thead className="bg-opacity-30 bg-gray-800">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-titleText uppercase tracking-wider">Block</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-titleText uppercase tracking-wider">Blobs</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-titleText uppercase tracking-wider">Time</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-titleText uppercase tracking-wider">Attribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {currentBlocks.map((block) => (
              <tr key={block.id} className="hover:bg-gray-800 hover:bg-opacity-20 transition-colors">
                <td className="py-3 px-4 text-sm font-medium text-bodyText">{block.number}</td>
                <td className="py-3 px-4 text-sm text-bodyText">{block.blobCount}</td>
                <td className="py-3 px-4 text-sm text-bodyText">{block.timestamp}</td>
                <td className="py-3 px-4 text-sm text-bodyText">
                  <div className="flex flex-wrap gap-1">
                    {block.attribution.map((attr, idx) => (
                      <span 
                        key={idx} 
                        className={`text-xs px-2 py-1 rounded-full ${
                          attr === 'Arbitrum' ? 'bg-blue-900 bg-opacity-30 text-blue-300' :
                          attr === 'Optimism' ? 'bg-red-900 bg-opacity-30 text-red-300' :
                          attr === 'Base' ? 'bg-blue-800 bg-opacity-30 text-blue-200' :
                          'bg-purple-900 bg-opacity-30 text-purple-300'
                        }`}
                      >
                        {attr}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination controls */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-bodyText">
          Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, blocks.length)} of {blocks.length}
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={prevPage} 
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md bg-container ${
              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'
            }`}
          >
            Previous
          </button>
          <button 
            onClick={nextPage} 
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md bg-container ${
              currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}