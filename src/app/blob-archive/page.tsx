import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, ArrowLeft, Info } from 'lucide-react';
import {
  BLOAR_REPO_URL,
  BLOB_ARCHIVE_DENEB_SLOT,
  BLOB_ARCHIVE_PUBLIC_URL,
  BLOB_ARCHIVE_SITE_URL,
} from '@/constants';

export const metadata: Metadata = {
  title: 'Blob Archive API',
  description:
    'Free public archive of raw Ethereum blob data, for backfilling an L2 node through historical blobs. Not a beacon blob_sidecars API.',
  alternates: {
    canonical: '/blob-archive',
  },
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-divider bg-[#0e1013] p-3 font-mono text-xs leading-5 text-[#b8bdc7]">
      {children}
    </pre>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-sm border border-divider bg-[#0e1013] px-1 py-0.5 font-mono text-[0.8125rem] text-[#b8bdc7]">
      {children}
    </code>
  );
}

export default function BlobArchivePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link
        href="/"
        className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>

      <section className="max-w-3xl">
        <h1 className="text-3xl font-windsor-bold text-white mb-2">Blob Archive API</h1>
        <p className="text-sm text-bodyText mb-6">
          A free, public archive of raw Ethereum blob data at{' '}
          <Code>{BLOB_ARCHIVE_PUBLIC_URL}</Code>. It exists so an L2 node can backfill the
          historical blobs it needs to reconstruct batches, going back further than the
          four-week retention window of the beacon chain.
        </p>

        {/*
          The single most common misread: the beacon-style path prefix makes
          this look like a consensus API. It is not one, and a consensus client
          pointed at it will fail in confusing ways. State it before anything
          else so nobody discovers it after an hour of debugging.
        */}
        <div className="mb-8 flex items-start gap-2.5 rounded-md border border-[#292e35] bg-[#17181b] px-3.5 py-3 text-sm text-[#a9adb6]">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-white">This is not a beacon blob_sidecars API.</p>
            <p className="mt-1.5">
              There is no <Code>/eth/v1/beacon/blob_sidecars/{'{id}'}</Code> route here, and
              the payload carries no KZG commitments, no proofs, and no signed block header.
              An Ethereum consensus client (Prysm, Lighthouse, Teku) cannot sync or backfill
              blobs from this endpoint. It serves raw blob data only.
            </p>
            <p className="mt-1.5">
              L2 batch reconstruction works because clients like Arbitrum Nitro verify blob
              data against the versioned hashes already present in the L1 transaction, so raw
              blobs are sufficient there.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-windsor-bold text-white mb-3">Quickstart</h2>
        <p className="text-sm text-bodyText mb-3">
          Point an Arbitrum Nitro node at the archive to backfill historical blobs:
        </p>
        <div className="mb-8">
          <CodeBlock>
            {`--parent-chain.blob-client.beacon-url=${BLOB_ARCHIVE_PUBLIC_URL}`}
          </CodeBlock>
        </div>

        <h2 className="text-2xl font-windsor-bold text-white mb-3">
          Use it to sync, then switch away
        </h2>
        <p className="text-sm text-bodyText mb-3">
          The archive is for the historical part of a sync, not for steady-state operation.
          Once your node has caught up, repoint it at a live consensus endpoint (your own
          beacon node, or a provider) and leave it there. Two reasons this matters:
        </p>
        <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm text-bodyText">
          <li>
            The archive follows the chain with a lag of minutes, so it is always slightly
            behind the tip. A node that keeps using it will keep stalling at the head.
          </li>
          <li>
            Blob data is roughly 1 MB per blob on the wire. Following the chain here burns
            shared bandwidth that other people are trying to use for backfill.
          </li>
        </ul>
        <p className="text-sm text-bodyText mb-8">
          The practical pattern: start the node against the archive, let it work through
          history, then change the flag to your live endpoint and restart.
        </p>

        <h2 className="text-2xl font-windsor-bold text-white mb-3">Endpoint reference</h2>
        <p className="text-sm text-bodyText mb-4">
          The base URL is <Code>{BLOB_ARCHIVE_PUBLIC_URL}</Code>. Clients append the standard
          beacon-style paths below. Anything else returns 404.
        </p>

        <div className="mb-4 overflow-x-auto border border-divider rounded-lg">
          <table className="min-w-full overflow-hidden">
            <thead>
              <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
                <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">
                  Path
                </th>
                <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">
                  Returns
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {[
                {
                  path: '/eth/v1/beacon/blobs/{slot}',
                  returns: 'Raw blob data for that slot',
                },
                {
                  path: '/eth/v1/beacon/genesis',
                  returns: 'Genesis time, fork version, validators root',
                },
                {
                  path: '/eth/v1/config/spec',
                  returns: 'Chain id and seconds per slot',
                },
              ].map((row) => (
                <tr
                  key={row.path}
                  className="bg-gradient-to-r from-[#17181b] to-[#141519]/60"
                >
                  <td className="py-3 px-3 sm:px-4 text-sm font-mono text-white break-all">
                    {row.path}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-sm text-[#b8bdc7]">{row.returns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-bodyText mb-3">
          Slots are numeric only. The <Code>head</Code>, <Code>finalized</Code>, and{' '}
          <Code>0x</Code>-prefixed block-root forms accepted by a real beacon API are not
          supported here and return 404.
        </p>

        <p className="text-sm text-bodyText mb-3">
          A blob response is a JSON object with a single <Code>data</Code> array holding one
          hex string per blob. Each blob is 128 KiB, so a slot carrying several blobs is a
          multi-megabyte response.
        </p>
        <div className="mb-4">
          <CodeBlock>{`{"data":["0x18ba05e4...","0x0100f4c2..."]}`}</CodeBlock>
        </div>

        <p className="text-sm text-bodyText mb-3">Status codes worth handling:</p>
        <ul className="mb-8 list-disc space-y-1.5 pl-5 text-sm text-bodyText">
          <li>
            <Code>200</Code> with an empty <Code>data</Code> array means the slot exists and
            carried no blobs. That is a normal answer, not a gap.
          </li>
          <li>
            <Code>503</Code> means the slot is ahead of what the archive has ingested. The
            response carries <Code>Retry-After: 12</Code>; wait and retry rather than
            treating it as missing.
          </li>
          <li>
            <Code>404</Code> on a well-formed slot means it precedes the start of the
            archive.
          </li>
          <li>
            <Code>429</Code> means the service-wide egress cap was hit. Back off and retry.
          </li>
        </ul>

        <h2 className="text-2xl font-windsor-bold text-white mb-3">Coverage</h2>
        <ul className="mb-8 list-disc space-y-1.5 pl-5 text-sm text-bodyText">
          <li>Ethereum mainnet only.</li>
          <li>
            History runs from the Deneb fork, slot{' '}
            <Code>{BLOB_ARCHIVE_DENEB_SLOT.toLocaleString('en-US')}</Code>. Earlier slots
            predate blobs entirely and return 404.
          </li>
          <li>
            The archive follows the chain with a lag of minutes, so the most recent slots may
            not be available immediately. This is expected behavior, not a bug.
          </li>
        </ul>

        <h2 className="text-2xl font-windsor-bold text-white mb-3">Limits and etiquette</h2>
        <p className="text-sm text-bodyText mb-3">
          Egress is capped service-wide at roughly 512 Mbps. Over the cap the endpoint
          returns <Code>429</Code>, so clients should back off and retry rather than hammer
          it. Responses are cached at the edge (15 minutes for blobs, 24 hours for{' '}
          <Code>genesis</Code> and <Code>config/spec</Code>), which is why repeated backfills
          over the same range stay fast.
        </p>
        <div className="mb-8 flex items-start gap-2.5 rounded-md border border-[#292e35] bg-[#17181b] px-3.5 py-3 text-sm text-[#a9adb6]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
          <p>
            The archive is free and best-effort, with no SLA. If you depend on blob data for
            production infrastructure, run your own archiver.
          </p>
        </div>

        <h2 className="text-2xl font-windsor-bold text-white mb-3">Examples</h2>
        <p className="text-sm text-bodyText mb-3">Check the chain the archive is following:</p>
        <div className="mb-4">
          <CodeBlock>{`curl ${BLOB_ARCHIVE_PUBLIC_URL}/eth/v1/beacon/genesis`}</CodeBlock>
        </div>

        <p className="text-sm text-bodyText mb-3">Fetch the blobs from a single slot:</p>
        <div className="mb-4">
          <CodeBlock>
            {`curl ${BLOB_ARCHIVE_PUBLIC_URL}/eth/v1/beacon/blobs/14923800`}
          </CodeBlock>
        </div>

        <p className="text-sm text-bodyText mb-3">
          Count the blobs in a slot without printing a megabyte of hex:
        </p>
        <div className="mb-8">
          <CodeBlock>
            {`curl -s ${BLOB_ARCHIVE_PUBLIC_URL}/eth/v1/beacon/blobs/14923800 \\
  | jq '.data | length'`}
          </CodeBlock>
        </div>

        <p className="border-t border-divider pt-4 text-xs leading-5 text-[#6e7787]">
          Served by a{' '}
          <a
            href={BLOB_ARCHIVE_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue hover:underline"
          >
            BlobArchive
          </a>{' '}
          follower node running the open source archiver,{' '}
          <a
            href={BLOAR_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue hover:underline"
          >
            bloar
          </a>
          .
        </p>
      </section>
    </div>
  );
}
