/**
 * The POZMVM social carousel (23 slides, 1080×1350), rendered from its Claude Design canvas
 * (https://claude.ai/artifact/CkM6Avcf5uzWQuXF3dVsCy) and served from S3 as <slug>.jpg and <slug>-540.jpg.
 * Slides keep the canvas's order; each belongs to the colour group of the label in its top corner.
 */

export const LAMINAS_BASE = 'https://distritosmexico.s3.us-east-2.amazonaws.com/projects/ordena/postales/pozmvm';

export interface Grupo { id: string; nombre: string; color: string; tema: string; cta: string }
export interface Lamina { slug: string; grupo: string; titulo: string; alt: string }

// `tema` and `cta`: where the section's button leads, and what it says, while the group is selected
export const GRUPOS: Grupo[] = [
  { id: 'consulta', nombre: 'Consulta pública', color: '#3AA597', tema: '/temas', cta: 'Empezar a opinar' },
  { id: 'predial', nombre: 'Predial', color: '#2347C8', tema: '/quien-paga', cta: 'Opinar sobre quién paga' },
  { id: 'vivienda', nombre: 'Vivienda y suelo', color: '#C2410C', tema: '/area/vivienda', cta: 'Opinar sobre vivienda' },
  { id: 'mundo', nombre: 'Comparación internacional', color: '#111317', tema: '/quien-paga', cta: 'Opinar sobre quién paga' },
  { id: 'movilidad', nombre: 'Movilidad', color: '#0F766E', tema: '/area/movilidad', cta: 'Opinar sobre movilidad' },
  { id: 'proyectos', nombre: 'Proyectos de transporte', color: '#0B5D56', tema: '/area/movilidad', cta: 'Opinar sobre movilidad' },
];

