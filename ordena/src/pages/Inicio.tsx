import { Link, useOutletContext } from 'react-router-dom';

import { Check } from '../components/Check';
import { HeroSlider } from '../components/HeroSlider';
import { TopicIcon } from '../components/TopicIcon';
import { SkylineCDMX } from '../components/Graphics';
import { TOPIC_FIGURES } from '../lib/heroSlides';
import { api, type Consulta } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { useRespuestas } from '../lib/respuestas';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';

const fecha = (iso: string) => new Date(iso + 'T12:00:00-06:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });

export function Inicio() {
  useSeo('/');
  const consulta = useOutletContext<Consulta | null>();
  const { data: areas, error } = useFetch(api.areas, []);
  const { data: resultados } = useFetch(api.resultados, []);
  const { elecciones } = useRespuestas();
  const n = Object.keys(elecciones).length;
  const totalPreguntas = areas?.reduce((s, a) => s + a.num_preguntas, 0) ?? 16;
  const cierre = consulta ? fecha(consulta.cierre) : '22 de noviembre';

  return (
    <>
      <h1 className="sr-only">Opine: tu opinión sobre el plan del Valle de México a 2050 (POZMVM)</h1>
      <HeroSlider />
      <section className="wrap framing">
        <SkylineCDMX className="skyline" />
        <div className="framing-copy">
          <span className="k" style={{ color: 'var(--rust)' }}>Consulta pública de SEDATU</span>
          <h2 className="h-light">Tu opinión <strong>cuenta,<br />si la mandas.</strong></h2>
          <p className="muted">El gobierno decide cómo será el Valle de México en 2050. Hasta el <strong>{cierre}</strong> puedes mandarle tu opinión.</p>
          {n > 0 ? (
            <Link to="/mi-opinion" className="resume" onClick={() => track('nav', { destino: '/mi-opinion', origen: 'inicio_continuar', respuestas: n })}>
              <span><strong>Llevas {n} de {totalPreguntas} preguntas.</strong> Tu carta ya tiene {n === 1 ? 'un punto' : `${n} puntos`}.</span>
              <span className="resume-cta">Continuar<Check size={18} /></span>
            </Link>
          ) : null}
        </div>
        <div className="facts" role="group" aria-labelledby="facts-k">
          <span className="k facts-k" id="facts-k">Lo que necesitas saber</span>
          <dl><dt>Qué</dt><dd><strong>POZMVM</strong>, el plan para 84 municipios</dd></dl>
          <dl><dt>Cuánto</dt><dd><strong>203 páginas</strong>, resumidas aquí por tema</dd></dl>
          <dl><dt>Tiempo</dt><dd><strong>5 min</strong>, responde solo lo que te importa</dd></dl>
          <dl><dt>Datos</dt><dd><strong>Sin registro</strong>, todo queda en tu teléfono</dd></dl>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h-light h2">Tres pasos <strong>y listo</strong></h2>
        <ol className="steps">
          <li><span className="num n">01</span><strong>Infórmate</strong><span>datos con página</span></li>
          <li><span className="num n">02</span><strong>Responde</strong><span>frases con cita</span></li>
          <li><span className="num n">03</span><strong>Mándala</strong><span>tú la envías</span></li>
        </ol>
        <a href="#temas" className="btn steps-cta" onClick={() => track('inicio_cta', { accion: 'empezar_por_tema' })}>Empezar por un tema<Check size={22} /></a>
      </section>

      {error ? <p className="wrap error">No se pudo cargar el contenido: {error}</p> : null}

      <section className="wrap section" id="temas">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 className="h-light h2">Los {areas?.length ?? 9} temas, <strong>{totalPreguntas} preguntas</strong></h2>
          <span className="small">Cada tema con su cifra y la página del documento</span>
        </div>
        <ol className="topics">
          {(areas ?? []).map((a, i) => {
            const f = TOPIC_FIGURES[a.slug];
            const hechas = a.pregunta_slugs.filter((k) => elecciones[k]).length;
            const to = a.slug === 'quien-paga' ? '/quien-paga' : `/area/${a.slug}`;
            return (
              <li key={a.slug}>
                <Link to={to} onClick={() => track('tema_abierto', { tema: a.slug, origen: 'inicio', posicion: i + 1, hechas })}>
                  <TopicIcon slug={a.slug} />
                  <span className="body">
                    <strong>{a.titulo}</strong>
                    <span className="muted">{f ? <><strong className="topic-fig">{f.cifra}</strong> {f.etiqueta.replace(/\s·\s.*$/, '')}</> : a.resumen}</span>
                  </span>
                  <span className={`prog${hechas === a.num_preguntas ? ' done' : ''}`} aria-label={`${hechas} de ${a.num_preguntas} respondidas`}>{hechas}/{a.num_preguntas}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="wrap section" style={{ paddingBottom: 40 }}>
        <div className="about">
          <div>
            <span className="k" style={{ color: 'var(--violet)' }}>Sobre este sitio</span>
            <p>Es un sitio ciudadano independiente. No es de SEDATU ni de ningún gobierno o partido. Lo hicimos para que las 203 páginas del plan se puedan leer, discutir y contestar desde un teléfono.</p>
            <p>Tus respuestas se guardan solo en tu navegador. Contamos visitas y clics de forma anónima y sin cookies, con PostHog (servidores en la Unión Europea), para saber qué partes del sitio sirven; nunca lo que escribes. Si eliges "contar mi opinión", se suman de forma anónima al conteo público{resultados && resultados.respuestas > 0 ? `, donde ya hay ${resultados.respuestas} ${resultados.respuestas === 1 ? 'opinión contada' : 'opiniones contadas'}` : ''}. La carta la envías tú, desde tu correo.</p>
          </div>
          <div>
            <span className="k" style={{ color: 'var(--violet)' }}>La consulta oficial</span>
            <ul>
              <li><a href={consulta?.pagina_consulta ?? 'https://pozmvm.sedatu.gob.mx/'} target="_blank" rel="noreferrer">Página de la consulta en SEDATU</a></li>
              <li><a href={consulta?.documento ?? '#'} target="_blank" rel="noreferrer">El documento en consulta (PDF, 203 páginas)</a></li>
              <li><a href={consulta?.pagina_eventos ?? '#'} target="_blank" rel="noreferrer">Foros presenciales</a></li>
              <li>Correo para opiniones: <a href={`mailto:${consulta?.correo ?? 'participacion.dgomr@sedatu.gob.mx'}`}>{consulta?.correo ?? 'participacion.dgomr@sedatu.gob.mx'}</a></li>
            </ul>
            {resultados && resultados.respuestas > 0 ? <Link to="/resultados" className="btn ghost" style={{ marginTop: 8 }} onClick={() => track('nav', { destino: '/resultados', origen: 'inicio' })}>Ver qué opinan otros</Link> : null}
          </div>
        </div>
      </section>
    </>
  );
}
