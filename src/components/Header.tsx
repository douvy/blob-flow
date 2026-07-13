"use client";

import React, { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Blocks, Clock3, Globe, Home, Hourglass, Menu, RadioTower, Search, TrendingUp, type LucideIcon } from 'lucide-react';
import SearchModal from './SearchModal';
import useSearchShortcut from '../hooks/useSearchShortcut';
import useScrollLock from '../hooks/useScrollLock';
import { useNetwork } from '../hooks/useNetwork';
import { DEFAULT_NETWORK } from '../constants';
import { useTimeRange, type TimeRange } from '../contexts/TimeRangeContext';
import { useBlobWebSocket } from '../contexts/LiveDataContext';
import { BlobWebSocketConnectionState, type Network } from '../types';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  // Route prefixes that mark this link active, so detail pages
  // (e.g. /block/123) highlight their parent section.
  activePrefixes: string[];
}

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Home', icon: Home, activePrefixes: [] },
  { href: '/blocks', label: 'Blocks', icon: Blocks, activePrefixes: ['/blocks', '/block'] },
  { href: '/mempool', label: 'Mempool', icon: Hourglass, activePrefixes: ['/mempool'] },
];

const LIVE_STATUS_STYLES: Record<BlobWebSocketConnectionState, { label: string; color: string }> = {
  connecting: { label: 'Connecting', color: 'bg-yellow-400' },
  connected: { label: 'Connected', color: 'bg-green' },
  stale: { label: 'Stale', color: 'bg-yellow-400' },
  reconnecting: { label: 'Reconnecting', color: 'bg-yellow-400' },
  disconnected: { label: 'Disconnected', color: 'bg-red' },
};

// Selector option label. Renders the network logo only when the backend
// supplies one via GET /networks; otherwise it is just the name (today's look).
function NetworkOptionLabel({ network }: { network: Network }) {
  return (
    <span className="flex items-center gap-2">
      {network.icon ? (
        <Image
          src={network.icon}
          alt=""
          width={16}
          height={16}
          unoptimized
          className="h-4 w-4 shrink-0 rounded-full"
        />
      ) : null}
      {network.name}
    </span>
  );
}

interface LiveStatusIndicatorProps {
  className?: string;
  labelClassName: string;
}

const PULSE_DURATION_MS = 800;

