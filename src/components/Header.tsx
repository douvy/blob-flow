"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SearchModal from './SearchModal';
import useSearchShortcut from '../hooks/useSearchShortcut';

type NetworkOption = 'Mainnet' | 'Sepolia' | 'Goerli';
type TimeRange = '24h' | '7d' | '30d' | 'All';

export default function Header() {
  const [isMounted, setIsMounted] = useState(false);
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption>('Mainnet');
  const [isConnected, setIsConnected] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
  };

  const toggleSearchModal = useCallback(() => {
    setIsSearchModalOpen(prev => !prev);
  }, []);

  // Use the shortcut hook to open search modal with / key
  useSearchShortcut(toggleSearchModal);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#15171a] border-b border-divider">
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
                className="flex items-center space-x-1 bg-background/50 hover:bg-background/80 px-3 py-2 rounded-md text-sm font-medium text-bodyText transition-colors ml-2"
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

            {/* Empty flex-grow div to push elements to the right */}
            <div className="flex-grow order-last md:order-none mt-2 md:mt-0"></div>

            <div className="flex items-center gap-4">
              {/* Search Button */}
              <button
                onClick={toggleSearchModal}
                className="group select-none text-sm tracking-tight rounded-sm flex gap-2 items-center justify-center text-nowrap border transition-colors duration-75 text-bodyText border-transparent hover:bg-offgray-100/50 dark:hover:bg-offgray-500/10 h-8 px-2.5 hover:bg-[#202327]">
                <i className="fa-regular fa-magnifying-glass" aria-hidden="true"></i>
                <span className="h-5 px-1.5 max-w-max rounded-xs flex items-center gap-0.5 text-[.6875rem] font-bold text-gray-500 dark:text-gray-300 border border-gray-500/20 dark:border-offgray-400/10 dark:bg-cream-900/10 !px-1">&nbsp;/&nbsp;</span>
              </button>

              {/* Connection Status */}
              <div className="hidden md:flex items-center space-x-2">
                <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-bodyText">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
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
                  className={`px-3 py-1 text-sm rounded-md transition-none ${
                    selectedTimeRange === range
                      ? 'bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2'
                      : 'text-white hover:text-white/90 border border-transparent'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

          </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}