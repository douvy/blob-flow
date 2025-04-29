"use client";

import React from 'react';

interface MempoolTransaction {
  id: number;
  txHash: string;
  fromAddress: string;
  user: string | null;
  blobCount: number;
  estimatedCost: string;
  timeInMempool: string;
}

export default function MempoolTable() {
  // Sample data - would be fetched from API in production
  const pendingTransactions: MempoolTransaction[] = [
    {
      id: 1,
      txHash: '0xabcd1234efgh5678ijkl9012mnop3456qrst7890',
      fromAddress: '0xDEF456...',
      user: 'Arbitrum',
      blobCount: 3,
      estimatedCost: '0.00123 ETH',
      timeInMempool: '45 sec'
    },
    {
      id: 2,
      txHash: '0xuvwx5678yz901234abcd5678efgh9012ijkl3456',
      fromAddress: '0xABC123...',
      user: 'Optimism',
      blobCount: 2,
      estimatedCost: '0.00089 ETH',
      timeInMempool: '2 min'
    },
    {
      id: 3,
      txHash: '0xmnop9012qrst3456uvwx7890yz901234abcd5678',
      fromAddress: '0x789EFG...',
      user: 'Base',
      blobCount: 1,
      estimatedCost: '0.00042 ETH',
      timeInMempool: '1 min'
    },
    {
      id: 4,
      txHash: '0xefgh3456ijkl7890mnop1234qrst5678uvwx9012',
      fromAddress: '0x456HIJ...',
      user: null,
      blobCount: 4,
      estimatedCost: '0.00157 ETH',
      timeInMempool: '30 sec'
    },
    {
      id: 5,
      txHash: '0xyzab5678cdef9012ghij3456klmn7890opqr1234',
      fromAddress: '0x123KLM...',
      user: 'zkSync',
      blobCount: 2,
      estimatedCost: '0.00098 ETH',
      timeInMempool: '5 min'
    }
  ];

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Mempool Attribution</h2>
      <div className="overflow-x-auto border border-divider rounded-lg">
        <table className="min-w-full overflow-hidden table-fixed">
          <thead>
            <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[24%]">TX Hash</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">From</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">User</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%] whitespace-nowrap">Count</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%]">Est. Cost</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[14%] whitespace-nowrap">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {pendingTransactions.map((tx) => (
              <tr key={tx.id} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors">
                <td className="py-3 px-6 text-sm font-mono text-white">{tx.txHash.substring(0, 8)}...</td>
                <td className="py-3 px-6 text-sm font-mono text-white">{tx.fromAddress}</td>
                <td className="py-3 px-6 text-sm text-white">
                  {tx.user ? (
                    <div className="flex items-center">
                      <img 
                        src={`/images/${tx.user.toLowerCase()}.png`} 
                        alt={tx.user} 
                        className="inline-block w-5 h-5 mr-3" 
                      />
                      {tx.user}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="inline-block w-5 h-5 rounded-full mr-3 bg-gray-500"></span>
                      <span className="text-white">Unknown</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{tx.blobCount}</td>
                <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{tx.estimatedCost}</td>
                <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{tx.timeInMempool}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}