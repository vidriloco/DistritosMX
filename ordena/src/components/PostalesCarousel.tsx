import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';

import { track } from '../lib/analytics';
import { Spinner } from './Loading';

export interface Postal { slug: string; titulo: string; alt: string; grupo?: string }
export interface GrupoPostal { id: string; nombre: string; color: string }

const Arrow = ({ d, size = 18 }: { d: string; size?: number }) => <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={d} /></svg>;
const PREV = 'M15 6l-6 6 6 6';
const NEXT = 'M9 6l6 6-6 6';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// A slide's number in the full set: the slug's leading digits (`09-movilidad-flujos`), else its position
const numero = (p: Postal, i: number) => parseInt(p.slug, 10) || i + 1;

/**
 * A horizontal row of numbered social slides (1080×1350, `<slug>.jpg` and `<slug>-540.jpg` under `base`): swipe or
 * scroll it, or step one slide with the arrows. A slide opens the viewer, which loads every slide full size so they can
 * be browsed in order. With `grupos`, a toolbar (right on a desktop, above on a phone) filters the slides by group;
 * the viewer then browses only those. `footer(grupo)` sits left of the arrows. `inicial`, a slide's slug, opens the
 * viewer on it; with `ruta`, the address bar follows the slide on view (its own address) and returns when it closes.
 */
