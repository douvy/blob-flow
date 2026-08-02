"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ExternalLink } from 'lucide-react';
import { BlobResponse } from '../types';
import {
  checkRawBlobAvailability,
  rawBlobDownloadUrl,
  RawBlobAvailability,
} from '../lib/api/rawBlob';
import { beaconSlotForBlob } from '../utils';
import { BLOAR_REPO_URL } from '../constants';

/** How often a pending blob rechecks the archive; matches its sync cadence. */
const PENDING_RECHECK_MS = 15000;

/**
 * Direct download affordance for one blob's raw bytes, shown next to the
 * View raw button. Probes the archive once (HEAD) and shows Pending, with a
 * periodic recheck, until the blob lands. Renders nothing when the blob is
 * definitively absent or the probe fails.
 */
export default function RawBlobActions({ blob }: { blob: BlobResponse }) {
  const slot = beaconSlotForBlob(blob);
  const versionedHash = blob.versioned_hash;

  const { data: availability } = useQuery<RawBlobAvailability>({
    queryKey: ['raw-blob-availability', blob.network_name, slot, versionedHash],
    queryFn: async () => {
      const probed = await checkRawBlobAvailability(
        slot as number,
        versionedHash as string,
        blob.network_name
      );
      // Probe failures throw so react-query retries them instead of caching
      // a transient outage forever; 'missing' is a definitive answer.
      if (probed === 'error') {
        throw new Error('Raw blob availability probe failed.');
      }
      return probed;
    },
    enabled: slot !== null && Boolean(versionedHash),
    staleTime: Infinity,
    refetchInterval: (query) => (query.state.data === 'pending' ? PENDING_RECHECK_MS : false),
  });

  if (
    slot === null ||
    !versionedHash ||
    availability === undefined ||
    availability === 'missing' ||
    availability === 'error'
  ) {
    return null;
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      {availability === 'available' ? (
        <a
          href={rawBlobDownloadUrl(slot, versionedHash, blob.network_name)}
          download={`blob-${versionedHash}.bin`}
          className="inline-flex items-center gap-1 rounded border border-divider px-2 py-0.5 text-[#b8bdc7] transition-colors hover:border-[#3B55E6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B55E6]"
        >
          <Download className="h-3 w-3" aria-hidden="true" />
          Download
        </a>
      ) : (
        <span
          className="rounded-full border border-[#E6B23B]/40 bg-[#2b2416] px-2 py-0.5 font-medium uppercase tracking-wider text-[#e8c268]"
          title="This blob has not reached the archive yet. New blobs typically appear within one to two minutes."
        >
          Pending
        </span>
      )}
      <span className="text-[#6e7787]">
        provided by{' '}
        <a
          href={BLOAR_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-baseline gap-0.5 text-blue hover:underline"
        >
          bloar
          <ExternalLink className="h-2.5 w-2.5 self-center" aria-hidden="true" />
        </a>
      </span>
    </span>
  );
}
