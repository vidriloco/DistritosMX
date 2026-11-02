import { Link } from 'react-router-dom';

import { Check } from '../components/Check';
import { TOPIC_FIGURES } from '../lib/heroSlides';
import { api } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { useRespuestas } from '../lib/respuestas';
import { useSeo } from '../lib/seo';
import { TOPIC_COLOR, TOPIC_ICON as ICON } from '../lib/topics';
import { track } from '../lib/analytics';


export function Temas() {
  useSeo('/temas');
  const { data: areas, error } = useFetch(api.areas, []);
  const { elecciones } = useRespuestas();
  const total = areas?.reduce((s, a) => s + a.num_preguntas, 0) ?? 0;
  const hechasTotal = areas?.reduce((s, a) => s + a.pregunta_slugs.filter((k) => elecciones[k]).length, 0) ?? 0;
  return (
    <section className="wrap section temas" style={{ paddingBottom: 56 }}>
      <div className="temas-head">
        <span className="k" style={{ color: 'var(--violet)' }}>Paso 1 · Elige un tema</span>
        <h1 className="h-light">Nueve temas. <strong>Empieza por el tuyo.</strong></h1>
        <p className="muted">Cada tema trae una cifra del plan, dos o tres preguntas y tu frase para la carta. Con dos o tres temas ya tienes una opinión que vale.</p>
        {hechasTotal > 0 ? <p className="temas-prog"><strong>{hechasTotal} de {total}</strong> preguntas respondidas · <Link to="/mi-opinion" onClick={() => track('nav', { destino: '/mi-opinion', origen: 'temas' })}>ver mi carta</Link></p> : null}
      </div>
      {error ? <p className="error">No se pudo cargar el contenido: {error}</p> : null}
      <div className="tiles">
        {(areas ?? []).map((a, i) => {
          const f = TOPIC_FIGURES[a.slug];
          const c = TOPIC_COLOR[a.slug] ?? { bg: 'var(--violet)', soft: '#c9b8ff' };
          const hechas = a.pregunta_slugs.filter((k) => elecciones[k]).length;
          const listo = hechas === a.num_preguntas && a.num_preguntas > 0;
          const to = a.slug === 'quien-paga' ? '/quien-paga' : `/area/${a.slug}`;
          return (
            <Link key={a.slug} to={to} onClick={() => track('tema_abierto', { tema: a.slug, origen: 'temas', posicion: i + 1, hechas })} className={`tile${listo ? ' done' : ''}`} style={{ ['--bg' as string]: c.bg, ['--soft' as string]: c.soft }}>
              <span className="tile-top"><span className="k">{String(i + 1).padStart(2, '0')}</span>{ICON[a.slug] ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d={ICON[a.slug]} /></svg> : null}</span>
              <strong className="num tile-fig">{f?.cifra ?? ''}</strong>
              <span className="tile-lab">{f?.etiqueta?.replace(/\s·\s.*$/, '')}</span>
              <span className="tile-title">{a.titulo}</span>
              <span className="tile-foot">
                <span className="tile-bars" aria-label={`${hechas} de ${a.num_preguntas} respondidas`}>{a.pregunta_slugs.map((k) => <i key={k} className={elecciones[k] ? 'on' : ''} />)}</span>
                <span className="tile-cta">{listo ? <>Listo<Check size={16} /></> : hechas > 0 ? `Seguir ${hechas}/${a.num_preguntas}` : `${a.num_preguntas} ${a.num_preguntas === 1 ? 'pregunta' : 'preguntas'} →`}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
