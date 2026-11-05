/** One color per topic, shared with the hero slides and the results page. */
export const TOPIC_COLOR: Record<string, { bg: string; soft: string }> = {
  agua: { bg: '#0b7a75', soft: '#7fd9cf' }, movilidad: { bg: '#c2531f', soft: '#f3b48c' }, vivienda: { bg: '#5b2bd6', soft: '#c9b8ff' },
  'medio-ambiente': { bg: '#3a1486', soft: '#9b7bff' }, riesgos: { bg: '#8a6d00', soft: '#f5d547' }, proximidad: { bg: '#1e0f33', soft: '#9b7bff' },
  campo: { bg: '#2f6b1f', soft: '#a9d98f' }, gobernanza: { bg: '#4a3f5c', soft: '#d9d0ea' }, 'quien-paga': { bg: '#c8102e', soft: '#f5a3a3' },
};

/** Short topic names for tight places (the topic map on /mi-opinion). */
export const TOPIC_SHORT: Record<string, string> = {
  agua: 'Agua', movilidad: 'Movilidad', vivienda: 'Vivienda y suelo', 'medio-ambiente': 'Bosques, aire y residuos', riesgos: 'Riesgos',
  proximidad: 'Empleo y servicios', campo: 'Campo y pueblos', gobernanza: 'Quién decide', 'quien-paga': '¿Quién paga?',
};

export const TOPIC_ICON: Record<string, string> = { agua: 'M4 14c2-3 3-6 8-9 5 3 6 6 8 9a8 8 0 0 1-16 0z', movilidad: 'M4 16V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8l-2 2H6zM7 11h10M7 20v-2M17 20v-2', vivienda: 'M3 11l9-7 9 7v9H3zM10 20v-6h4v6', 'medio-ambiente': 'M12 2.5l-5 7h3l-4.5 6.5h13L14 9.5h3zM12 16v5M8 21h8', riesgos: 'M12 3l10 18H2zM12 10v5M12 18v.5', proximidad: 'M12 21s-6-5-6-10a6 6 0 0 1 12 0c0 5-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', campo: 'M3 21h18M5 17.5h14M12 15V8M12 11.5c-3.2 0-5.5-2.2-5.5-5.5 3.2 0 5.5 2.2 5.5 5.5zM12 10c0-3.3 2.3-5.5 5.5-5.5 0 3.3-2.3 5.5-5.5 5.5z', gobernanza: 'M3 10l9-6 9 6H3zM5 10v8M9 10v8M15 10v8M19 10v8M3 18h18', 'quien-paga': 'M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8' };