export const LAMINAS: Lamina[] = [
  { slug: '01-portada', grupo: 'consulta', titulo: 'Predial, vivienda y transporte: el plan de ordenación de la ZMVM', alt: 'Consulta pública: Predial, vivienda y transporte: el plan de ordenación de la ZMVM' },
  { slug: '02-predial-fases', grupo: 'predial', titulo: 'Predial: cobrar mejor y gravar el suelo ocioso', alt: '1 · Predial: Predial: cobrar mejor y gravar el suelo ocioso' },
  { slug: '03-predial-uso', grupo: 'predial', titulo: '¿Cómo se usará lo recaudado?', alt: '1 · Predial: ¿Cómo se usará lo recaudado?' },
  { slug: '04-vivienda-precio', grupo: 'vivienda', titulo: 'El suelo céntrico cuesta hasta 53 veces más', alt: '2 · Vivienda: El suelo céntrico cuesta hasta 53 veces más' },
  { slug: '05-vivienda-abandono', grupo: 'vivienda', titulo: 'Casas vacías lejos, casas imposibles cerca', alt: '2 · Vivienda: Casas vacías lejos, casas imposibles cerca' },
  { slug: '06-vivienda-instrumentos', grupo: 'vivienda', titulo: 'Cómo quiere bajar el precio del suelo', alt: '2 · Vivienda: Cómo quiere bajar el precio del suelo' },
  { slug: '07-mundo-predial', grupo: 'mundo', titulo: '¿Ya existe en otros países? Sí, por piezas', alt: 'Comparación internacional · Predial: ¿Ya existe en otros países? Sí, por piezas' },
  { slug: '08-mundo-plusvalia', grupo: 'mundo', titulo: 'Cobrar la plusvalía: ya lo hacen Colombia y Brasil', alt: 'Comparación internacional · Plusvalía: Cobrar la plusvalía: ya lo hacen Colombia y Brasil' },
  { slug: '09-movilidad-flujos', grupo: 'movilidad', titulo: 'Por la mañana, la periferia sale y el centro recibe', alt: '3 · Movilidad: Por la mañana, la periferia sale y el centro recibe' },
  { slug: '10-movilidad-red', grupo: 'movilidad', titulo: '74% de los viajes en transporte público van en micro o combi', alt: '3 · Movilidad: 74% de los viajes en transporte público van en micro o combi' },
  { slug: '11-movilidad-dinero', grupo: 'movilidad', titulo: '¿De dónde saldría el dinero?', alt: '3 · Movilidad: ¿De dónde saldría el dinero?' },
  { slug: '12-movilidad-proyectos', grupo: 'movilidad', titulo: 'Qué transporte se financiaría', alt: '3 · Movilidad: Qué transporte se financiaría' },
  { slug: '13-movilidad-calendario', grupo: 'movilidad', titulo: 'Calendario: ¿cuándo llegaría cada cosa?', alt: '3 · Movilidad: Calendario: ¿cuándo llegaría cada cosa?' },
  { slug: '14-movilidad-metas', grupo: 'movilidad', titulo: 'La promesa: la mitad del tiempo de traslado', alt: '3 · Movilidad: La promesa: la mitad del tiempo de traslado' },
  { slug: '15-trenes', grupo: 'proyectos', titulo: '5 líneas de tren a 12 estados, aún sin nombre', alt: '3 · MP1-1.2 · Sistema Integrado de Transporte Ferroviario Interurbano y Regional para la Conectividad Metropolitana y Macrorregional: 5 líneas de tren a 12 estados, aún sin nombre' },
  { slug: '16-mp111-centralidades', grupo: 'proyectos', titulo: '8 de 18 centralidades del Edomex e Hidalgo no tienen ni una línea de transporte masivo', alt: '3 · MP1-1.1 · Sistema Integrado de Transporte Metropolitano Masivo, de Alta y Mediana Capacidad: 8 de 18 centralidades del Edomex e Hidalgo no tienen ni una línea de transporte masivo' },
  { slug: '17-mp111-accesos', grupo: 'proyectos', titulo: 'Escuelas y hospitales a una caminata del transporte', alt: '3 · MP1-1.1 · Sistema Integrado de Transporte Metropolitano Masivo, de Alta y Mediana Capacidad: Escuelas y hospitales a una caminata del transporte' },
  { slug: '18-rc521-nodos', grupo: 'vivienda', titulo: '4 nodos priorizados; los 2 más saturados, fuera', alt: '3 · RC5-2.1 · Reordenación urbana de las zonas aledañas a estaciones ferroviarias, CETRAMs y estaciones de transporte masivo y alta capacidad: 4 nodos priorizados; los 2 más saturados, fuera' },
  { slug: '19-rc521-entornos', grupo: 'vivienda', titulo: 'Qué cambiaría alrededor de las estaciones', alt: '3 · RC5-2.1 · Reordenación urbana de las zonas aledañas a estaciones ferroviarias, CETRAMs y estaciones de transporte masivo y alta capacidad: Qué cambiaría alrededor de las estaciones' },
  { slug: '20-monitoreo', grupo: 'proyectos', titulo: 'Monitorear el transporte… ¿y abrir los datos?', alt: '3 · MP5-2.1 · Esquema Metropolitano de Monitoreo Operativo del Sistema de Transporte Público: Monitorear el transporte… ¿y abrir los datos?' },
  { slug: '21-mp431-mapa', grupo: 'proyectos', titulo: 'Cuando llueve, ¿quién mueve a la gente?', alt: '3 · MP4-3.1 · Protocolo Metropolitano de Movilidad en Contingencias Climáticas y de Emergencia: Cuando llueve, ¿quién mueve a la gente?' },
  { slug: '22-mp431-protocolo', grupo: 'proyectos', titulo: 'Un protocolo para cuando llueve', alt: '3 · MP4-3.1 · Protocolo Metropolitano de Movilidad en Contingencias Climáticas y de Emergencia: Un protocolo para cuando llueve' },
  { slug: '23-cierre', grupo: 'consulta', titulo: 'Opina antes del 22 de noviembre', alt: 'Consulta pública: Opina antes del 22 de noviembre' },
];
