/** The five topics the hero shows, with the figure each one leads with. Pages refer to the consultation PDF. */
export interface Slide {
  slug: string; tema: string; corto: string; cifra: string; etiqueta: string; etiquetaCorta: string; pagina: string; pregunta: string; preguntaCorta: string; pista: string;
  bg: string; ink: string; soft: string;
  grafico: { kind: 'dots'; total: number; lit: number } | { kind: 'bars'; bars: number; highlight: number } | { kind: 'houses'; total: number; filled: number } | { kind: 'pile'; layers: number } | { kind: 'rain' } | { kind: 'calendar'; total: number; left: number };
}
export const SLIDES: Slide[] = [
  { slug: 'agua', tema: 'Agua y ciudad esponja', corto: 'agua', cifra: '<1 %', etiqueta: 'de las aguas residuales de la metrópoli llega a una planta de tratamiento', etiquetaCorta: 'del agua residual se trata', pagina: 'p. 33', pregunta: '¿Qué debería atenderse primero: fugas, cobertura, tratamiento o recarga del acuífero?', preguntaCorta: '¿Qué arreglar primero con el agua?', pista: 'Fugas, cobertura, tratamiento o recarga del acuífero. Elige y te damos la frase para la consulta.', bg: '#0b7a75', ink: '#f3f1ec', soft: '#7fd9cf', grafico: { kind: 'dots', total: 100, lit: 99 } },
  { slug: 'movilidad', tema: 'Movilidad y transporte', corto: 'movilidad', cifra: '4 h', etiqueta: 'al día en traslados para quien vive en la periferia; 74 % de los viajes van en micro o combi', etiquetaCorta: 'al día en traslados desde la periferia', pagina: 'pp. 50 y 52', pregunta: '¿Dónde debería ir primero la inversión: metro y tren, ordenar micros, banquetas o carreteras?', preguntaCorta: '¿Dónde invertir primero en transporte?', pista: 'Metro y tren a la periferia, ordenar micros, banquetas o carreteras. Elige y te damos la frase para la consulta.', bg: '#c2531f', ink: '#f3f1ec', soft: '#f3b48c', grafico: { kind: 'bars', bars: 24, highlight: 4 } },
  { slug: 'vivienda', tema: 'Vivienda y suelo', corto: 'vivienda', cifra: '77 %', etiqueta: 'de la vivienda abandonada está en Zumpango, Tecámac y Huehuetoca', etiquetaCorta: 'de la vivienda abandonada está en 3 municipios', pagina: 'p. 57', pregunta: '¿Dónde construir la vivienda nueva: en el centro, recuperando la abandonada o en la periferia con servicios?', preguntaCorta: '¿Dónde construir la vivienda nueva?', pista: 'En el centro, recuperando la abandonada o en la periferia con servicios. Elige y te damos la frase.', bg: '#1e0f33', ink: '#f3f1ec', soft: '#f3f1ec', grafico: { kind: 'houses', total: 13, filled: 10 } },
  { slug: 'medio-ambiente', tema: 'Bosques, aire y residuos', corto: 'residuos', cifra: '25 mil', etiqueta: 'toneladas de basura al día, que terminan en municipios periféricos', etiquetaCorta: 'toneladas de basura al día', pagina: 'p. 29', pregunta: '¿Separarías residuos en casa si hubiera recolección diferenciada y un centro de reciclaje cerca?', preguntaCorta: '¿Separarías la basura en casa?', pista: 'Sí, sí con incentivo, o la responsabilidad es de la industria. Elige y te damos la frase.', bg: '#f5d547', ink: '#1e0f33', soft: '#1e0f33', grafico: { kind: 'pile', layers: 11 } },
  { slug: 'riesgos', tema: 'Riesgos y resiliencia', corto: 'riesgos', cifra: 'Nº 1', etiqueta: 'proyecto prioritario del plan: un sistema de alerta temprana metropolitano', etiquetaCorta: 'prioridad del plan: alerta temprana', pagina: 'p. 120', pregunta: '¿Qué hacer con las viviendas en zonas de alto riesgo: mitigar, reubicar o primero un atlas público?', preguntaCorta: '¿Qué hacer con las casas en zonas de riesgo?', pista: 'Mitigar, reubicar con vivienda digna o primero un atlas público. Elige y te damos la frase.', bg: '#f3f1ec', ink: '#1e0f33', soft: '#1e0f33', grafico: { kind: 'rain' } },
];

/** Slide 0: the consultation itself, with the days left computed from the closing date. */
export function introSlide(inicio = '2026-09-24', cierre = '2026-11-22'): Slide {
  const day = 86400000;
  const a = new Date(inicio + 'T00:00:00-06:00').getTime(), b = new Date(cierre + 'T23:59:59-06:00').getTime();
  const total = Math.max(1, Math.round((b - a) / day));
  const left = Math.max(0, Math.min(total, Math.ceil((b - Date.now()) / day)));
  const fecha = new Date(cierre + 'T12:00:00-06:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  return {
    slug: '', tema: 'Consulta pública · SEDATU', corto: 'la consulta', cifra: left === 1 ? '1 día' : `${left} días`,
    etiqueta: 'para opinar sobre cómo será el Valle de México en 2050', etiquetaCorta: 'para opinar sobre cómo será el Valle de México en 2050',
    pagina: `cierra el ${fecha}`, pregunta: 'Lee el plan por temas, responde y manda tu carta. 5 minutos.', preguntaCorta: 'Lee el plan por temas, responde y manda tu carta. 5 minutos.', pista: '',
    bg: '#5b2bd6', ink: '#f3f1ec', soft: 'rgba(243,241,236,.3)', grafico: { kind: 'calendar', total, left },
  };
}

/** One lead figure per topic for the Temas grid. */
export const TOPIC_FIGURES: Record<string, { cifra: string; etiqueta: string }> = {
  agua: { cifra: '<1 %', etiqueta: 'de las aguas residuales llega a tratamiento · p. 33' },
  movilidad: { cifra: '5.8 M', etiqueta: 'viajes diarios del Edomex a la CDMX · p. 43' },
  vivienda: { cifra: '77 %', etiqueta: 'de la vivienda abandonada está en 3 municipios · p. 57' },
  'medio-ambiente': { cifra: '25,134 t', etiqueta: 'de residuos al día en la metrópoli · p. 29' },
  riesgos: { cifra: 'Nº 1', etiqueta: 'prioritario: alerta temprana metropolitana · p. 120' },
  proximidad: { cifra: '90 %', etiqueta: 'de informalidad en municipios periféricos · p. 43' },
  campo: { cifra: '2.9 %', etiqueta: 'de la población con cobertura vegetal suficiente · p. 44' },
  gobernanza: { cifra: '84', etiqueta: 'gobiernos locales que deciden por separado · p. 11' },
  'quien-paga': { cifra: '0', etiqueta: 'cifras de costo en las 203 páginas · pp. 164 a 180' },
};
