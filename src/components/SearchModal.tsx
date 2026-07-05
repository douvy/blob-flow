"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Box,
  Clock3,
  CornerDownLeft,
  Fingerprint,
  Layers3,
  RotateCw,
  Scale,
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
import { useNetwork } from '@/hooks/useNetwork';
import { SearchTarget } from '@/types';
import { parseSearchQuery, truncateAddress } from '@/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchType = 'blocks' | 'blobs' | 'transactions' | 'rollups' | null;

const typeOptions = [
  { type: 'blocks' as const, prefix: 'block:', label: 'Blocks', icon: Box },
  { type: 'blobs' as const, prefix: 'blob:', label: 'Blob IDs', icon: Fingerprint },
  { type: 'transactions' as const, prefix: 'tx:', label: 'Transactions with blobs', icon: ArrowLeftRight },
  { type: 'rollups' as const, prefix: 'rollup:', label: 'Rollups', icon: Layers3 },
];

function stripSearchPrefix(query: string): string {
  return query.replace(/^[a-z]+:\s*/i, '');
}

function describeTarget(target: SearchTarget): string {
  switch (target.kind) {
    case 'block':
      return `Go to block ${Number(target.blockNumber).toLocaleString()}`;
    case 'address':
      return `View blob activity for ${truncateAddress(target.address)}`;
    case 'transaction':
      return `Find the block for transaction ${truncateAddress(target.txHash)}`;
  }
}

function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const { selectedNetwork } = useNetwork();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SearchType>(null);
  const [isLookingUpTx, setIsLookingUpTx] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchTarget = useMemo(() => parseSearchQuery(searchQuery), [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const animationFrame = requestAnimationFrame(() => {
      setSearchQuery('');
      setSelectedType(null);
      setSearchError(null);
      setIsLookingUpTx(false);
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    setSearchError(null);
  };

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleTargetSelect = async (target: SearchTarget) => {
    if (target.kind === 'block') {
      navigateTo(`/block/${target.blockNumber}`);
      return;
    }
    if (target.kind === 'address') {
      navigateTo(`/user/${target.address}`);
      return;
    }

    // Transaction hashes have no page of their own; resolve to the containing block.
    if (isLookingUpTx) return;
    setIsLookingUpTx(true);
    setSearchError(null);
    try {
      const response = await api.getBlobByTxHash(target.txHash, selectedNetwork.apiParam);
      if (response.success && response.data && response.data.block_number > 0) {
        navigateTo(`/block/${response.data.block_number}`);
        return;
      }
    } catch {
      // Fall through to the not-found message below.
    } finally {
      setIsLookingUpTx(false);
    }
    setSearchError(
      `No confirmed blob transaction found for ${truncateAddress(target.txHash)}. It may be pending or outside the indexed window.`
    );
  };

  const handleTypeSelect = (type: SearchType, query: string) => {
    setSelectedType(type);
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
          Search for blocks, blob IDs, transactions, rollups, and recent blob activity.
        </DialogDescription>
        <Command shouldFilter={false}>
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
                      disabled={isLookingUpTx}
                      onSelect={() => handleTargetSelect(searchTarget)}
                    >
                      {isLookingUpTx ? (
                        <RotateCw className="animate-spin text-blue" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="text-blue" aria-hidden="true" />
                      )}
                      <span className="flex-1 text-white">
                        {isLookingUpTx ? 'Searching…' : describeTarget(searchTarget)}
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

            <CommandSeparator />

            <CommandGroup heading="Latest blob activity">
              <CommandItem value="latest-block" onSelect={() => handleTypeSelect('blocks', 'block:9274612')}>
                <RotateCw className="text-blue" aria-hidden="true" />
                <span className="text-white">Block #9274612 - 8 blobs added by Arbitrum (3 min ago)</span>
              </CommandItem>
              <CommandItem
                value="pending-optimism"
                onSelect={() => {
                  setSearchQuery('12 pending blobs from Optimism');
                  searchInputRef.current?.focus();
                }}
              >
                <Clock3 className="text-blue" aria-hidden="true" />
                <span className="text-white">12 pending blobs in mempool from Optimism (waiting for confirmation)</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Blob stats summary">
              <CommandItem value="base-fee">
                <ArrowUpRight className="text-blue" aria-hidden="true" />
                <span className="text-white">Current Blob Base Fee: 0.00042 ETH (up 12% in 24h)</span>
              </CommandItem>
              <CommandItem value="cost-comparison">
                <Scale className="text-blue" aria-hidden="true" />
                <span className="text-white">Blob Cost vs Calldata: 3.2x cheaper for rollups today</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default memo(SearchModal);
