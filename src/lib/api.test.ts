import apiDefault, { api } from './api';

describe('lib/api re-export', () => {
  it('re-exports modular api as default and named', () => {
    expect(apiDefault).toBe(api);
    expect(api).toHaveProperty('getStats');
  });
});
