import { useCallback, useSyncExternalStore } from 'react';
import { track } from './analytics';

/** The citizen's answers, kept in the browser so they survive a reload and a closed tab. */
export interface Respuestas {
  elecciones: Record<string, string>;
  comentarios: Record<string, string>;
  municipio: string;
  firma: { nombre: string; colonia: string; estado: string };
}

const KEY = 'pozmvm.respuestas.v1';
const EMPTY: Respuestas = { elecciones: {}, comentarios: {}, municipio: '', firma: { nombre: '', colonia: '', estado: '' } };
const listeners = new Set<() => void>();
let cache: Respuestas | null = null;

function read(): Respuestas {
  if (cache) return cache;
  let loaded: Respuestas = EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const j = JSON.parse(raw); loaded = { ...EMPTY, ...j, firma: { ...EMPTY.firma, ...(j.firma ?? {}) } }; }
  } catch {
    loaded = EMPTY;
  }
  cache = loaded;
  return loaded;
}

function write(next: Respuestas) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: keep in memory */ }
  listeners.forEach((l) => l());
}

export function useRespuestas() {
  const state = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, read);
  const elegir = useCallback((pregunta: string, valor: string, tema?: string) => {
    const s = read();
    const elecciones = { ...s.elecciones };
    if (elecciones[pregunta] === valor) { delete elecciones[pregunta]; track('respuesta_quitada', { pregunta, tema }); } else { const cambio = !!elecciones[pregunta]; elecciones[pregunta] = valor; track('respuesta', { pregunta, opcion: valor, tema, cambio, total: Object.keys(elecciones).length }); }
    write({ ...s, elecciones });
  }, []);
  const comentar = useCallback((area: string, texto: string) => {
    const s = read();
    write({ ...s, comentarios: { ...s.comentarios, [area]: texto } });
  }, []);
  const setMunicipio = useCallback((municipio: string) => write({ ...read(), municipio }), []);
  const setFirma = useCallback((parte: Partial<Respuestas['firma']>) => { const s = read(); write({ ...s, firma: { ...s.firma, ...parte } }); }, []);
  const limpiar = useCallback(() => { track('respuestas_borradas', { puntos: Object.keys(read().elecciones).length }); write(EMPTY); }, []);
  return { ...state, elegir, comentar, setMunicipio, setFirma, limpiar };
}
