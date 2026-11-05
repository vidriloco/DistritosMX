import { useCallback, useSyncExternalStore } from 'react';
import { api } from './api';
import { track } from './analytics';

/**
 * The citizen's answers, kept in the browser so they survive a reload and a closed tab, and sent anonymously to the
 * public count as they change. The signature never leaves the browser except inside the letter the citizen sends.
 */
export interface Respuestas {
  elecciones: Record<string, string>;
  comentarios: Record<string, string>;
  municipio: string;
  firma: { nombre: string; colonia: string; estado: string };
}

/** The "No sé / no tengo opinión" answer: it counts as answered but adds nothing to the letter or the results. */
export const NO_SE = 'no-se';

/** How many answers carry an opinion, i.e. the points the letter will have. */
export const conOpinion = (elecciones: Record<string, string>) => Object.values(elecciones).filter((v) => v !== NO_SE).length;

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
  programar();
}

// ---- the public count ------------------------------------------------------
// A random id this browser makes for itself, so its later changes replace what it sent instead of adding to it.
const VISITANTE_KEY = 'pozmvm.visitante';
const ENVIADO_KEY = 'pozmvm.enviado';
let visitanteEnMemoria: string | null = null;

function nuevoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function visitante(): string {
  try {
    let id = localStorage.getItem(VISITANTE_KEY);
    if (!id) { id = nuevoId(); localStorage.setItem(VISITANTE_KEY, id); }
    return id;
  } catch {
    visitanteEnMemoria ??= nuevoId();
    return visitanteEnMemoria;
  }
}

let pendiente: string | null = null;
let espera: ReturnType<typeof setTimeout> | undefined;

function ultimoEnviado(): string | null {
  try { return localStorage.getItem(ENVIADO_KEY); } catch { return null; }
}

// Sent a moment after the last change, so a run of answers (or a comment being typed) goes as one request.
function programar() {
  const s = read();
  const body = JSON.stringify({ visitante: visitante(), elecciones: s.elecciones, comentarios: s.comentarios, municipio: s.municipio });
  const ultimo = ultimoEnviado();
  const vacio = Object.keys(s.elecciones).length === 0 && !Object.values(s.comentarios).some((t) => t.trim());
  if (body === ultimo || (vacio && ultimo === null)) { pendiente = null; clearTimeout(espera); return; }
  pendiente = body;
  clearTimeout(espera);
  espera = setTimeout(() => enviar(false), 1500);
}

function enviar(keepalive: boolean) {
  if (pendiente === null) return;
  const body = pendiente;
  pendiente = null;
  clearTimeout(espera);
  api.respuesta(body, keepalive).then((ok) => {
    if (ok) { try { localStorage.setItem(ENVIADO_KEY, body); } catch { /* private mode */ } }
  }).catch(() => { /* offline: the next change, or the next visit, sends it again */ });
}

/** Starts the count once per page: sends answers given before (or not sent yet), and flushes on leaving the page. */
export function iniciarConteo() {
  programar();
  const salir = () => enviar(true);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') salir(); });
  window.addEventListener('pagehide', salir);
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