export function PostalesCarousel({ base, postales, grupos, label, footer, inicial, ruta }: { base: string; postales: Postal[]; grupos?: GrupoPostal[]; label: string; footer?: (grupo: string | null) => ReactNode; inicial?: string; ruta?: (slug: string) => string }) {
  const row = useRef<HTMLOListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [abierta, setAbierta] = useState<number | null>(() => { const i = postales.findIndex((p) => p.slug === inicial); return i < 0 ? null : i; });
  const [filtro, setFiltro] = useState<string | null>(null);
  const visibles = filtro ? postales.filter((p) => p.grupo === filtro) : postales;
  // Where the address bar returns when the viewer closes: the page it was opened from, or the home page when the
  // visit started on a slide's own address
  const volver = useRef<string | null>(null);
  const slugAbierto = abierta === null ? null : visibles[abierta]?.slug;
  // history.replaceState, not the router: a route change would remount the page and scroll it to the top
  useEffect(() => {
    if (!ruta) return;
    if (slugAbierto) {
      volver.current ??= inicial ? '/' : location.pathname + location.search + location.hash;
      history.replaceState(history.state, '', ruta(slugAbierto));
    } else if (volver.current !== null) {
      history.replaceState(history.state, '', volver.current);
      volver.current = null;
    }
  }, [slugAbierto, ruta, inicial]);

  const filtrar = (id: string | null) => {
    track('laminas_filtro', { grupo: id ?? 'todas' });
    setFiltro(id);
  };
  // A new filter starts the row from its first slide
  useEffect(() => { row.current?.scrollTo({ left: 0 }); update(); }, [filtro]);
  const opener = useRef<HTMLElement | null>(null);

  const update = () => {
    const el = row.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const step = (dir: 1 | -1) => {
    const el = row.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    track('postales_flecha', { direccion: dir > 0 ? 'siguiente' : 'anterior' });
    el.scrollBy({ left: dir * (card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0')), behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  // A plain click opens the viewer; a modified click (new tab, download) keeps the link's own behaviour
  const abrir = (e: MouseEvent<HTMLAnchorElement>, i: number) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    opener.current = e.currentTarget;
    track('visor_abierto', { postal: visibles[i].slug, posicion: numero(visibles[i], i), grupo: filtro ?? 'todas' });
    setAbierta(i);
  };
  const cerrar = () => { setAbierta(null); opener.current?.focus(); };

  const color = (id?: string) => grupos?.find((g) => g.id === id)?.color;

  return (
    <div className={grupos ? 'laminas' : undefined}>
    {grupos ? (
      <div className="laminas-filtros" role="toolbar" aria-label="Filtrar láminas por tema">
        <button type="button" aria-pressed={filtro === null} onClick={() => filtrar(null)}>
          <i className="laminas-swatch is-todas" aria-hidden="true" /><span>Todas</span><span className="laminas-n">{postales.length}</span>
        </button>
        {grupos.map((g) => {
          const n = postales.filter((p) => p.grupo === g.id).length;
          return n ? (
            <button key={g.id} type="button" aria-pressed={filtro === g.id} onClick={() => filtrar(filtro === g.id ? null : g.id)} style={{ ['--g' as string]: g.color }}>
              <i className="laminas-swatch" aria-hidden="true" /><span>{g.nombre}</span><span className="laminas-n">{n}</span>
            </button>
          ) : null;
        })}
      </div>
    ) : null}
    <div className="postales-carrusel">
      <ol className="postales" ref={row} onScroll={update} aria-label={label}>
        {visibles.map((p, i) => (
          <li key={p.slug}>
            <a href={`${base}/${p.slug}.jpg`} target="_blank" rel="noopener" onClick={(e) => abrir(e, i)} aria-label={`${numero(p, i)} de ${postales.length}: ${p.titulo}. Ver en grande`}>
              <ImagenLamina src={`${base}/${p.slug}-540.jpg`} srcSet={`${base}/${p.slug}-540.jpg 540w, ${base}/${p.slug}.jpg 1080w`} alt={p.alt} />
              <span className="postal-pie" style={{ ['--g' as string]: color(p.grupo) }}><span className="num">{numero(p, i)}</span><span className="postal-titulo">{p.titulo}</span></span>
            </a>
          </li>
        ))}
      </ol>
      <div className="postales-foot">
        {footer ? footer(filtro) : null}
        <div className="postales-nav">
          <button type="button" className="postales-arrow" aria-label="Lámina anterior" disabled={edge.start} onClick={() => step(-1)}><Arrow d={PREV} /></button>
          <button type="button" className="postales-arrow" aria-label="Lámina siguiente" disabled={edge.end} onClick={() => step(1)}><Arrow d={NEXT} /></button>
        </div>
      </div>
      {abierta !== null ? <Visor base={base} postales={visibles} total={postales.length} index={abierta} onIndex={setAbierta} onClose={cerrar} /> : null}
    </div>
    </div>
  );
}

/** A card's slide: a loader over a placeholder of the slide's shape until the image arrives, then the image fades in. */
function ImagenLamina({ src, srcSet, alt }: { src: string; srcSet: string; alt: string }) {
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const img = useRef<HTMLImageElement>(null);
  // An image the browser already had can finish before React is listening
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setEstado(el.naturalWidth ? 'lista' : 'error');
  }, [src]);
  return (
    <span className={`postal-img is-${estado}`}>
      <img ref={img} src={src} srcSet={srcSet} sizes="(min-width: 861px) 30vw, 80vw" width={1080} height={1350} loading="lazy" decoding="async" alt={alt}
        onLoad={() => setEstado('lista')} onError={() => setEstado('error')} />
      {estado === 'cargando' ? <span className="postal-cargando"><Spinner label="Cargando lámina" /></span> : null}
      {estado === 'error' ? <span className="postal-cargando postal-error">No se pudo cargar la lámina.<br />Tócala para abrirla.</span> : null}
    </span>
  );
}

const SITIO = 'https://ordena.laciudad.mx';

/** The viewer's slide, hidden behind the loading bars until it has arrived. */
function ImagenVisor({ src, alt }: { src: string; alt: string }) {
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const img = useRef<HTMLImageElement>(null);
  // An image the browser already had can finish before React is listening
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setEstado(el.naturalWidth ? 'lista' : 'error');
  }, [src]);
  return (
    <>
      <img ref={img} className={`is-${estado}`} src={src} width={1080} height={1350} alt={alt} onLoad={() => setEstado('lista')} onError={() => setEstado('error')} />
      {estado === 'cargando' ? <span className="visor-cargando"><Spinner label="Cargando lámina" /></span> : null}
      {estado === 'error' ? <span className="visor-cargando">No se pudo cargar la lámina. <a href={src} target="_blank" rel="noopener">Ábrela aquí ↗</a></span> : null}
    </>
  );
}

const RED = {
  x: <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />,
  facebook: <path fill="currentColor" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />,
  instagram: <g fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></g>,
  tiktok: <path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />,
  whatsapp: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z" />,
  enlace: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
};
const Glifo = ({ red }: { red: keyof typeof RED }) => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">{RED[red]}</svg>;

