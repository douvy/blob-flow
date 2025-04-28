"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type NetworkOption = 'Mainnet' | 'Sepolia' | 'Goerli';
type TimeRange = '24h' | '7d' | '30d' | 'All';

export default function Header() {
  const [isMounted, setIsMounted] = useState(false);
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption>('Mainnet');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');

  // Ensure hydration matching by only showing client-side elements after mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const networkOptions: NetworkOption[] = ['Mainnet', 'Sepolia', 'Goerli'];
  const timeRangeOptions: TimeRange[] = ['24h', '7d', '30d', 'All'];

  const handleNetworkChange = (network: NetworkOption) => {
    setSelectedNetwork(network);
    setIsNetworkDropdownOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // Implement actual search functionality here
    }
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#15171a] border-b border-divider shadow-md">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo and Brand Name */}
          <div className="flex items-center">
            <Link href="/" className="inline-flex">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Image
                    src="/images/logo.png"
                    alt="BlobFlow Logo"
                    width={36}
                    height={36}
                    className="h-9 w-9"
                  />
                </div>
                <span className="hidden sm:inline-block text-xl font-windsor-bold text-titleText ml-2 leading-none translate-y-[1px] pt-[3px]">BlobFlow</span>
              </div>
            </Link>
          </div>

          {/* Network Selector */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center space-x-1 bg-background/50 hover:bg-background/80 px-3 py-2 rounded-md text-sm font-medium text-bodyText transition-colors"
              onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
            >
              <span>{selectedNetwork}</span>
              {isMounted ? (
                <i className={`fa-regular fa-chevron-${isNetworkDropdownOpen ? 'up' : 'down'} text-xs`} aria-hidden="true"></i>
              ) : (
                <i className="fa-regular fa-chevron-down text-xs" aria-hidden="true"></i>
              )}
            </button>
            
            {isMounted && isNetworkDropdownOpen && (
              <div className="absolute mt-1 w-40 bg-container border border-background/50 rounded-md shadow-lg z-10">
                <ul className="py-1">
                  {networkOptions.map((network) => (
                    <li key={network}>
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          selectedNetwork === network
                            ? 'bg-background/50 text-titleText'
                            : 'text-bodyText hover:bg-background/30'
                        }`}
                        onClick={() => handleNetworkChange(network)}
                      >
                        {network}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex-grow max-w-xl order-last md:order-none mt-2 md:mt-0 w-full md:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search blocks, txs, blobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background/50 border border-background/80 rounded-md py-2 pl-4 pr-10 text-sm placeholder-bodyText focus:outline-none focus:ring-1 focus:ring-bodyText/30"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-bodyText"
              >
                <i className="fa-regular fa-magnifying-glass" aria-hidden="true"></i>
              </button>
            </form>
          </div>

          {/* Connection Status */}
          <div className="hidden md:flex items-center space-x-2">
            <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-bodyText">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {/* Network Stats */}
          <div className="hidden lg:block text-xs text-bodyText">
            <div className="flex items-center space-x-1">
              <span>Base Fee:</span>
              <span className="font-medium text-titleText">0.00042 ETH</span>
            </div>
          </div>

          {/* Time Period Selector */}
          <div className="hidden md:flex items-center space-x-1 bg-background/30 rounded-md p-0.5">
            {timeRangeOptions.map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-background text-titleText'
                    : 'text-bodyText hover:bg-background/50'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

        </div>
      </div>
    </header>
  );
}