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
 * the viewer then browses only those. `footer(grupo)` sits left of the arrows.
 */
export function PostalesCarousel({ base, postales, grupos, label, footer }: { base: string; postales: Postal[]; grupos?: GrupoPostal[]; label: string; footer?: (grupo: string | null) => ReactNode }) {
  const row = useRef<HTMLOListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [abierta, setAbierta] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const visibles = filtro ? postales.filter((p) => p.grupo === filtro) : postales;

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

/**
 * Shares the slide on view. Where the browser can share files (phones, Safari) the image itself goes with the text and
 * link; elsewhere a small menu offers WhatsApp, X, Facebook or copying the link.
 */
function Compartir({ src, postal }: { src: string; postal: Postal }) {
  const [menu, setMenu] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const archivo = useRef<File | null>(null);
  const texto = `${postal.titulo}. Lee el plan del Valle de México por temas y opina en la consulta pública:`;
  const puedeArchivos = typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'x.jpg', { type: 'image/jpeg' })] });

  // Fetched ahead, so the share sheet opens straight from the tap (Safari drops a share started after a slow await)
  useEffect(() => {
    if (!puedeArchivos) return;
    let vivo = true;
    fetch(src, { mode: 'cors' }).then((r) => (r.ok ? r.blob() : null)).then((b) => {
      if (vivo && b) archivo.current = new File([b], `${postal.slug}.jpg`, { type: 'image/jpeg' });
    }).catch(() => {});
    return () => { vivo = false; };
  }, [src, postal.slug, puedeArchivos]);

  const compartir = async () => {
    const files = archivo.current ? [archivo.current] : undefined;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: postal.titulo, text: texto, url: SITIO, ...(files && navigator.canShare({ files }) ? { files } : {}) });
        track('visor_compartir', { postal: postal.slug, via: files ? 'imagen' : 'enlace' });
      } catch (e) {
        if ((e as DOMException).name !== 'AbortError') setMenu(true);
      }
      return;
    }
    setMenu((m) => !m);
  };
  const red = (via: string) => track('visor_compartir', { postal: postal.slug, via });
  const copiar = async () => {
    try { await navigator.clipboard.writeText(`${texto} ${SITIO}`); setCopiado(true); red('copiar'); setTimeout(() => setCopiado(false), 1800); } catch { /* the menu stays open */ }
  };
  const msg = encodeURIComponent(`${texto} ${SITIO}`);

  return (
    <div className="visor-share">
      <button type="button" className="visor-share-btn" aria-expanded={menu} onClick={compartir}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
        Compartir
      </button>
      {menu ? (
        <div className="visor-share-menu">
          <a href={`https://wa.me/?text=${msg}`} target="_blank" rel="noopener" onClick={() => red('whatsapp')}>WhatsApp</a>
          <a href={`https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(SITIO)}`} target="_blank" rel="noopener" onClick={() => red('x')}>X</a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITIO)}`} target="_blank" rel="noopener" onClick={() => red('facebook')}>Facebook</a>
          <button type="button" onClick={copiar}>{copiado ? 'Enlace copiado' : 'Copiar enlace'}</button>
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
  useEffect(() => { postales.forEach((s) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.src = `${base}/${s.slug}.jpg`; }); }, [base, postales]);

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
        <img key={p.slug} src={`${base}/${p.slug}.jpg`} crossOrigin="anonymous" width={1080} height={1350} alt={p.alt} />
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
