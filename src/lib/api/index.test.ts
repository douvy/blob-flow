import api, { api as namedApi } from './index';

describe('api/index', () => {
  it('exports complete api surface', () => {
    expect(api).toBe(namedApi);
    expect(api).toHaveProperty('getLatestBlocks');
    expect(api).toHaveProperty('getBlobByTxHash');
    expect(api).toHaveProperty('getStats');
    expect(api).toHaveProperty('getStatus');
    expect(api).toHaveProperty('getMempool');
    expect(api).toHaveProperty('getTopUsers');
    expect(api).toHaveProperty('getUserById');
  });
});
