"use client";

import React, { useEffect } from 'react';
import { usePaginatedApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { TopUsersResponse, User } from '../types';
import DataStateWrapper from './DataStateWrapper';

interface TopUsersTableProps {
  onUserClick: (userId: number) => void;
}

export default function TopUsersTable({ onUserClick }: TopUsersTableProps) {
  // Fetch top users data with pagination
  const {
    data,
    isLoading,
    error,
  } = usePaginatedApiData<TopUsersResponse>(
    (page, limit) => api.getTopUsers(page, limit),
    []
  );

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

  // Loading state for the table
  const loadingComponent = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/3">User</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/3 whitespace-nowrap">
              <div className="flex items-center">
                <span>Count</span>
                <div className="inline-flex ml-1" data-tooltip="Last 100 blocks">
                  <i className="fa-regular fa-circle-info text-[#6e7787]" aria-hidden="true"></i>
                </div>
              </div>
            </th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/3">% of Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
              <td className="py-3 px-6">
                <div className="flex items-center">
                  <div className="inline-block w-5 h-5 rounded-full bg-[#202538] animate-pulse mr-3"></div>
                  <div className="h-5 bg-[#202538] rounded w-24 animate-pulse"></div>
                </div>
              </td>
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-12 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="flex items-center">
                  <div className="h-5 bg-[#202538] rounded w-12 animate-pulse mr-3"></div>
                  <div className="w-32 bg-[#2a2f37] rounded-full h-2.5">
                    <div className="h-2.5 bg-[#202538] rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Helper function to determine user's color for the progress bar
  const getUserColor = (userName: string): string => {
    switch (userName.toLowerCase()) {
      case 'arbitrum':
        return 'bg-[#12aaff]';
      case 'optimism':
        return 'bg-[#ff0420]';
      case 'base':
        return 'bg-[#1652f0]';
      case 'zksync':
        return 'bg-[#f2f2f2]';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Top Blob Users</h2>

      <DataStateWrapper
        isLoading={isLoading}
        error={error}
        loadingComponent={loadingComponent}
      >
        {data && (
          <div className="overflow-x-auto border border-divider rounded-lg">
            <table className="min-w-full overflow-hidden table-fixed">
              <thead>
                <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/3">User</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/3 whitespace-nowrap">
                    <div className="flex items-center">
                      <span>Count</span>
                      <div className="inline-flex ml-1" data-tooltip="Last 100 blocks">
                        <i className="fa-regular fa-circle-info text-[#6e7787]" aria-hidden="true"></i>
                      </div>
                    </div>
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/3">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {data.data.map((user: User) => (
                  <tr
                    key={user.id}
                    className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors cursor-pointer"
                    onClick={() => onUserClick(user.id)}
                  >
                    <td className="py-3 px-6 text-sm font-medium text-white whitespace-nowrap">
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
                    <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{user.dataCount}</td>
                    <td className="py-3 px-6 text-sm text-white whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-3">{user.percentage}%</span>
                        <div className="w-32 bg-[#2a2f37] rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${getUserColor(user.name)}`}
                            style={{ width: `${user.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataStateWrapper>
    </section>
  );
}
