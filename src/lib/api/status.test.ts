import { getStatus } from './status';
import * as core from './core';

vi.mock('./core', () => ({
  fetchApi: vi.fn(),
}));

describe('api/status', () => {
  it('calls status endpoint', async () => {
    vi.mocked(core.fetchApi).mockResolvedValue({ success: true, data: { uptime: '1h' } } as any);

    const result = await getStatus('mainnet');

    expect(core.fetchApi).toHaveBeenCalledWith('/status', 'mainnet');
    expect(result.success).toBe(true);
  });
});
