import { GET } from './route';

describe('GET /api/raw-blob/status', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports disabled when BLOB_ARCHIVE_URL is unset', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { enabled: false, network: 'mainnet' },
    });
  });

  it('reports enabled with the configured network, lowercased', async () => {
    vi.stubEnv('BLOB_ARCHIVE_URL', 'http://bloar.example:8550/live');
    vi.stubEnv('BLOB_ARCHIVE_NETWORK', 'Sepolia');

    const response = await GET();
    expect(await response.json()).toEqual({
      success: true,
      data: { enabled: true, network: 'sepolia' },
    });
  });
});
