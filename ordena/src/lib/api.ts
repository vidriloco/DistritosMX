const BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface Cita { texto: string; pagina: number; clave?: string; cita?: string }
export interface Opcion { valor: string; etiqueta: string; opinion: string }
export interface Pregunta { slug: string; texto: string; corto: string; opciones: Opcion[] }
export interface AreaResumen { slug: string; titulo: string; icono: string; resumen: string; num_preguntas: number; pregunta_slugs: string[] }
export interface Area extends AreaResumen { diagnostico: Cita[]; propuestas: Cita[]; preguntas: Pregunta[] }
export interface Consulta {
  nombre: string; inicio: string; cierre: string; correo: string; sitio: string;
  pagina_consulta: string; pagina_eventos: string; documento: string; alcance: string;
  estructura: { capitulo: string; pagina: number }[];
}
export interface Borrador {
  texto: string;
  areas: Record<string, { titulo: string; frases: string[]; libre: string }>;
  consulta: Consulta;
}
export interface Resultados {
  /** Real answers plus the starting sample while it is on; `reales` alone; `muestra` the sample (0 when off). */
  respuestas: number;
  reales: number;
  muestra: number;
  areas: { slug: string; titulo: string; participantes: number }[];
  preguntas: { pregunta: string; texto: string; area: string; total: number; opciones: { valor: string; etiqueta: string; n: number }[] }[];
}
export interface Efecto { kicker: string; titulo: string; texto: string; pagina: string; tono: 'alto' | 'medio' | 'bajo' }
export interface Financiamiento {
  fuentes: { nombre: string; detalle: string; pagina: number; tipo: 'existente' | 'nuevo' | 'reforma'; slug?: string }[];
  destinos: { nombre: string; pagina: number; cita?: string }[];
  perfiles: { id: string; label: string; corto: string }[];
  efectos: Record<string, Efecto[]>;
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

export const api = {
  consulta: () => get<Consulta>('/consulta/'),
  areas: () => get<{ areas: AreaResumen[] }>('/areas/').then((d) => d.areas),
  area: (slug: string) => get<Area>(`/areas/${slug}/`),
  resultados: () => get<Resultados>('/resultados/'),
  financiamiento: () => get<Financiamiento>('/financiamiento/'),
  opinion: async (body: { elecciones: Record<string, string>; comentarios: Record<string, string>; municipio: string; firma?: { nombre: string; colonia: string; estado: string } }) => {
    const r = await fetch(`${BASE}/opinion/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${r.status} opinion`);
    return r.json() as Promise<Borrador>;
  },
  /** A browser's current answers for the public count (a JSON body built by `respuestas`). */
  respuesta: (body: string, keepalive = false) =>
    fetch(`${BASE}/respuesta/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive }).then((r) => r.ok),
};

/** Link to a page of the consultation PDF. */
export const pdfPage = (c: Consulta | null, p: number) => (c ? `${c.documento}#page=${p}` : '#');
