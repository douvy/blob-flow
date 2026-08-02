"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import useScrollLock from '../hooks/useScrollLock';
import { BlobResponse } from '../types';
import { fetchRawBlob, RawBlobError } from '../lib/api/rawBlob';
import { beaconSlotForBlob, formatBlobSize } from '../utils';
import { BLOB_ARCHIVE_SITE_URL, BLOAR_REPO_URL } from '../constants';

/**
 * Bytes shown in the hex and text previews. Full blobs are 128 KiB; the
 * download button provides the complete payload.
 */
export const RAW_BLOB_PREVIEW_BYTES = 4096;

type PreviewMode = 'hex' | 'text';

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string; httpStatus?: number }
  | { status: 'loaded'; bytes: Uint8Array };

type FetchResult = Exclude<FetchState, { status: 'loading' }>;

interface RawBlobViewerProps {
  blob: BlobResponse | null;
  onClose: () => void;
}

export default function RawBlobViewer({ blob, onClose }: RawBlobViewerProps) {
  const isOpen = blob !== null;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useScrollLock(isOpen);

  const versionedHash = blob?.versioned_hash || null;
  const network = blob?.network_name ?? null;
  const slot = blob ? beaconSlotForBlob(blob) : null;

  // One archive request is identified by this key. Fetch results and the
  // preview mode are stored keyed so that loading and reset states can be
  // derived at render time instead of set synchronously in effects.
  const requestKey =
    slot !== null && versionedHash && network ? `${network}:${slot}:${versionedHash}` : null;

  const [result, setResult] = useState<{ key: string; value: FetchResult } | null>(null);
  const [modeChoice, setModeChoice] = useState<{ key: string; mode: PreviewMode } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Tracks the open/closed transition so a cached transient error is retried
  // once when the viewer is reopened, without refetch loops while it stays
  // open. 404s are kept: reopening cannot make an absent blob appear.
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!isOpen || !requestKey || slot === null || !versionedHash || !network) return;

    const cached = result?.key === requestKey ? result.value : null;
    const cachedTransientError = cached?.status === 'error' && cached.httpStatus !== 404;
    if (cached && !(justOpened && cachedTransientError)) return;

    let cancelled = false;

    fetchRawBlob(slot, versionedHash, network).then(
      (bytes) => {
        if (!cancelled) setResult({ key: requestKey, value: { status: 'loaded', bytes } });
      },
      (error: unknown) => {
        if (cancelled) return;
        const value: FetchResult =
          error instanceof RawBlobError
            ? { status: 'error', message: error.message, httpStatus: error.status }
            : { status: 'error', message: 'Raw blob request failed.' };
        setResult({ key: requestKey, value });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [isOpen, requestKey, slot, versionedHash, network, result]);

  const retry = () => setResult(null);

  const state: FetchState = !requestKey
    ? {
        status: 'error',
        message: 'This blob is missing the data needed to locate it in the archive.',
      }
    : result?.key === requestKey
      ? result.value
      : { status: 'loading' };
  const mode: PreviewMode = modeChoice?.key === requestKey ? modeChoice.mode : 'hex';
  const setMode = (next: PreviewMode) => {
    if (requestKey) setModeChoice({ key: requestKey, mode: next });
  };

  const bytes = state.status === 'loaded' ? state.bytes : null;
  const preview = useMemo(() => {
    if (!bytes) return '';
    const slice = bytes.slice(0, RAW_BLOB_PREVIEW_BYTES);
    return mode === 'hex' ? toHexPreview(slice) : toTextPreview(slice);
  }, [bytes, mode]);

  if (!blob) return null;

  const handleDownload = () => {
    if (!bytes || !versionedHash) return;
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `blob-${versionedHash}.bin`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-4 backdrop-blur-[1px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="raw-blob-viewer-title"
        className="w-full max-w-3xl overflow-hidden rounded-lg border border-divider bg-[#14161a] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b] px-5 py-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6e7787]">
              Raw Blob
            </p>
            <h3
              id="raw-blob-viewer-title"
              className="truncate font-mono text-base text-white"
              title={versionedHash || undefined}
            >
              {versionedHash ? truncateHash(versionedHash) : `Blob #${blob.blob_index}`}
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close raw blob viewer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-divider text-xl leading-none text-[#b8bdc7] transition-colors hover:border-[#3B55E6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B55E6]"
          >
            x
          </button>
        </div>

        <div className="max-h-[76vh] overflow-y-auto px-5 py-5">
          {state.status === 'loading' && (
            <div className="py-10 text-center text-sm text-[#b8bdc7]">
              Fetching blob from the archive...
            </div>
          )}

          {state.status === 'error' &&
            (state.httpStatus === 503 ? (
              <div className="py-10 text-center">
                <span className="inline-flex items-center rounded-full border border-[#E6B23B]/40 bg-[#2b2416] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#e8c268]">
                  Pending
                </span>
                <p className="mt-3 text-sm text-[#b8bdc7]">
                  This blob has not reached the archive yet. New blobs typically appear within
                  one to two minutes.
                </p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-4 rounded-md border border-divider px-3 py-1.5 text-sm text-[#b8bdc7] transition-colors hover:border-[#3B55E6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B55E6]"
                >
                  Check again
                </button>
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm text-[#FF6B6B]">{state.message}</p>
                <p className="mt-2 text-xs text-[#6e7787]">
                  Availability depends on the archive having synced this slot.
                </p>
                {state.httpStatus !== 404 && (
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-4 rounded-md border border-divider px-3 py-1.5 text-sm text-[#b8bdc7] transition-colors hover:border-[#3B55E6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B55E6]"
                  >
                    Try again
                  </button>
                )}
              </div>
            ))}

          {state.status === 'loaded' && bytes && (
            <>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                <StatItem label="Blob Size" value={formatBlobSize(bytes.length)} />
                <StatItem label="Network" value={blob.network_name} />
                <StatItem label="Beacon Slot" value={slot === null ? '-' : slot.toLocaleString()} />
                <StatItem label="Blob Index" value={String(blob.blob_index)} />
              </dl>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-md border border-divider" role="group">
                  <PreviewToggle active={mode === 'hex'} onClick={() => setMode('hex')} first>
                    Hex
                  </PreviewToggle>
                  <PreviewToggle active={mode === 'text'} onClick={() => setMode('text')}>
                    Text
                  </PreviewToggle>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-md border border-divider px-3 py-1.5 text-sm text-[#b8bdc7] transition-colors hover:border-[#3B55E6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B55E6]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download (128 KB)
                </button>
              </div>

              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md border border-divider bg-[#0e1013] p-3 font-mono text-xs leading-5 text-[#b8bdc7]">
                {preview}
              </pre>
              <p className="mt-2 text-xs text-[#6e7787]">
                Showing the first {formatBlobSize(Math.min(bytes.length, RAW_BLOB_PREVIEW_BYTES))}.
                Download the file for the full payload.
              </p>
            </>
          )}

          <p className="mt-5 border-t border-divider pt-4 text-xs leading-5 text-[#6e7787]">
            Raw blob data served from the{' '}
            <a
              href={BLOB_ARCHIVE_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-baseline gap-0.5 text-blue hover:underline"
            >
              BlobArchive
              <ExternalLink className="h-3 w-3 self-center" aria-hidden="true" />
            </a>{' '}
            network via its open source archiver,{' '}
            <a
              href={BLOAR_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-baseline gap-0.5 text-blue hover:underline"
            >
              bloar
              <ExternalLink className="h-3 w-3 self-center" aria-hidden="true" />
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 text-xs uppercase tracking-wider text-[#6e7787]">{label}</dt>
      <dd className="text-sm text-white">{value}</dd>
    </div>
  );
}

function PreviewToggle({
  active,
  onClick,
  first = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B55E6] ${
        first ? 'rounded-l-md' : 'rounded-r-md border-l border-divider'
      } ${active ? 'bg-[#1E2747] text-white' : 'text-[#b8bdc7] hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function truncateHash(hash: string): string {
  if (hash.length <= 18) return hash;
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 6)}`;
}

function toHexPreview(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32) {
    const row = Array.from(bytes.slice(offset, offset + 32))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(' ');
    lines.push(row);
  }
  return lines.join('\n');
}

function toTextPreview(bytes: Uint8Array): string {
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // Keep tabs and line breaks; replace other control characters so the
  // preview stays readable.
  return Array.from(decoded)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      const printable =
        code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
      return printable ? char : '.';
    })
    .join('');
}
