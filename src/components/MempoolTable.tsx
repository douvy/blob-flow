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
      <h2 className="text-2xl font-windsor-bold text-white mb-3">Mempool Attribution</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full overflow-hidden">
          <thead>
            <tr className="border-b border-divider">
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider">TX Hash</th>
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider">From Address</th>
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider">User</th>
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider">Expected Count</th>
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider w-28">Est. Cost</th>
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider">Time in Mempool</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {pendingTransactions.map((tx) => (
              <tr key={tx.id} className="bg-[#141519] hover:bg-opacity-80 transition-colors">
                <td className="py-4 px-6 text-sm font-mono text-white truncate max-w-[150px]">{tx.txHash}</td>
                <td className="py-4 px-6 text-sm font-mono text-white">{tx.fromAddress}</td>
                <td className="py-4 px-6 text-sm text-white">
                  {tx.user ? (
                    <span className="text-white text-sm flex items-center">
                      <img 
                        src={`/images/${tx.user.toLowerCase()}.png`} 
                        alt={tx.user} 
                        className="w-4 h-4 mr-1.5" 
                      />
                      {tx.user}
                    </span>
                  ) : (
                    <span className="text-gray-500">Unknown</span>
                  )}
                </td>
                <td className="py-4 px-6 text-sm text-white">{tx.blobCount}</td>
                <td className="py-4 px-6 text-sm text-white whitespace-nowrap">{tx.estimatedCost}</td>
                <td className="py-4 px-6 text-sm text-white">{tx.timeInMempool}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}