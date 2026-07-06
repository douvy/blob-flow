"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Box,
  CornerDownLeft,
  Fingerprint,
  Layers3,
  RotateCw,
  Wallet,
  X,
} from 'lucide-react';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { api } from '@/lib/api';
import { isNotFoundError } from '@/lib/api/core';
import { useNetwork } from '@/hooks/useNetwork';
import useSearchMatches from '@/hooks/useSearchMatches';
import { SearchMatchResponse, SearchTarget } from '@/types';
import { parseSearchQuery, truncateAddress } from '@/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchType = 'blocks' | 'blobs' | 'transactions' | 'rollups';

const typeOptions = [
  { type: 'blocks' as const, prefix: 'block:', label: 'Blocks', icon: Box },
  { type: 'blobs' as const, prefix: 'blob:', label: 'Blob IDs', icon: Fingerprint },
  { type: 'transactions' as const, prefix: 'tx:', label: 'Transactions with blobs', icon: ArrowLeftRight },
  { type: 'rollups' as const, prefix: 'rollup:', label: 'Rollups', icon: Layers3 },
];

// A type-filter prefix restricts which backend match types are shown.
const PREFIX_MATCH_TYPES: Record<string, SearchMatchResponse['type'][]> = {
  block: ['block'],
  tx: ['transaction'],
  blob: ['blob'],
  rollup: ['rollup', 'address'],
};

const MATCH_ICONS: Record<SearchMatchResponse['type'], typeof Box> = {
  block: Box,
  transaction: ArrowLeftRight,
  blob: Fingerprint,
  address: Wallet,
  rollup: Layers3,
};

function stripSearchPrefix(query: string): string {
  return query.replace(/^[a-z]+:\s*/i, '');
}

function activeSearchPrefix(query: string): string | null {
  const match = query.trim().match(/^([a-z]+):/i);
  return match ? match[1].toLowerCase() : null;
}

function describeTarget(target: SearchTarget): string {
  switch (target.kind) {
    case 'block':
      return `Go to block ${Number(target.blockNumber).toLocaleString()}`;
    case 'address':
      return `View blob activity for ${truncateAddress(target.address)}`;
    case 'transaction':
      return `Find the block for transaction ${truncateAddress(target.txHash)}`;
    case 'blob':
      return `Find the block for blob ${truncateAddress(target.versionedHash)}`;
  }
}

function matchPath(match: SearchMatchResponse): string | null {
  switch (match.type) {
    case 'block':
    case 'transaction':
    case 'blob':
      return match.block_number != null ? `/block/${match.block_number}` : null;
    case 'address':
      return match.address ? `/user/${match.address}` : null;
    case 'rollup':
      return match.addresses?.length ? `/user/${match.addresses[0]}` : null;
  }
}

function matchLabel(match: SearchMatchResponse): string {
  const inBlock =
    match.block_number != null
      ? ` — block ${Number(match.block_number).toLocaleString()}`
      : ' — pending';

  switch (match.type) {
    case 'block':
      return `Block ${Number(match.block_number).toLocaleString()}`;
    case 'transaction':
      return `Transaction ${truncateAddress(match.tx_hash ?? '')}${inBlock}`;
    case 'blob':
      return `Blob ${truncateAddress(match.versioned_hash ?? '')}${inBlock}`;
    case 'address':
      return `${truncateAddress(match.address ?? '')}${match.user_attribution ? ` — ${match.user_attribution}` : ''}`;
    case 'rollup': {
      const count = match.addresses?.length ?? 0;
      return `${match.name}${count > 1 ? ` — ${count} addresses` : ''}`;
    }
  }
}

function matchItemValue(match: SearchMatchResponse): string {
  const identifier =
    match.tx_hash || match.versioned_hash || match.address || match.name || match.block_number;
  return `match-${match.type}-${identifier}`.toLowerCase();
}

// A backend match that resolves to the same destination as the local parse
// result would render as a duplicate row; drop it.
function duplicatesTarget(match: SearchMatchResponse, target: SearchTarget | null): boolean {
  if (!target) return false;
  switch (target.kind) {
    case 'block':
      return match.type === 'block' && match.block_number === Number(target.blockNumber);
    case 'transaction':
      return match.type === 'transaction' && match.tx_hash?.toLowerCase() === target.txHash;
    case 'blob':
      return match.type === 'blob' && match.versioned_hash?.toLowerCase() === target.versionedHash;
    case 'address':
      return match.type === 'address' && match.address?.toLowerCase() === target.address;
  }
}

