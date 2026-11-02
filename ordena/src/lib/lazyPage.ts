import { lazy, type ComponentType } from 'react';

const KEY = 'pozmvm.chunk-reload';

/**
 * Lazy page that survives a new deploy. When the site is rebuilt, the hashed file for this page changes;
 * a tab opened before the deploy would ask for the old file, fail and render nothing. Here that failure
 * reloads the page once so the tab picks up the new build.
 */
export function lazyPage<T extends ComponentType<object>>(load: () => Promise<T>) {
  return lazy(async () => {
    try {
      const C = await load();
      try { sessionStorage.removeItem(KEY); } catch { /* storage blocked */ }
      return { default: C };
    } catch (err) {
      let reloaded = false;
      try { reloaded = sessionStorage.getItem(KEY) === '1'; sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked */ }
      if (!reloaded) { window.location.reload(); return new Promise<never>(() => {}); }
      throw err;
    }
  });
}
