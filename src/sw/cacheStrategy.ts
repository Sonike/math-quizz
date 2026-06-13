export type CacheStrategy = 'network-first' | 'cache-first' | 'pass';

/** The fields of a fetch Request that decide its caching strategy. */
export interface RoutedRequest {
  method: string;
  mode: string;
}

/**
 * Single source of truth for the service worker's routing.
 * Navigations (the HTML shell) are network-first so an online launch is
 * always current; everything else is content-hashed, so cache-first is safe.
 * `public/sw.js` mirrors this logic verbatim (it cannot import TS).
 */
export function cacheStrategyFor(request: RoutedRequest): CacheStrategy {
  if (request.method !== 'GET') return 'pass';
  if (request.mode === 'navigate') return 'network-first';
  return 'cache-first';
}
