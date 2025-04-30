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
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Latest Blocks</h2>
      <div className="overflow-x-auto border border-divider rounded-lg">
        <table className="min-w-full overflow-hidden table-fixed">
          <thead>
            <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/5">Block</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">Blobs</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/4 whitespace-nowrap">Time</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-2/5">Attribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {currentBlocks.map((block) => (
              <tr key={block.id} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors">
                <td className="py-3 px-6 text-sm font-medium text-white">{block.number}</td>
                <td className="py-3 px-6 text-sm text-white">{block.blobCount}</td>
                <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{block.timestamp}</td>
                <td className="py-3 px-6 text-sm text-white">
                  {block.attribution.length === 1 ? (
                    <div className="flex items-center">
                      <img 
                        src={`/images/${block.attribution[0].toLowerCase()}.png`} 
                        alt={block.attribution[0]} 
                        className="inline-block w-5 h-5 mr-2" 
                      />
                      <span className="whitespace-nowrap">{block.attribution[0]}</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {block.attribution.map((attr, idx) => (
                          <img 
                            key={idx}
                            src={`/images/${attr.toLowerCase()}.png`} 
                            alt={attr} 
                            className="inline-block w-5 h-5 rounded-full ring-1 ring-gray-800 min-w-5 min-h-5" 
                            title={attr}
                          />
                        ))}
                      </div>
                      <span className="whitespace-nowrap text-xs text-gray-400 ml-6">
                        {block.attribution.length} networks
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination controls */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-[#6e7787]">
          Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, blocks.length)} of {blocks.length}
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={prevPage} 
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm rounded-md bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button 
            onClick={nextPage} 
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm rounded-md bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}