"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AttributionBadge from '@/components/AttributionBadge';
import { useNetwork } from '@/hooks/useNetwork';
import { useTopUsers } from '@/hooks/useTopUsers';
import {
  KIOSK_CONTROL_IDLE_MS,
  KIOSK_FOCUS_OPTIONS,
  KIOSK_FOCUS_PARAM,
} from '@/lib/liveKiosk';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Network } from '@/types';

/** Sentinel for "no focus": Radix Select items cannot carry an empty value. */
const FOCUS_ALL = '__all__';

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

/**
 * The only interactive controls in TV mode: a rollup focus picker and a
 * network switcher. The cluster fades out after KIOSK_CONTROL_IDLE_MS of no
 * pointer or keyboard activity so an unattended screen shows nothing but
 * data, and fades back in the moment someone touches the machine.
 *
 * While hidden it is also inert (`pointer-events-none`, `aria-hidden`), so a
 * stray click on a wall-mounted touchscreen cannot change anything.
 *
 * The focus lives in the URL (?focus=Base) rather than component state so a
 * kiosk can be pointed at a single rollup permanently and the view survives
 * reloads.
 */
export default function KioskControls() {
  const { selectedNetwork, setSelectedNetwork, networkOptions } = useNetwork();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focus = searchParams.get(KIOSK_FOCUS_PARAM)?.trim() || null;

  // 24h window so a rollup that has been quiet for an hour stays pickable.
  const { data: topUsers } = useTopUsers(
    KIOSK_FOCUS_OPTIONS,
    selectedNetwork.apiParam,
    '24h'
  );
  const focusOptions = useMemo(() => {
    const names = (topUsers?.data ?? [])
      .filter((user) => user.attributed)
      .map((user) => user.name);
    // A focus arriving via URL stays selectable even when it is not in the
    // top list, so the picker never silently misrepresents the view.
    if (focus && !names.includes(focus)) {
      names.unshift(focus);
    }
    return names;
  }, [topUsers, focus]);

  const [isRevealed, setIsRevealed] = useState(false);
  const [openMenus, setOpenMenus] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read by the hide timer, which must not fire while a menu is open.
  const openMenusRef = useRef(0);

  const reveal = useCallback(() => {
    setIsRevealed(true);
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      // An open dropdown must not vanish under the cursor mid-selection. The
      // countdown restarts when it closes.
      if (openMenusRef.current > 0) return;
      setIsRevealed(false);
    }, KIOSK_CONTROL_IDLE_MS);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', reveal);
    window.addEventListener('pointerdown', reveal);
    window.addEventListener('keydown', reveal);

    return () => {
      window.removeEventListener('pointermove', reveal);
      window.removeEventListener('pointerdown', reveal);
      window.removeEventListener('keydown', reveal);
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [reveal]);

  const handleOpenChange = (open: boolean) => {
    setOpenMenus((current) => {
      const next = Math.max(0, current + (open ? 1 : -1));
      openMenusRef.current = next;
      return next;
    });
    reveal();
  };

  const handleNetworkChange = (apiParam: string) => {
    const network = networkOptions.find((option) => option.apiParam === apiParam);
    if (network) {
      setSelectedNetwork(network);
    }
  };

  const handleFocusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === FOCUS_ALL) {
      params.delete(KIOSK_FOCUS_PARAM);
    } else {
      params.set(KIOSK_FOCUS_PARAM, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const isVisible = isRevealed || openMenus > 0;

  return (
    <div
      className={`flex items-center gap-2 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={isVisible ? undefined : true}
    >
      <Select
        value={focus ?? FOCUS_ALL}
        onValueChange={handleFocusChange}
        onOpenChange={handleOpenChange}
      >
        <SelectTrigger className="w-48" aria-label="Focus on a rollup" tabIndex={isVisible ? 0 : -1}>
          <SelectValue placeholder="All rollups" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectItem value={FOCUS_ALL} textValue="All rollups">
              All rollups
            </SelectItem>
            {focusOptions.map((name) => (
              <SelectItem key={name} value={name} textValue={name}>
                {/* min-w-0 + truncate so long names (e.g. Robinhood Chain)
                    clip inside the fixed-width trigger instead of spilling. */}
                <span className="flex min-w-0 items-center gap-2">
                  <AttributionBadge user={name} sizeClass="h-4 w-4" px={16} />
                  <span className="truncate">{name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        value={selectedNetwork.apiParam}
        onValueChange={handleNetworkChange}
        onOpenChange={handleOpenChange}
      >
        <SelectTrigger className="w-40" aria-label="Select network" tabIndex={isVisible ? 0 : -1}>
          <SelectValue placeholder="Network" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            {networkOptions.map((network) => (
              <SelectItem key={network.apiParam} value={network.apiParam} textValue={network.name}>
                <NetworkOptionLabel network={network} />
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
