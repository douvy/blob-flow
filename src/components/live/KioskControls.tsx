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
  parseKioskFocus,
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
 * The only interactive controls in TV mode: a rollup focus picker, a sender
 * address box, and a network switcher. The cluster fades out after KIOSK_CONTROL_IDLE_MS of no
 * pointer or keyboard activity so an unattended screen shows nothing but
 * data, and fades back in the moment someone touches the machine.
 *
 * While hidden it is also inert (`pointer-events-none`, `aria-hidden`), so a
 * stray click on a wall-mounted touchscreen cannot change anything.
 *
 * The focus lives in the URL (?focus=Base or ?focus=0xabc…) rather than
 * component state so a kiosk can be pointed at a single rollup or sender
 * permanently and the view survives reloads. The address box covers posters
 * the attribution registry does not name, which the picker cannot offer.
 */
export default function KioskControls() {
  const { selectedNetwork, setSelectedNetwork, networkOptions } = useNetwork();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focus = parseKioskFocus(searchParams.get(KIOSK_FOCUS_PARAM));
  // Only a rollup name can be the picker's value; an address focus leaves it
  // on "All rollups" while the address box shows what is being watched.
  const focusName = focus?.kind === 'rollup' ? focus.value : null;

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
    if (focusName && !names.includes(focusName)) {
      names.unshift(focusName);
    }
    return names;
  }, [topUsers, focusName]);

  const [isRevealed, setIsRevealed] = useState(false);
  const [openMenus, setOpenMenus] = useState(0);
  const [addressDraft, setAddressDraft] = useState('');
  const [addressError, setAddressError] = useState(false);
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

  const setFocusParam = useCallback(
    (value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(KIOSK_FOCUS_PARAM);
      } else {
        params.set(KIOSK_FOCUS_PARAM, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleFocusChange = (value: string) => {
    setFocusParam(value === FOCUS_ALL ? null : value);
    setAddressDraft('');
  };

  const handleAddressSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const entered = addressDraft.trim();
    // An empty box clears the focus; anything else must be a real address, so
    // a typo shows an error here instead of an unexplained empty wall.
    if (!entered) {
      setFocusParam(null);
      setAddressError(false);
      return;
    }
    const parsed = parseKioskFocus(entered);
    if (parsed?.kind !== 'address') {
      setAddressError(true);
      return;
    }
    setAddressError(false);
    setFocusParam(parsed.value);
    setAddressDraft('');
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
        value={focusName ?? FOCUS_ALL}
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

      {/* Sender address, for posters the registry does not name. Submitting
          an empty box clears the focus, which is how an address is undone
          without reaching for the picker. */}
      <form onSubmit={handleAddressSubmit}>
        <input
          type="text"
          inputMode="text"
          spellCheck={false}
          autoComplete="off"
          value={addressDraft}
          onChange={(event) => {
            setAddressDraft(event.target.value);
            setAddressError(false);
          }}
          placeholder={focus?.kind === 'address' ? focus.label : 'Watch 0x address'}
          aria-label="Watch a sender address"
          aria-invalid={addressError || undefined}
          title={focus?.kind === 'address' ? `Watching ${focus.value}` : undefined}
          tabIndex={isVisible ? 0 : -1}
          className={`h-9 w-44 rounded-md border bg-[#1d1f23] px-3 font-mono text-xs text-white placeholder:text-[#6e7687] focus:outline-none focus:ring-2 focus:ring-blue/60 ${
            addressError ? 'border-red' : 'border-divider'
          }`}
        />
      </form>

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
