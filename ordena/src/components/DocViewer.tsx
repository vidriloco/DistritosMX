import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { track } from '../lib/analytics';

export interface Ref { pagina: number; cita?: string; titulo?: string; origen?: string }
const Ctx = createContext<(r: Ref) => void>(() => {});
const PdfPanel = lazy(() => import('./PdfPanel').then((m) => ({ default: m.PdfPanel })));

/** Opens the consultation PDF inside the app at a page, with the quoted passage highlighted. */
export function DocViewerProvider({ children }: { children: ReactNode }) {
  const [ref, setRef] = useState<Ref | null>(null);
  const abrir = useCallback((r: Ref) => { setRef(r); track('documento_abierto', { pagina: r.pagina, con_pasaje: !!r.cita, origen: r.origen }); }, []);
  const value = useMemo(() => abrir, [abrir]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {ref ? <Suspense fallback={<div className="doc-loading" role="status">Abriendo el documento…</div>}><PdfPanel ref={ref} onClose={() => setRef(null)} /></Suspense> : null}
    </Ctx.Provider>
  );
}

export const useDocViewer = () => useContext(Ctx);

/** A page link: "p. 57" that opens the viewer. Falls back to the plain label when no page. */
export function CitaLink({ pagina, cita, titulo, origen, className = 'pg', children }: Ref & { className?: string; children?: ReactNode }) {
  const abrir = useDocViewer();
  return (
    <button type="button" className={className} onClick={() => abrir({ pagina, cita, titulo, origen })} title={cita ? 'Ver el pasaje en el documento' : 'Ver la página en el documento'}>
      {children ?? `p. ${pagina}`}
    </button>
  );
}
