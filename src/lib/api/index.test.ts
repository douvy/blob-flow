describe('api/index', () => {
  it('exports complete api surface', async () => {
    const apiModule = await import('./index');
    const api = apiModule.default;
    const namedApi = apiModule.api;

    expect(api).toBe(namedApi);
    expect(api).toHaveProperty('getLatestBlocks');
    expect(api).toHaveProperty('getBlobByTxHash');
    expect(api).toHaveProperty('getStats');
    expect(api).toHaveProperty('getStatus');
    expect(api).toHaveProperty('getMempool');
    expect(api).toHaveProperty('getTopUsers');
    expect(api).toHaveProperty('getUserByAddress');
    expect(api).toHaveProperty('getUserBlobs');
  });
});
