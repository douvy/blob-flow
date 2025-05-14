"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SearchModal from './SearchModal';
import useSearchShortcut from '../hooks/useSearchShortcut';
import useScrollLock from '../hooks/useScrollLock';
import useDragToClose from '../hooks/useDragToClose';
import { useNetwork } from '../hooks/useNetwork';
import { NETWORKS, DEFAULT_NETWORK } from '../constants';

type TimeRange = '24h' | '7d' | '30d' | 'All';

export default function Header() {
  const { selectedNetwork, setSelectedNetwork, networkOptions } = useNetwork();
  const [isMounted, setIsMounted] = useState(false);
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Lock scrolling when the mobile menu is open
  useScrollLock(isMobileMenuOpen);

  // Ensure hydration matching by only showing client-side elements after mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const timeRangeOptions: TimeRange[] = ['24h', '7d', '30d', 'All'];

  const handleNetworkChange = (network: typeof DEFAULT_NETWORK) => {
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

  // Removed complex drag to close in favor of direct implementation

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
                className="flex items-center space-x-1 px-3 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2 ml-6"
                onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
              >
                <span>{selectedNetwork.name}</span>
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
                      <li key={network.name}>
                        <button
                          className={`block w-full text-left px-4 py-2 text-sm ${selectedNetwork.name === network.name
                            ? 'bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2'
                            : 'text-bodyText hover:bg-[#23252a]'
                            }`}
                          onClick={() => handleNetworkChange(network)}
                        >
                          {network.name}
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
                <div className="relative">
                  <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green' : 'bg-red'}`}></div>
                  <div className={`absolute inset-0 rounded-full ${isConnected ? 'bg-green' : 'bg-red'} opacity-75 animate-ping`}></div>
                </div>
                <span className="text-sm text-bodyText">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>

            {/* Network Stats */}
            <div className="hidden lg:block text-xs text-bodyText ml-4 mr-4">
              <div className="flex items-center space-x-1 text-[#b8bdc7]">
                <span>Base Fee:</span>
                <span className="font-medium">0.00042 ETH</span>
              </div>
            </div>

            {/* Time Period Selector */}
            <div className="hidden md:flex items-center space-x-1 bg-background/30 rounded-md p-0.5 ml-4">
              {timeRangeOptions.map((range) => (
                <button
                  key={range}
                  onClick={() => handleTimeRangeChange(range)}
                  className={`px-3 py-1 text-sm rounded-md transition-none ${selectedTimeRange === range
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
          className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMobileMenuOpen(false);
            }
          }}
        >
          <div
            id="mobile-menu-tray"
            className={`select-none absolute bottom-0 left-0 right-0 bg-[#1c1e23] rounded-t-xl transition-transform duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-y-0' : 'translate-y-full'
              }`}
            onMouseDown={(e) => {
              // Prevent text selection
              e.preventDefault();

              const tray = e.currentTarget;
              const startY = e.clientY;
              let dragging = true;

              // Prevent text selection during drag
              document.body.style.userSelect = 'none';

              function onMouseMove(moveE: MouseEvent) {
                if (!dragging) return;
                moveE.preventDefault();
                const deltaY = moveE.clientY - startY;
                if (deltaY > 0) {
                  tray.style.transform = `translateY(${deltaY}px)`;
                }
              }

              function onMouseUp(upE: MouseEvent) {
                dragging = false;
                document.body.style.userSelect = '';

                const deltaY = upE.clientY - startY;
                if (deltaY > 50) {
                  // Reset transform immediately to avoid flicker when reopening
                  requestAnimationFrame(() => {
                    tray.style.transform = '';
                    setIsMobileMenuOpen(false);
                  });
                } else {
                  tray.style.transform = '';
                }

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              }

              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
            onTouchStart={(e) => {
              const tray = e.currentTarget;
              const startY = e.touches[0].clientY;

              function onTouchMove(moveE: TouchEvent) {
                const touchY = moveE.touches[0].clientY;
                const deltaY = touchY - startY;
                if (deltaY > 0) {
                  tray.style.transform = `translateY(${deltaY}px)`;
                }
              }

              function onTouchEnd(endE: TouchEvent) {
                let deltaY = 0;
                if (endE.changedTouches && endE.changedTouches.length > 0) {
                  deltaY = endE.changedTouches[0].clientY - startY;
                }

                if (deltaY > 50) {
                  // Reset transform immediately to avoid flicker when reopening
                  requestAnimationFrame(() => {
                    tray.style.transform = '';
                    setIsMobileMenuOpen(false);
                  });
                } else {
                  tray.style.transform = '';
                }

                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
              }

              document.addEventListener('touchmove', onTouchMove, { passive: false });
              document.addEventListener('touchend', onTouchEnd);
            }}
          >
            <div className="w-full flex items-center justify-center pt-3 pb-1">
              <div className="w-16 h-1 bg-gray-300/20 rounded-full"></div>
            </div>
            <div className="p-5 space-y-5">
              {/* Network Selector */}
              <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                  <i className="fa-regular fa-globe text-blue" aria-hidden="true"></i>
                  <span className="text-bodyText">Network</span>
                </div>
                <button
                  type="button"
                  className="flex items-center space-x-1 px-3 py-1 text-sm rounded-md transition-none bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2"
                  onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                >
                  <span>{selectedNetwork.name}</span>
                  <i className={`fa-regular fa-chevron-${isNetworkDropdownOpen ? 'up' : 'down'} text-xs ml-1`} aria-hidden="true"></i>
                </button>

                {isNetworkDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a1c22] border border-divider rounded-md shadow-lg z-10">
                    <ul className="py-1">
                      {networkOptions.map((network) => (
                        <li key={network.name}>
                          <button
                            className={`block w-full text-left px-4 py-2 text-sm ${selectedNetwork.name === network.name
                              ? 'bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2'
                              : 'text-bodyText hover:bg-[#23252a]'
                              }`}
                            onClick={() => {
                              handleNetworkChange(network);
                              setIsNetworkDropdownOpen(false);
                            }}
                          >
                            {network.name}
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
                  <div className="relative">
                    <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green' : 'bg-red'}`}></div>
                    <div className={`absolute inset-0 rounded-full ${isConnected ? 'bg-green' : 'bg-red'} opacity-75 animate-ping`}></div>
                  </div>
                  <span className="text-base text-bodyText">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>

              {/* Base Fee */}
              <div className="flex items-center gap-3">
                <i className="fa-regular fa-arrow-trend-up text-blue" aria-hidden="true"></i>
                <div className="flex items-center space-x-1">
                  <span className="text-base text-bodyText">Base Fee:</span>
                  <span className="font-medium text-base text-titleText">0.00042 ETH</span>
                </div>
              </div>

              {/* Time Period Selector */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <i className="fa-regular fa-timer text-blue" aria-hidden="true"></i>
                  <span className="text-bodyText">Time Period</span>
                </div>
                <div className="flex items-center space-x-1 bg-background/30 border border-divider rounded-md p-0.5">
                  {timeRangeOptions.map((range) => (
                    <button
                      key={range}
                      onClick={() => handleTimeRangeChange(range)}
                      className={`px-3 py-1 text-sm rounded-md transition-none flex-1 ${selectedTimeRange === range
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
