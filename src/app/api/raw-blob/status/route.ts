/**
 * Reports whether raw blob viewing is available on this deployment and for
 * which network, so the UI can hide the feature entirely when no BlobArchive
 * follower is configured. Exposes no archive location or credentials.
 */

// Env is read per request so a redeploy with new env is always reflected.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const enabled = Boolean(process.env.BLOB_ARCHIVE_URL);
  const network = (process.env.BLOB_ARCHIVE_NETWORK || 'mainnet').toLowerCase();

  return Response.json({ success: true, data: { enabled, network } });
}
