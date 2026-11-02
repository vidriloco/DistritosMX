import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import type { Ref } from './DocViewer';
import { Spinner } from './Loading';
import { track } from '../lib/analytics';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const DOC_URL = '/docs/pozmvm.pdf';
let cached: Promise<PDFDocumentProxy> | null = null;
const getDoc = () => (cached ??= pdfjs.getDocument({ url: DOC_URL, cMapUrl: undefined }).promise);

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');

/** Full-screen panel: one PDF page rendered to canvas, the cited passage highlighted on top of it. */
export function PdfPanel({ ref, onClose }: { ref: Ref; onClose: () => void }) {
  const [page, setPage] = useState(ref.pagina);
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [hallado, setHallado] = useState<boolean | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const vistas = useRef(new Set<number>());
  const pageNow = useRef(page); pageNow.current = page; vistas.current.add(page);
  const cerrar = (via: string) => { track('documento_cerrado', { pagina: pageNow.current, inicial: ref.pagina, paginas_vistas: vistas.current.size, via }); onClose(); };
  const cerrarRef = useRef(cerrar); cerrarRef.current = cerrar;

  useEffect(() => { setPage(ref.pagina); }, [ref]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrarRef.current('escape'); };
    document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  useEffect(() => {
    let cancel = false;
    setEstado('cargando'); setHallado(null);
    (async () => {
      try {
        const doc = await getDoc(); if (cancel) return;
        setTotal(doc.numPages);
        const p = await doc.getPage(page);
        const width = Math.min(scroller.current?.clientWidth ?? 390, 900) - 0;
        const base = p.getViewport({ scale: 1 });
        const scale = width / base.width;
        const vp = p.getViewport({ scale });
        const c = canvas.current!; const dpr = window.devicePixelRatio || 1;
        c.width = vp.width * dpr; c.height = vp.height * dpr; c.style.width = `${vp.width}px`; c.style.height = `${vp.height}px`;
        const ctx = c.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await p.render({ canvasContext: ctx, viewport: vp }).promise; if (cancel) return;
        // highlight: find the passage among the text items of the page
        const l = layer.current!; l.innerHTML = ''; l.style.width = `${vp.width}px`; l.style.height = `${vp.height}px`;
        if (page === ref.pagina && ref.cita) {
          const tc = await p.getTextContent();
          const items = (tc.items as { str: string; transform: number[]; width: number; height: number }[]).filter((i) => i.str.trim());
          // Compare letters and digits only, so bullets, superscripts and odd spacing in the PDF never break the match.
          const key = (t: string) => norm(t).replace(/[^a-z0-9]/g, '');
          const starts: number[] = []; let pageText = '';
          for (const it of items) { starts.push(pageText.length); pageText += key(it.str); }
          const target = key(ref.cita);
          let at = pageText.indexOf(target);
          let len = target.length;
          for (const n of [80, 50, 30]) { if (at >= 0) break; const probe = target.slice(0, n); at = pageText.indexOf(probe); len = probe.length; }
          let marked = 0;
          if (at >= 0) {
            const to = at + len;
            items.forEach((it, i) => {
              const s0 = starts[i], s1 = s0 + key(it.str).length;
              if (s1 <= at || s0 >= to) return;
              const [, , , d, e, f] = it.transform; const h = Math.abs(d) || it.height;
              const [x, y] = vp.convertToViewportPoint(e, f);
              const box = document.createElement('i');
              box.style.left = `${x}px`; box.style.top = `${y - h * scale}px`; box.style.width = `${it.width * scale}px`; box.style.height = `${h * scale * 1.15}px`;
              l.appendChild(box); marked++;
            });
          }
          setHallado(marked > 0);
          if (!marked) track('pasaje_no_encontrado', { pagina: page });
          const first = l.firstElementChild as HTMLElement | null;
          if (first && scroller.current) scroller.current.scrollTo({ top: Math.max(0, first.offsetTop - 120), behavior: 'smooth' });
        }
        setEstado('listo');
      } catch (e) { console.error(e); if (!cancel) { setEstado('error'); track('documento_error', { pagina: page }); } }
    })();
    return () => { cancel = true; };
  }, [page, ref]);

  return (
    <div className="doc" role="dialog" aria-modal="true" aria-label="Documento en consulta">
      <div className="doc-bar">
        <button type="button" className="doc-close" onClick={() => cerrar('boton')} aria-label="Cerrar">✕</button>
        <span className="doc-title"><strong>POZMVM</strong> · página {page}{total ? ` de ${total}` : ''}</span>
        <span className="doc-nav"><button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => { track('documento_pagina', { pagina: page - 1, direccion: 'anterior' }); setPage(page - 1); }}>‹</button><button type="button" aria-label="Página siguiente" disabled={!!total && page >= total} onClick={() => { track('documento_pagina', { pagina: page + 1, direccion: 'siguiente' }); setPage(page + 1); }}>›</button></span>
      </div>
      {ref.cita ? <div className="doc-cita"><span className="k">{page === ref.pagina ? (hallado === false ? 'Pasaje citado (no se pudo resaltar)' : 'Pasaje citado') : `Pasaje citado en la página ${ref.pagina}`}</span><span>«{ref.cita}»</span></div> : null}
      <div className="doc-scroll" ref={scroller}>
        <div className="doc-page">
          <canvas ref={canvas} />
          <div className="doc-layer" ref={layer} aria-hidden="true" />
          {estado === 'cargando' ? <div className="doc-loading"><Spinner label="Cargando la página" /></div> : null}
          {estado === 'error' ? <div className="doc-loading">No se pudo cargar el documento. <a href={DOC_URL} target="_blank" rel="noreferrer" onClick={() => track('documento_pdf_completo', { pagina: page, tras_error: true })}>Abrir el PDF</a></div> : null}
        </div>
      </div>
      <a className="doc-ext" href={`${DOC_URL}#page=${page}`} target="_blank" rel="noreferrer" onClick={() => track('documento_pdf_completo', { pagina: page })}>Abrir el PDF completo ↗</a>
    </div>
  );
}