function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const { selectedNetwork } = useNetwork();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const [isResolvingHash, setIsResolvingHash] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Invalidates in-flight hash lookups when the query changes or the modal
  // closes, so a slow response can't navigate or surface an error late.
  const lookupTokenRef = useRef(0);
  // Set while a type-option click is being applied. cmdk re-selects the first
  // list item whenever the input changes, and a type click rewrites the input;
  // with no results above the type group that would move the selection
  // highlight onto the first type option ("Blocks") instead of the clicked one.
  const pendingTypeSelectionRef = useRef<SearchType | null>(null);

  const searchTarget = useMemo(() => parseSearchQuery(searchQuery), [searchQuery]);

  // The active type filter follows the query prefix, so it also clears or
  // moves when the user edits the prefix by hand rather than clicking.
  const selectedType = useMemo(() => {
    const prefix = activeSearchPrefix(searchQuery);
    return prefix
      ? typeOptions.find((option) => option.prefix === `${prefix}:`)?.type ?? null
      : null;
  }, [searchQuery]);
  const matches = useSearchMatches(
    stripSearchPrefix(searchQuery),
    selectedNetwork.apiParam,
    isOpen
  );

  const visibleMatches = useMemo(() => {
    const prefix = activeSearchPrefix(searchQuery);
    const allowedTypes = prefix ? PREFIX_MATCH_TYPES[prefix] : null;
    return matches
      .filter((match) => (allowedTypes ? allowedTypes.includes(match.type) : true))
      .filter((match) => !duplicatesTarget(match, searchTarget));
  }, [matches, searchQuery, searchTarget]);

  useEffect(() => {
    lookupTokenRef.current += 1;
    if (!isOpen) return;

    const animationFrame = requestAnimationFrame(() => {
      pendingTypeSelectionRef.current = null;
      setSearchQuery('');
      setSelectedValue('');
      setSearchError(null);
      setIsResolvingHash(false);
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  // cmdk only auto-selects the first item when the input changes, so matches
  // that arrive async would otherwise leave a type option highlighted and
  // Enter would not navigate. When there is no instant local result, move the
  // selection onto the first navigable match — a render-time adjustment keyed
  // on the match identity, so it fires once per new match list and never
  // fights arrow-key navigation.
  const firstNavigableMatch = searchTarget
    ? undefined
    : visibleMatches.find((match) => matchPath(match) !== null);
  const firstMatchValue = firstNavigableMatch ? matchItemValue(firstNavigableMatch) : null;
  const [prevFirstMatchValue, setPrevFirstMatchValue] = useState<string | null>(null);
  if (firstMatchValue !== prevFirstMatchValue) {
    setPrevFirstMatchValue(firstMatchValue);
    if (firstMatchValue) {
      setSelectedValue(firstMatchValue);
    }
  }

  const handleQueryChange = (value: string) => {
    lookupTokenRef.current += 1;
    setSearchQuery(value);
    setSearchError(null);
  };

  // Redirect cmdk's first-item re-selection after a type click back onto the
  // clicked type option; genuine selections (results, matches) pass through.
  // cmdk re-selects exactly once per input change, so the pending flag is
  // consumed by the first value change that arrives, whatever it is.
  const handleSelectedValueChange = (value: string) => {
    const pendingType = pendingTypeSelectionRef.current;
    pendingTypeSelectionRef.current = null;
    setSelectedValue(value);
    if (pendingType && value !== pendingType && typeOptions.some((option) => option.type === value)) {
      // Accept the re-selection above so the controlled value really changes,
      // then move it onto the clicked option in a follow-up update. Jumping
      // straight to the clicked option can be a no-op state update (its value
      // is usually already selected when the click lands), which React bails
      // out of, so cmdk would never sync and stay stuck on the first item.
      queueMicrotask(() => setSelectedValue(pendingType));
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  // Resolve a hash to its containing block via the given lookup and navigate
  // there, or surface notFoundMessage when it isn't confirmed in any block.
  const resolveHashToBlock = async (
    lookup: () => Promise<number | null | undefined>,
    notFoundMessage: string
  ) => {
    if (isResolvingHash) return;
    const token = ++lookupTokenRef.current;
    setIsResolvingHash(true);
    setSearchError(null);
    let blockNumber: number | null | undefined;
    let failureMessage: string | null = null;
    try {
      blockNumber = await lookup();
    } catch (error) {
      if (isNotFoundError(error)) {
        blockNumber = null;
      } else {
        failureMessage = 'Search failed — the indexer did not respond. Try again.';
      }
    } finally {
      setIsResolvingHash(false);
    }
    if (lookupTokenRef.current !== token) return;
    if (failureMessage) {
      setSearchError(failureMessage);
    } else if (blockNumber != null && blockNumber > 0) {
      navigateTo(`/block/${blockNumber}`);
    } else {
      setSearchError(notFoundMessage);
    }
  };

  const handleTargetSelect = (target: SearchTarget) => {
    switch (target.kind) {
      case 'block':
        navigateTo(`/block/${target.blockNumber}`);
        return;
      case 'address':
        navigateTo(`/user/${target.address}`);
        return;
      case 'transaction':
        void resolveHashToBlock(
          () =>
            api
              .getBlobByTxHash(target.txHash, selectedNetwork.apiParam)
              .then((response) => (response.success ? response.data?.block_number : null)),
          `No confirmed blob transaction found for ${truncateAddress(target.txHash)}. It may be pending or outside the indexed window.`
        );
        return;
      case 'blob':
        void resolveHashToBlock(
          () =>
            api
              .getBlobByVersionedHash(target.versionedHash, selectedNetwork.apiParam)
              .then((blob) => blob?.block_number),
          `No confirmed blob found for ${truncateAddress(target.versionedHash)}. It may be pending or outside the indexed window.`
        );
        return;
    }
  };

  const handleTypeSelect = (type: SearchType, query: string) => {
    lookupTokenRef.current += 1;
    // Only an actual input change triggers cmdk's re-selection; re-clicking
    // the active type leaves the query alone, so nothing needs redirecting.
    // Never arm the flag for the first type option either: cmdk suppresses
    // the no-op re-selection onto it (it is already selected when it is both
    // clicked and first), which would leave the flag armed and swallow the
    // next hover or arrow-key selection.
    pendingTypeSelectionRef.current =
      query !== searchQuery && type !== typeOptions[0].type ? type : null;
    setSearchQuery(query);
    setSearchError(null);
    requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (!input) return;

      input.focus();
      input.selectionStart = input.value.length;
      input.selectionEnd = input.value.length;
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        showClose={false}
        className="max-h-[80vh] max-w-[600px] overflow-hidden rounded-md md:max-h-[70vh]"
      >
        <DialogTitle className="sr-only">Search BlobFlow</DialogTitle>
        <DialogDescription className="sr-only">
          Search for blocks, blob IDs, transactions, rollups, and addresses.
        </DialogDescription>
        <Command shouldFilter={false} value={selectedValue} onValueChange={handleSelectedValueChange}>
          <div className="sticky top-0 z-10 flex items-center bg-[#14161a]">
            <div className="flex-1">
              <CommandInput
                ref={searchInputRef}
                value={searchQuery}
                onValueChange={handleQueryChange}
                placeholder="Search..."
              />
            </div>
            <div className="pr-3">
              <div className="hidden h-5 max-w-max items-center gap-0.5 rounded-sm border border-gray-500/20 bg-gray-50/5 px-1.5 text-[.6875rem] font-bold text-gray-500 sm:flex">
                Esc
              </div>
              <DialogClose className="rounded p-1 text-bodyText/70 hover:text-bodyText sm:hidden">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close search</span>
              </DialogClose>
            </div>
          </div>

          <CommandList>
            {(searchTarget || searchError) && (
              <>
                <CommandGroup heading="Result">
                  {searchTarget && (
                    <CommandItem
                      key={`${searchTarget.kind}-${searchQuery}`}
                      value={`goto-${searchTarget.kind}`}
                      disabled={isResolvingHash}
                      onSelect={() => handleTargetSelect(searchTarget)}
                    >
                      {isResolvingHash ? (
                        <RotateCw className="animate-spin text-blue" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="text-blue" aria-hidden="true" />
                      )}
                      <span className="flex-1 text-white">
                        {isResolvingHash ? 'Searching…' : describeTarget(searchTarget)}
                      </span>
                      <CornerDownLeft className="text-bodyText/50" aria-hidden="true" />
                    </CommandItem>
                  )}
                  {searchError && (
                    <p className="px-2 py-2.5 text-sm text-[#ff8f8f]">{searchError}</p>
                  )}
                </CommandGroup>

                <CommandSeparator />
              </>
            )}

            {visibleMatches.length > 0 && (
              <>
                <CommandGroup heading="Matches">
                  {visibleMatches.map((match) => {
                    const Icon = MATCH_ICONS[match.type];
                    const path = matchPath(match);

                    return (
                      <CommandItem
                        key={matchItemValue(match)}
                        value={matchItemValue(match)}
                        disabled={path === null}
                        onSelect={() => {
                          if (path) navigateTo(path);
                        }}
                      >
                        <Icon className="text-blue" aria-hidden="true" />
                        <span className="text-white">{matchLabel(match)}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                <CommandSeparator />
              </>
            )}

            <CommandGroup heading="Search by type">
              {typeOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <CommandItem
                    key={option.type}
                    value={option.type}
                    className={selectedType === option.type ? 'bg-[#23252a]' : undefined}
                    onSelect={() =>
                      handleTypeSelect(option.type, option.prefix + stripSearchPrefix(searchQuery).trim())
                    }
                  >
                    <Icon className="text-blue" aria-hidden="true" />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default memo(SearchModal);
