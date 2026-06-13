/**
 * Register the service worker once the page has loaded, so it never competes
 * with first paint. Feature-guarded and silently tolerant of failure — an
 * unsupported or blocked worker just leaves the app in its online-only state.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        /* no-op: app still works while online */
      });
  });
}