function LiveStatusIndicator({
  className,
  labelClassName,
}: LiveStatusIndicatorProps) {
  const { connectionState, subscribe } = useBlobWebSocket();
  const [pulseKey, setPulseKey] = useState(0);
  const lastPulseRef = useRef(0);

  useEffect(() => {
    return subscribe(() => {
      const now = Date.now();
      if (now - lastPulseRef.current < PULSE_DURATION_MS) return;
      lastPulseRef.current = now;
      setPulseKey((current) => current + 1);
    });
  }, [subscribe]);

  const liveStatus = LIVE_STATUS_STYLES[connectionState];
  const containerClassName = className
    ? `flex items-center space-x-2 ${className}`
    : 'flex items-center space-x-2';
  const shouldPulse = connectionState === 'connected' && pulseKey > 0;

  return (
    <div className={containerClassName}>
      <div className="relative">
        <div className={`h-2.5 w-2.5 rounded-full ${liveStatus.color}`}></div>
        {shouldPulse && (
          <div
            key={pulseKey}
            className={`absolute inset-0 rounded-full ${liveStatus.color} animate-[live-activity-pulse_800ms_ease-out_forwards]`}
          ></div>
        )}
      </div>
      <span className={labelClassName}>{liveStatus.label}</span>
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { selectedNetwork, setSelectedNetwork, networkOptions } = useNetwork();
  const { timeRange: selectedTimeRange, setTimeRange: setSelectedTimeRange } = useTimeRange();
  // Chart detail pages read the time range via useChartData, so they keep the filter too
  const showTimeFilters = pathname === '/' || pathname.startsWith('/charts/');
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lock scrolling when the mobile menu is open
  useScrollLock(isMobileMenuOpen);

  const timeRangeOptions: TimeRange[] = ['1h', '24h', '7d', '30d', 'All'];

  const handleNetworkChange = (network: typeof DEFAULT_NETWORK) => {
    setSelectedNetwork(network);
  };

  const handleNetworkValueChange = (apiParam: string) => {
    const network = networkOptions.find((option) => option.apiParam === apiParam);
    if (network) {
      handleNetworkChange(network);
    }
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
  };

  const isNavLinkActive = (link: NavLink) => {
    if (link.href === '/') {
      return pathname === '/';
    }
    return link.activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  };

  const toggleSearchModal = useCallback(() => {
    setIsSearchModalOpen(prev => !prev);
    setIsMobileMenuOpen(false);
  }, []);

  const closeSearchModal = useCallback(() => {
    setIsSearchModalOpen(false);
  }, []);

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
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Network Selector - hidden on mobile */}
            <Select value={selectedNetwork.apiParam} onValueChange={handleNetworkValueChange}>
              <SelectTrigger className="ml-6 hidden w-36 md:flex" aria-label="Select network">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {networkOptions.map((network) => (
                    <SelectItem
                      key={network.apiParam}
                      value={network.apiParam}
                      textValue={network.name}
                    >
                      <NetworkOptionLabel network={network} />
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Empty flex-grow div to push elements to the right */}
            <div className="flex-grow order-last md:order-none mt-2 md:mt-0"></div>

            <div className="hidden md:flex items-center gap-4">
              {/* Search Button */}
              <button
                onClick={toggleSearchModal}
                className="group select-none text-sm tracking-tight rounded-sm flex gap-2 items-center justify-center text-nowrap border transition-colors duration-75 text-bodyText border-transparent hover:bg-offgray-100/50 dark:hover:bg-offgray-500/10 h-8 px-2.5 hover:bg-[#202327]">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span className="h-5 px-1.5 max-w-max rounded-xs flex items-center gap-0.5 text-[.6875rem] font-bold text-gray-500 dark:text-gray-300 border border-gray-500/20 dark:border-offgray-400/10 dark:bg-cream-900/10 !px-1">&nbsp;/&nbsp;</span>
              </button>

              {/* Connection Status */}
              <LiveStatusIndicator
                className="mr-4 ml-1"
                labelClassName="text-sm text-bodyText"
              />
            </div>

            {/* Network Stats */}
            <div className="hidden lg:block text-xs text-bodyText ml-4 mr-4">
              <div className="flex items-center space-x-1 text-[#b8bdc7]">
                <span>Base Fee:</span>
                <span className="font-medium">0.00042 ETH</span>
              </div>
            </div>

            {/* Time Period Selector - only on routes that use the time range */}
            {showTimeFilters && (
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
            )}

          </div>
        </div>

        {/* Page Navigation - hidden on mobile, links live in the tray there */}
        <nav className="hidden md:block border-t border-divider" aria-label="Primary">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active = isNavLinkActive(link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={pathname === link.href ? 'page' : undefined}
                    className={`px-3 py-1.5 text-sm border-b-2 transition-colors duration-75 ${active
                      ? 'border-blue text-titleText'
                      : 'border-transparent text-[#b8bdc7] hover:text-titleText'
                      }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
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
            {/* Cap the height so short viewports (e.g. landscape phones) can scroll the menu */}
            <div className="p-5 space-y-5 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
              {/* Page Navigation */}
              <nav className="space-y-4" aria-label="Primary">
                {NAV_LINKS.map((link) => {
                  const active = isNavLinkActive(link);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={pathname === link.href ? 'page' : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3"
                    >
                      <Icon className="h-4 w-4 text-blue" aria-hidden="true" />
                      <span className={active ? 'font-medium text-titleText' : 'text-bodyText'}>
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-divider" aria-hidden="true"></div>

              {/* Network Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-blue" aria-hidden="true" />
                  <span className="text-bodyText">Network</span>
                </div>
                <Select value={selectedNetwork.apiParam} onValueChange={handleNetworkValueChange}>
                  <SelectTrigger className="w-36" aria-label="Select network">
                    <SelectValue placeholder="Network" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectGroup>
                      {networkOptions.map((network) => (
                        <SelectItem key={network.apiParam} value={network.apiParam}>
                          {network.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button */}
              <button
                type="button"
                className="flex w-full items-center justify-between"
                onClick={toggleSearchModal}
              >
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-blue" aria-hidden="true" />
                  <span className="text-bodyText">Search</span>
                </div>
                <div className="h-5 px-1.5 max-w-max rounded-sm flex items-center gap-0.5 text-[.6875rem] font-bold text-gray-500 border border-gray-500/20 bg-gray-50/5">
                  /
                </div>
              </button>

              {/* Connection Status */}
              <div className="flex items-center gap-3">
                <RadioTower className="h-4 w-4 text-blue" aria-hidden="true" />
                <LiveStatusIndicator
                  labelClassName="text-base text-bodyText"
                />
              </div>

              {/* Base Fee */}
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-blue" aria-hidden="true" />
                <div className="flex items-center space-x-1">
                  <span className="text-base text-bodyText">Base Fee:</span>
                  <span className="font-medium text-base text-titleText">0.00042 ETH</span>
                </div>
              </div>

              {/* Time Period Selector - only on routes that use the time range */}
              {showTimeFilters && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Clock3 className="h-4 w-4 text-blue" aria-hidden="true" />
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
              )}

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
        onClose={closeSearchModal}
      />
    </>
  );
}