/** What goes with a shared slide: its title, what it belongs to, where to opine and the tags. */
const pieDe = (p: Postal) => `${p.titulo}\n\nUna lámina sobre el Programa de Ordenación de la Megalópolis que SEDATU tiene en consulta pública. Léelo por temas y manda tu opinión: ${enlaceDe(p)}\n\n#POZMVM #Megalópolis #ConsultaPública`;
// Each slide has its own pre-rendered page whose preview image is the slide, so a shared link shows it
const enlaceDe = (p: Postal) => `${SITIO}/lamina/${p.slug}`;

/**
 * Shares the slide on view. A panel shows the text that goes with it and one button per network. X, Facebook and
 * WhatsApp take the slide's own link, which previews as the slide; Facebook takes no text, so it is copied for pasting. Instagram and TikTok have no web share, so
 * on a phone the slide goes through the system sheet, and on a computer it is downloaded with the text copied and the
 * site opened in a new tab.
 */
function Compartir({ src, postal }: { src: string; postal: Postal }) {
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState('');
  const caja = useRef<HTMLDivElement>(null);
  const archivo = useRef<Promise<File | null> | null>(null);
  const pie = pieDe(postal);
  const corto = `${postal.titulo}. Opina en la consulta del plan de la Megalópolis:`;
  const enlace = enlaceDe(postal);
  const nativo = typeof navigator.share === 'function';

  // The bucket only sends CORS headers when asked and doesn't vary its cache on it, so the plain copy the page already
  // cached can't be read cross-origin; the share fetch uses its own address
  const imagen = () => {
    archivo.current ??= fetch(`${src}?compartir`, { mode: 'cors' }).then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? new File([b], `${postal.slug}.jpg`, { type: 'image/jpeg' }) : null)).catch(() => null);
    return archivo.current;
  };
  // Fetched as the panel opens, so a phone's share sheet opens straight from the tap (Safari drops a slow one)
  useEffect(() => { if (abierto) imagen(); }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  const red = (via: string) => track('visor_compartir', { postal: postal.slug, via });
  const copiar = (texto: string) => navigator.clipboard?.writeText(texto).then(() => true, () => false) ?? Promise.resolve(false);
  const abrir = (url: string) => window.open(url, '_blank', 'noopener');

  const conImagen = async (via: 'instagram' | 'tiktok') => {
    red(via);
    const copiado = await copiar(pie);
    const f = await imagen();
    if (f && nativo && navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], text: pie }); return; } catch (e) { if ((e as DOMException).name === 'AbortError') return; }
    }
    if (f) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(f); a.download = f.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    abrir(via === 'tiktok' ? 'https://www.tiktok.com/upload' : 'https://www.instagram.com/');
    setAviso(`${f ? 'Descargamos la lámina' : 'No pudimos descargar la lámina'}${copiado ? ' y copiamos el texto' : ''}. Súbela en ${via === 'tiktok' ? 'TikTok' : 'Instagram'} y pega el texto.`);
  };
  const facebook = async () => {
    red('facebook');
    const copiado = await copiar(pie);
    abrir(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(enlace)}`);
    if (copiado) setAviso('Copiamos el texto: pégalo en tu publicación.');
  };
  const masOpciones = async () => {
    const f = await imagen();
    try {
      await navigator.share({ title: postal.titulo, text: pie, ...(f && navigator.canShare?.({ files: [f] }) ? { files: [f] } : { url: enlace }) });
      red(f ? 'sistema_imagen' : 'sistema');
    } catch { /* cancelled */ }
  };

  return (
    <div className="visor-share" ref={caja}>
      <button type="button" className="visor-share-btn" aria-expanded={abierto} aria-controls="visor-share-panel" onClick={() => { setAviso(''); setAbierto((v) => !v); }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
        Compartir
      </button>
      {abierto ? (
        <div className="visor-share-panel" id="visor-share-panel" role="group" aria-label="Compartir esta lámina">
          <span className="k">Compartir esta lámina</span>
          <div className="visor-share-redes">
            <a href={`https://x.com/intent/post?text=${encodeURIComponent(corto)}&url=${encodeURIComponent(enlace)}&hashtags=POZMVM`} target="_blank" rel="noopener" onClick={() => red('x')}><Glifo red="x" />X</a>
            <button type="button" onClick={facebook}><Glifo red="facebook" />Facebook</button>
            <button type="button" onClick={() => conImagen('instagram')}><Glifo red="instagram" />Instagram</button>
            <button type="button" onClick={() => conImagen('tiktok')}><Glifo red="tiktok" />TikTok</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(pie)}`} target="_blank" rel="noopener" onClick={() => red('whatsapp')}><Glifo red="whatsapp" />WhatsApp</a>
            <button type="button" onClick={async () => { if (await copiar(enlace)) { red('copiar_enlace'); setAviso('Enlace copiado.'); } }}><Glifo red="enlace" />Copiar enlace</button>
          </div>
          <div className="visor-share-pie">
            <span className="k">El texto que la acompaña</span>
            <p>{pie}</p>
            <div className="visor-share-acciones">
              <button type="button" onClick={async () => { if (await copiar(pie)) { red('copiar_texto'); setAviso('Texto copiado.'); } }}>Copiar texto</button>
              {nativo ? <button type="button" onClick={masOpciones}>Más opciones…</button> : null}
            </div>
          </div>
          <p className="visor-share-aviso" role="status">{aviso}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Full-screen viewer: one slide at a time in order, with arrows, keys, swipe and a strip of thumbnails. */
function Visor({ base, postales, total, index, onIndex, onClose }: { base: string; postales: Postal[]; total: number; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const n = postales.length;
  const p = postales[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const thumbs = useRef<HTMLOListElement>(null);
  const vistas = useRef(new Set<number>([index]));
  const x0 = useRef<number | null>(null);

  const ir = (i: number, via: string) => {
    const to = (i + n) % n;
    vistas.current.add(to);
    track('visor_nav', { postal: postales[to].slug, posicion: numero(postales[to], to), via });
    onIndex(to);
  };
  const salir = (via: string) => { track('visor_cerrado', { vistas: vistas.current.size, via }); onClose(); };

  // Every slide full size as soon as the viewer opens, so moving between them is instant
  useEffect(() => { postales.forEach((s) => { const img = new Image(); img.src = `${base}/${s.slug}.jpg`; }); }, [base, postales]);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const latest = useRef({ index, ir, salir });
  latest.current = { index, ir, salir };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { index: i, ir: go, salir: out } = latest.current;
      if (e.key === 'Escape') out('escape');
      else if (e.key === 'ArrowRight') go(i + 1, 'teclado');
      else if (e.key === 'ArrowLeft') go(i - 1, 'teclado');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Keep the current thumbnail in view
  useEffect(() => {
    const t = thumbs.current?.children[index] as HTMLElement | undefined;
    t?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [index]);

  return (
    <div className="visor" role="dialog" aria-modal="true" aria-label={`Láminas: ${index + 1} de ${n}`}>
      <div className="visor-bar">
        <span className="visor-count num" aria-live="polite">{index + 1} / {n}</span>
        <span className="visor-title"><span className="visor-num">{numero(p, index)}/{total}</span>{p.titulo}</span>
        <Compartir key={p.slug} src={`${base}/${p.slug}.jpg`} postal={p} />
        <button ref={closeRef} type="button" className="visor-close" aria-label="Cerrar" onClick={() => salir('boton')}>✕</button>
      </div>
      <div
        className="visor-stage"
        onClick={(e) => { if (e.target === e.currentTarget) salir('fondo'); }}
        onTouchStart={(e) => { x0.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (x0.current === null) return;
          const dx = e.changedTouches[0].clientX - x0.current; x0.current = null;
          if (Math.abs(dx) > 48) ir(index + (dx < 0 ? 1 : -1), 'deslizar');
        }}
      >
        <button type="button" className="visor-arrow is-prev" aria-label="Lámina anterior" onClick={() => ir(index - 1, 'flecha')}><Arrow d={PREV} size={24} /></button>
        <ImagenVisor key={p.slug} src={`${base}/${p.slug}.jpg`} alt={p.alt} />
        <button type="button" className="visor-arrow is-next" aria-label="Lámina siguiente" onClick={() => ir(index + 1, 'flecha')}><Arrow d={NEXT} size={24} /></button>
      </div>
      <ol className="visor-thumbs" ref={thumbs} aria-label="Todas las láminas">
        {postales.map((s, i) => (
          <li key={s.slug}>
            <button type="button" aria-current={i === index ? 'true' : undefined} aria-label={`${numero(s, i)}: ${s.titulo}`} onClick={() => ir(i, 'miniatura')}>
              <img src={`${base}/${s.slug}-540.jpg`} width={54} height={68} alt="" />
              <span className="num">{numero(s, i)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
