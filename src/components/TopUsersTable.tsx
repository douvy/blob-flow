"use client";

import React, { useState } from 'react';

interface DataUser {
  id: number;
  name: string;
  dataCount: number;
  percentage: number;
  dataIds: string[];
}

interface TopUsersTableProps {
  onUserClick: (userId: number) => void;
}

export default function TopUsersTable({ onUserClick }: TopUsersTableProps) {
  // Sample data - would be fetched from API in production
  const users: DataUser[] = [
    {
      id: 1,
      name: 'Arbitrum',
      dataCount: 423,
      percentage: 42.3,
      dataIds: ['0xabcd...1234', '0xdef5...6789', '0x9876...fedc']
    },
    {
      id: 2,
      name: 'Optimism',
      dataCount: 287,
      percentage: 28.7,
      dataIds: ['0xbeef...4321', '0xf00d...8765', '0x1337...dead']
    },
    {
      id: 3,
      name: 'Base',
      dataCount: 156,
      percentage: 15.6,
      dataIds: ['0xface...cafb', '0xb0c5...6789', '0xd0d0...abcd']
    },
    {
      id: 4,
      name: 'zkSync',
      dataCount: 98,
      percentage: 9.8,
      dataIds: ['0x1111...2222', '0x3333...4444', '0x5555...6666']
    },
    {
      id: 5,
      name: 'Unknown',
      dataCount: 36,
      percentage: 3.6,
      dataIds: ['0xaaaa...bbbb', '0xcccc...dddd', '0xeeee...ffff']
    }
  ];

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-0">Top Users</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full overflow-hidden">
          <thead>
            <tr className="border-b border-divider">
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider">User</th>
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider">Count (Last 100 blocks)</th>
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider">% of Total</th>
              <th className="py-4 px-6 text-left text-xs font-medium text-secondaryText uppercase tracking-wider">Recent IDs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {users.map((user) => (
              <tr 
                key={user.id} 
                className="bg-[#121317] hover:bg-opacity-80 transition-colors cursor-pointer"
                onClick={() => onUserClick(user.id)}
              >
                <td className="py-4 px-6 text-sm font-medium text-white">
                  <span className={`inline-block w-4 h-4 rounded-full mr-3 ${
                    user.name === 'Arbitrum' ? 'bg-blue-500' :
                    user.name === 'Optimism' ? 'bg-red-500' :
                    user.name === 'Base' ? 'bg-blue-300' :
                    user.name === 'zkSync' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`}></span>
                  {user.name}
                </td>
                <td className="py-4 px-6 text-sm text-white">{user.dataCount}</td>
                <td className="py-4 px-6 text-sm text-white">
                  <div className="flex items-center">
                    <span className="mr-3">{user.percentage}%</span>
                    <div className="w-32 bg-gray-800 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          user.name === 'Arbitrum' ? 'bg-blue-500' :
                          user.name === 'Optimism' ? 'bg-red-500' :
                          user.name === 'Base' ? 'bg-blue-300' :
                          user.name === 'zkSync' ? 'bg-purple-500' :
                          'bg-gray-500'
                        }`} 
                        style={{ width: `${user.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-white font-mono">
                  <div className="flex flex-col gap-2">
                    {user.dataIds.map((dataId, idx) => (
                      <span key={idx} className="text-xs text-secondaryText">{dataId}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}