"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    // Force toggle the mobile menu state
    setIsMobileMenuOpen(prev => !prev);
    
    // Close the network dropdown if it's open
    if (isNetworkDropdownOpen) {
      setIsNetworkDropdownOpen(false);
    }
  };

  // Close mobile menu when clicking outside
  // Remove the existing click outside handler as it may be interfering

  // Handle keyboard navigation for mobile menu
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        event.preventDefault(); // Prevent default browser behavior
        setIsMobileMenuOpen(false);
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  // Use the shortcut hook to open search modal with / key
  useSearchShortcut(toggleSearchModal);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#15171a] border-b border-divider">
        <div className="container mx-auto px-4 py-2">
          <div className="relative flex items-center w-full">
            {/* Logo and Brand Name */}
            <div className="flex items-center">
              <Link href="/" className="inline-flex">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-2">
                    <Image
                      src="/images/logo.png"
                      alt="BlobFlow Logo"
                      width={36}
                      height={36}
                      className="h-8 w-8"
                    />
                  </div>
                  <span className="hidden sm:inline-block text-xl font-windsor-bold text-titleText ml-2 leading-none translate-y-[1px] pt-[3px]">BlobFlow</span>
                </div>
              </Link>
            </div>

            {/* Mobile Menu Toggle - Only visible below md breakpoint */}
            <button
              type="button"
              className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 border border-divider rounded-md text-blue focus:outline-none"
              aria-label="Toggle mobile menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <i className="fa-regular fa-bars" aria-hidden="true"></i>
            </button>

            {/* Network Selector - hidden on mobile */}
            <div className="relative hidden md:block">
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

            <div className="hidden md:flex items-center gap-4">
              {/* Search Button */}
              <button
                onClick={toggleSearchModal}
                className="group select-none text-sm tracking-tight rounded-sm flex gap-2 items-center justify-center text-nowrap border transition-colors duration-75 text-bodyText border-transparent hover:bg-offgray-100/50 dark:hover:bg-offgray-500/10 h-8 px-2.5 hover:bg-[#202327]">
                <i className="fa-regular fa-magnifying-glass" aria-hidden="true"></i>
                <span className="h-5 px-1.5 max-w-max rounded-xs flex items-center gap-0.5 text-[.6875rem] font-bold text-gray-500 dark:text-gray-300 border border-gray-500/20 dark:border-offgray-400/10 dark:bg-cream-900/10 !px-1">&nbsp;/&nbsp;</span>
              </button>

              {/* Connection Status */}
              <div className="flex items-center space-x-2 mr-4 ml-1">
                <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-bodyText">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>

            {/* Network Stats */}
            <div className="hidden lg:block text-xs text-bodyText ml-4 mr-4">
              <div className="flex items-center space-x-1">
                <span>Base Fee:</span>
                <span className="font-medium text-titleText">0.00042 ETH</span>
              </div>
            </div>

            {/* Time Period Selector */}
            <div className="hidden md:flex items-center space-x-1 bg-background/30 rounded-md p-0.5 ml-4">
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

      {/* Mobile Menu Tray */}
      {isMounted && (
        <div 
          className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 md:hidden ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMobileMenuOpen(false);
            }
          }}
        >
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-[#1c1e23] rounded-t-xl transition-transform duration-300 ease-in-out transform ${
              isMobileMenuOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="p-5 space-y-5">
              {/* Network Selector */}
              <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                  <i className="fa-regular fa-globe text-blue" aria-hidden="true"></i>
                  <span className="text-bodyText">Network</span>
                </div>
                <button
                  type="button"
                  className="flex items-center space-x-1 bg-background/50 hover:bg-background/80 px-3 py-2 rounded-md text-sm font-medium text-bodyText transition-colors"
                  onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                >
                  <span>{selectedNetwork}</span>
                  <i className={`fa-regular fa-chevron-${isNetworkDropdownOpen ? 'up' : 'right'} text-xs ml-1`} aria-hidden="true"></i>
                </button>
                
                {isNetworkDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-container border border-background/50 rounded-md shadow-lg z-10">
                    <ul className="py-1">
                      {networkOptions.map((network) => (
                        <li key={network}>
                          <button
                            className={`block w-full text-left px-4 py-2 text-sm ${
                              selectedNetwork === network
                                ? 'bg-background/50 text-titleText'
                                : 'text-bodyText hover:bg-background/30'
                            }`}
                            onClick={() => {
                              handleNetworkChange(network);
                              setIsNetworkDropdownOpen(false);
                            }}
                          >
                            {network}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Search Button */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={toggleSearchModal}
              >
                <div className="flex items-center gap-3">
                  <i className="fa-regular fa-magnifying-glass text-blue" aria-hidden="true"></i>
                  <span className="text-bodyText">Search</span>
                </div>
                <div className="h-5 px-1.5 max-w-max rounded-sm flex items-center gap-0.5 text-[.6875rem] font-bold text-gray-500 border border-gray-500/20 bg-gray-50/5">
                  /
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center gap-3">
                <i className="fa-regular fa-signal-stream text-blue" aria-hidden="true"></i>
                <div className="flex items-center space-x-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-bodyText">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              
              {/* Base Fee */}
              <div className="flex items-center gap-3">
                <i className="fa-regular fa-arrow-trend-up text-blue" aria-hidden="true"></i>
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-bodyText">Base Fee:</span>
                  <span className="font-medium text-titleText">0.00042 ETH</span>
                </div>
              </div>
              
              {/* Time Period Selector */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <i className="fa-regular fa-clock text-blue" aria-hidden="true"></i>
                  <span className="text-bodyText">Time Period</span>
                </div>
                <div className="flex items-center space-x-1 bg-background/30 rounded-md p-0.5">
                  {timeRangeOptions.map((range) => (
                    <button
                      key={range}
                      onClick={() => handleTimeRangeChange(range)}
                      className={`px-3 py-1 text-sm rounded-md transition-none flex-1 ${
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
              
              {/* Close Button */}
              <div className="pt-2 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center text-white py-2"
                >
                  Close Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}