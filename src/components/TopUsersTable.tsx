"use client";

import React, { useState, useEffect } from 'react';

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
  useEffect(() => {
    // Function to set up event listeners for tooltips
    const setupTooltips = () => {
      const tooltipElements = document.querySelectorAll('[data-tooltip]');
      
      const handleMouseEnter = (e: MouseEvent) => {
        const target = e.currentTarget as HTMLElement;
        const tooltipText = target.getAttribute('data-tooltip');
        
        // Get or create tooltip
        let tooltip = document.getElementById('custom-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.id = 'custom-tooltip';
          
          // Create a small arrow element for the tooltip
          const arrow = document.createElement('div');
          tooltip.appendChild(arrow);
          
          // Style the tooltip - VERY high z-index, fixed position
          Object.assign(tooltip.style, {
            position: 'fixed',
            backgroundColor: '#14161a',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.5)',
            border: '1px solid #333',
            zIndex: '99999999', // Super high z-index
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            opacity: '1',
            transition: 'opacity 0.1s ease',
            fontFamily: 'inherit'
          });
          
          // Style the arrow
          Object.assign(arrow.style, {
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            marginLeft: '-4px',
            width: '0',
            height: '0',
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid #14161a'
          });
          
          // Create a text container to hold the text
          const textContainer = document.createElement('div');
          textContainer.textContent = tooltipText;
          tooltip.insertBefore(textContainer, arrow);
          
          // Add to body
          document.body.appendChild(tooltip);
        } else {
          // Update text if tooltip already exists
          if (tooltip.firstChild) {
            (tooltip.firstChild as HTMLElement).textContent = tooltipText;
          }
        }
        
        // Position above the target element
        const rect = target.getBoundingClientRect();
        tooltip.style.left = (rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
      };
      
      const handleMouseLeave = () => {
        const tooltip = document.getElementById('custom-tooltip');
        if (tooltip) {
          document.body.removeChild(tooltip);
        }
      };
      
      // Add event listeners
      tooltipElements.forEach(el => {
        el.addEventListener('mouseenter', handleMouseEnter as any);
        el.addEventListener('mouseleave', handleMouseLeave);
      });
      
      return () => {
        // Cleanup
        tooltipElements.forEach(el => {
          el.removeEventListener('mouseenter', handleMouseEnter as any);
          el.removeEventListener('mouseleave', handleMouseLeave);
        });
        
        const tooltip = document.getElementById('custom-tooltip');
        if (tooltip) {
          document.body.removeChild(tooltip);
        }
      };
    };
    
    // Setup tooltips
    const cleanup = setupTooltips();
    
    return cleanup;
  }, []);

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
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Top Blob Users</h2>
      <div className="overflow-x-auto border border-divider rounded-lg">
        <table className="min-w-full overflow-hidden table-fixed">
          <thead>
            <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/4">User</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6 whitespace-nowrap">
                <div className="flex items-center">
                  <span>Count</span>
                  <div className="inline-flex ml-1" data-tooltip="Last 100 blocks">
                    <i className="fa-regular fa-circle-info text-[#6e7787]" aria-hidden="true"></i>
                  </div>
                </div>
              </th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/3">% of Total</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/4">Recent ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {users.map((user) => (
              <tr 
                key={user.id} 
                className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors cursor-pointer"
                onClick={() => onUserClick(user.id)}
              >
                <td className="py-3 px-6 text-sm font-medium text-white">
                  <div className="flex items-center">
                    {user.name === 'Unknown' ? (
                      <span className="inline-block w-5 h-5 rounded-full mr-3 bg-gray-500"></span>
                    ) : (
                      <img 
                        src={`/images/${user.name.toLowerCase()}.png`} 
                        alt={user.name} 
                        className="inline-block w-5 h-5 mr-3" 
                      />
                    )}
                    {user.name}
                  </div>
                </td>
                <td className="py-3 px-6 text-sm text-white">{user.dataCount}</td>
                <td className="py-3 px-6 text-sm text-white">
                  <div className="flex items-center">
                    <span className="mr-3">{user.percentage}%</span>
                    <div className="w-32 bg-[#2a2f37] rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          user.name === 'Arbitrum' ? 'bg-[#12aaff]' :
                          user.name === 'Optimism' ? 'bg-[#ff0420]' :
                          user.name === 'Base' ? 'bg-[#1652f0]' :
                          user.name === 'zkSync' ? 'bg-[#f2f2f2]' :
                          'bg-gray-500'
                        }`} 
                        style={{ width: `${user.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-6 text-sm text-white font-mono">
                  <div className="flex flex-row gap-2 items-center">
                    <span className="text-sm text-white truncate">{user.dataIds[0]}</span>
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