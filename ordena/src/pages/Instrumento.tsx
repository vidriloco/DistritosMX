import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Check } from '../components/Check';
import { useRespuestas } from '../lib/respuestas';
import { Baldios } from './instrumentos/Baldios';
import { Mejoras } from './instrumentos/Mejoras';
import { Plusvalias } from './instrumentos/Plusvalias';
import { PredialFideicomiso } from './instrumentos/PredialFideicomiso';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';

const PAGES: Record<string, { el: () => ReactElement; ask: string; opcion: string }> = {
  baldios: { el: Baldios, opcion: 'quien', ask: 'Pido que el impuesto al desperdicio urbano (pp. 169 a 171) incluya desde el programa exenciones para predios en sucesión y pequeños propietarios con un solo inmueble, un tope de gradualidad en los primeros años, y que lo recaudado se destine a vivienda asequible en el mismo polígono.' },
  plusvalias: { el: Plusvalias, opcion: 'quien', ask: 'Pido que la gestión de la valorización del suelo (pp. 174 y 175) fije desde el programa un piso metropolitano de porcentajes por uso, para evitar que los municipios compitan a la baja, y que las aportaciones en suelo se destinen por regla a vivienda asequible en la misma demarcación.' },
  mejoras: { el: Mejoras, opcion: 'inquilinos', ask: 'Pido que la contribución de mejoras (pp. 176 y 177) exija la aprobación de una mayoría calificada de beneficiarios, exente a la vivienda única de hogares de bajos ingresos y adultos mayores, prohíba su traslado a inquilinos y ofrezca plazos de pago de al menos diez años.' },
  'predial-fideicomiso': { el: PredialFideicomiso, opcion: 'fideicomiso', ask: 'Pido que el Fideicomiso Metropolitano (pp. 175 y 176) nazca con tres reglas en el programa: un asiento ciudadano y uno de los municipios periféricos en su Comité Técnico, publicación trimestral en datos abiertos de aportaciones y proyectos, y una gradualidad de cinco años para cualquier aumento del predial derivado de la actualización catastral (p. 174).' },
};

/** One explanatory page per financing instrument, ending with a sentence the citizen can add to the letter. */
export function Instrumento() {
  const { slug = '' } = useParams();
  const { comentar, comentarios } = useRespuestas();
  const page = PAGES[slug];
  const nombre = ({ baldios: 'Impuesto al desperdicio urbano', plusvalias: 'Captura de plusvalías', mejoras: 'Contribución de mejoras', 'predial-fideicomiso': 'Predial y Fideicomiso Metropolitano' } as Record<string, string>)[slug];
  useSeo(`/quien-paga/${slug}`, nombre ? { title: `${nombre}: cómo funcionaría · Opine`, description: `Cómo funcionaría el instrumento "${nombre}" que propone el POZMVM, a quién afectaría y qué puedes pedir en la consulta pública.` } : null);
  if (!page) return <p className="wrap error">No existe ese instrumento.</p>;
  const Body = page.el;
  const added = (comentarios['quien-paga'] ?? '').includes(page.ask.slice(0, 40));
  const agregar = () => {
    const prev = comentarios['quien-paga'] ?? '';
    if (!added) { comentar('quien-paga', prev ? `${prev}\n${page.ask}` : page.ask); track('instrumento_agregado', { instrumento: slug }); }
  };
  return (
    <article>
      <div className="wrap" style={{ paddingTop: 12 }}><Link to="/quien-paga" className="backlink" onClick={() => track('nav', { destino: '/quien-paga', origen: 'instrumento', instrumento: slug })}>← ¿Quién paga todo esto?</Link></div>
      <Body />
      <section className="wrap open-ask" style={{ paddingTop: 0 }}>
        <div className="ask" style={{ gridColumn: '1 / -1' }}>
          <span className="k">Lo que podrías pedir en la consulta</span>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>{page.ask}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn yellow" onClick={agregar} disabled={added}>{added ? 'Agregado a tu carta' : 'Agregar a mi carta'}<Check size={22} /></button>
            <Link to="/mi-opinion" className="btn ghost" style={{ color: 'var(--bone)' }} onClick={() => track('nav', { destino: '/mi-opinion', origen: 'instrumento', instrumento: slug })}>Ver mi carta</Link>
          </div>
        </div>
      </section>
    </article>
  );
}
