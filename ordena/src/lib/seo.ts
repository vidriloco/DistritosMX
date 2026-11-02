import { useEffect } from 'react';

/** Public origin of the site, set at build time (VITE_SITE_URL). Used for canonical and social URLs. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin;
export const SITE_NAME = 'Opine · Consulta del Valle de México';

/** Shared route metadata. scripts/seo-build.mjs writes the same values into the static HTML of each route. */
export const STATIC_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'Opine · Consulta pública del plan del Valle de México (POZMVM)', description: 'Entiende el plan del Valle de México a 2050 por temas, responde preguntas cortas y arma tu opinión con citas para la consulta pública de SEDATU, abierta hasta el 22 de noviembre de 2026.' },
  '/temas': { title: 'Los nueve temas del POZMVM · Opine', description: 'Agua, movilidad, vivienda, residuos, riesgos, empleo, campo, gobernanza y financiamiento: cada tema con su cifra clave, sus preguntas y la página del plan.' },
  '/quien-paga': { title: '¿Quién paga el plan del Valle de México? · Opine', description: 'El POZMVM no trae ninguna cifra de costo. Siete formas de recaudar, un fideicomiso común y lo que te afectaría según tu situación, con las páginas del plan.' },
  '/mi-opinion': { title: 'Tu opinión para la consulta del POZMVM · Opine', description: 'Tu carta para SEDATU, armada con tus respuestas y las páginas del plan que respaldan cada punto. Cópiala o envíala por correo.' },
  '/resultados': { title: 'Qué opinan otras personas sobre el POZMVM · Opine', description: 'Lo más elegido por tema entre quienes han usado este sitio para opinar sobre el plan del Valle de México.' },
};

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
}

/** Keeps title, description, canonical and social tags in sync with the route the visitor is on. */
export function useSeo(path: string, meta?: { title: string; description: string } | null) {
  const m = meta ?? STATIC_META[path];
  useEffect(() => {
    if (!m) return;
    const url = SITE_URL + (path === '/' ? '/' : path);
    document.title = m.title;
    setMeta('name', 'description', m.description);
    setMeta('property', 'og:title', m.title);
    setMeta('property', 'og:description', m.description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', m.title);
    setMeta('name', 'twitter:description', m.description);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = url;
  }, [path, m?.title, m?.description]);
}

/** First sentence of a text, trimmed for a meta description. */
export const firstSentence = (t: string, max = 158) => { const s = t.split(/(?<=\.)\s/)[0]; return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : s; };
