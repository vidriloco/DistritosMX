/**
 * Anonymous product analytics (PostHog, cookieless: nothing is stored in the browser). Only counts
 * what people do, never what they write: no names, addresses, comments or letter text are ever sent.
 * Anything that could hold that text is marked `ph-no-capture`, which keeps autocapture off it too.
 */
import type { PostHog } from 'posthog-js';

type Data = Record<string, string | number | boolean | null | undefined>;

// A project token is public by design: it can only send events, not read them.
const TOKEN = import.meta.env.VITE_POSTHOG_KEY || 'phc_sjhMLdeBsxDXXCxjmJ72DbPewD7iYoFrfkuaBV63yRVg';
const local = /(^|\.)localhost$|^127\.|^192\.168\./.test(location.hostname);

let ph: PostHog | null = null;
const pending: [string, Data | undefined][] = [];

/** Loads PostHog after the page is up, so it never delays the first paint. Events before that are queued. */
export function initAnalytics() {
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(TOKEN, {
      api_host: 'https://eu.i.posthog.com',
      ui_host: 'https://eu.posthog.com',
      cookieless_mode: 'always',
      person_profiles: 'never',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: true,
      disable_surveys: true,
    });
    posthog.register({ site: 'ordena', environment: local ? 'development' : 'production' });
    ph = posthog;
    pending.splice(0).forEach(([e, d]) => posthog.capture(e, d));
  }).catch(() => { /* blocked or offline: the site works the same */ });

  // Links that leave the site, wherever they are. A mailto keeps only the address: its body can hold the letter.
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.closest('.ph-no-capture')) return;
    if (a.protocol === 'mailto:') track('enlace_externo', { url: `mailto:${a.pathname}` });
    else if (/^https?:$/.test(a.protocol) && a.host !== location.host) track('enlace_externo', { url: a.origin + a.pathname, texto: a.textContent?.trim().slice(0, 60) });
  }, { capture: true });
}

export function track(event: string, data?: Data) {
  try {
    if (ph) ph.capture(event, data);
    else if (pending.length < 100) pending.push([event, data]);
  } catch { /* analytics must never break the site */ }
}
