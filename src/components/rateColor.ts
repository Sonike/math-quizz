/**
 * Maps an error rate (0..1) — or null for "never practised" — to the CSS
 * bucket suffix used by the shared `.heat--{bucket}` classes.
 */
export const rateBucket = (rate: number | null): string => {
  if (rate === null) return 'nodata';
  if (rate < 0.08) return '0';
  if (rate < 0.18) return '1';
  if (rate < 0.3) return '2';
  return '3';
};
