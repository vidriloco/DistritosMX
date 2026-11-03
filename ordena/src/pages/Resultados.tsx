import { useEffect, useRef, useState } from 'react';

import { TopicIcon } from '../components/TopicIcon';
import { TOPIC_COLOR } from '../lib/topics';

import { api, type Resultados as Datos } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { useSeo } from '../lib/seo';
import { Loading } from '../components/Loading';
import { track } from '../lib/analytics';

const CORTO: Record<string, string> = { agua: 'Agua', movilidad: 'Movilidad', vivienda: 'Vivienda', 'medio-ambiente': 'Residuos', riesgos: 'Riesgos', proximidad: 'Cercanía', campo: 'Campo', gobernanza: 'Gobernanza', 'quien-paga': '¿Quién paga?' };
const COLOR: Record<string, string> = Object.fromEntries(Object.entries(TOPIC_COLOR).map(([k, v]) => [k, v.bg]));

const pct = (n: number, total: number) => (total ? Math.round((100 * n) / total) : 0);

/** The most chosen option of the most answered question in a topic, as one sentence. */
function destacado(preguntas: Datos['preguntas']) {
  const q = [...preguntas].filter((p) => p.total > 0).sort((a, b) => b.total - a.total)[0];
  if (!q) return null;
  const top = [...q.opciones].sort((a, b) => b.n - a.n)[0];
  return { pct: pct(top.n, q.total), etiqueta: top.etiqueta };
}

export function Resultados() {
  useSeo('/resultados');
  const { data, error } = useFetch(api.resultados, []);
  const [abierto, setAbierto] = useState<string | null>(null);
  const detalleRef = useRef<HTMLElement>(null);
  const tablaRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (abierto) detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [abierto]);
  if (error) return <p className="wrap error">No se pudieron cargar los resultados: {error}</p>;
  if (!data) return <Loading />;

  const temas = data.areas.map((a) => ({ ...a, preguntas: data.preguntas.filter((p) => p.area === a.slug), top: destacado(data.preguntas.filter((p) => p.area === a.slug)) })).filter((a) => a.participantes > 0);
  const actual = abierto ?? temas[0]?.slug ?? null;
  const detalle = temas.find((t) => t.slug === actual);

  return (
    <article className="wrap section res" style={{ paddingBottom: 56 }}>
      <div>
        <span className="k" style={{ color: 'var(--violet)' }}>Resultados</span>
        <h1 className="h-light" style={{ margin: 0, fontSize: 'clamp(36px, 5vw, 48px)' }}>Qué opinan <strong>otras personas</strong></h1>
      </div>

      {temas.length ? (
        <div className="res-tabla" ref={tablaRef}>
          <div className="res-cab"><span className="k">Lo más elegido por tema</span><span className="k">Participación</span></div>
          {temas.map((t) => (
            <button key={t.slug} type="button" className="res-fila" aria-expanded={t.slug === actual} onClick={() => { setAbierto(t.slug); track('resultados_tema', { tema: t.slug }); }} style={{ ['--c' as string]: COLOR[t.slug] ?? 'var(--violet)' }}>
              <TopicIcon slug={t.slug} size={40} />
              <strong>{CORTO[t.slug] ?? t.titulo}</strong>
              <span className="muted small">{t.participantes} de {data.respuestas}</span>
              {t.top ? <span className="res-top"><b>{t.top.pct} %</b> eligió «{t.top.etiqueta}»</span> : null}
              <i className="res-barra"><b style={{ width: `${pct(t.participantes, data.respuestas)}%` }} /></i>
            </button>
          ))}
        </div>
      ) : null}
      {temas.length ? <p className="muted small" style={{ margin: 0 }}>Toca un tema para ver todas las opciones.</p> : null}

      {detalle ? (
        <section className="res-detalle" ref={detalleRef} style={{ ['--c' as string]: COLOR[detalle.slug] ?? 'var(--violet)' }}>
          <span className="res-dh"><TopicIcon slug={detalle.slug} size={36} /><span className="k res-k">{detalle.titulo} · {detalle.participantes} {detalle.participantes === 1 ? 'respuesta' : 'respuestas'}</span></span>
          {detalle.preguntas.filter((p) => p.total > 0).map((p) => {
            const max = Math.max(...p.opciones.map((o) => o.n));
            return (
              <div key={p.pregunta} className="res-q">
                <div className="res-qh"><p>{p.texto}</p><span className="pg">{p.total} resp.</span></div>
                {p.opciones.map((o) => (
                  <div key={o.valor} className="res-opt">
                    <span className="lab"><span>{o.etiqueta}</span><i><b className={o.n === max ? '' : 'm'} style={{ width: `${pct(o.n, p.total)}%` }} /></i></span>
                    <span className="v">{pct(o.n, p.total)} %</span>
                  </div>
                ))}
              </div>
            );
          })}
          <button type="button" className="btn ghost res-volver" onClick={() => { track('resultados_volver', { tema: detalle.slug }); tablaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>↑ Volver a los temas</button>
        </section>
      ) : null}
    </article>
  );
}
