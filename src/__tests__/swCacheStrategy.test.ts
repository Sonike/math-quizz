import { cacheStrategyFor } from '../sw/cacheStrategy';

describe('cacheStrategyFor', () => {
  it('passes through non-GET requests', () => {
    expect(cacheStrategyFor({ method: 'POST', mode: 'cors' })).toBe('pass');
  });

  it('uses network-first for navigations', () => {
    expect(cacheStrategyFor({ method: 'GET', mode: 'navigate' })).toBe('network-first');
  });

  it('uses cache-first for asset GETs', () => {
    expect(cacheStrategyFor({ method: 'GET', mode: 'cors' })).toBe('cache-first');
    expect(cacheStrategyFor({ method: 'GET', mode: 'no-cors' })).toBe('cache-first');
  });
});
