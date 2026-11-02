import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Check } from '../components/Check';
import { QuestionFlow } from '../components/QuestionFlow';
import { api } from '../lib/api';
import { CitaLink } from '../components/DocViewer';
import { useFetch } from '../lib/useFetch';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';

export function QuienPaga() {
  useSeo('/quien-paga');
  const sliderRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const { data: fin, error } = useFetch(api.financiamiento, []);
  const { data: area } = useFetch(() => api.area('quien-paga'), []);
  const { data: areas } = useFetch(api.areas, []);

  return (
    <article className="paga">
      <section className="dark paga-hero">
        <div className="wrap">
          <span className="k" style={{ color: 'var(--lilac)' }}>Sección especial · Instrumentación, pp. 164 a 180</span>
          <h1 className="h-light">¿Quién paga <strong>todo esto?</strong></h1>
          <p>Siete formas de recaudar, un fondo común, ningún monto. Sigue el dinero de arriba abajo.</p>
          <svg className="embudo-hero" viewBox="0 0 324 300" role="img" aria-label="Siete fuentes de dinero caen en un solo fondo">
            {(fin?.fuentes ?? Array.from({ length: 7 }, () => ({ tipo: 'existente' }))).slice(0, 7).map((f, i) => {
              const y = [70, 40, 55, 90, 30, 80, 60][i];
              const fill = f.tipo === 'nuevo' ? 'var(--rust)' : f.tipo === 'reforma' ? 'var(--yellow)' : '#9b7bff';
              return <rect key={i} x={i * 48} y={y} width="36" height={200 - y} fill={fill} />;
            })}
            <path d="M0 212 L324 212 L204 258 L120 258 Z" fill="var(--bone)" opacity=".15" />
            <rect x="120" y="258" width="84" height="42" fill="var(--yellow)" />
            <text x="162" y="286" textAnchor="middle" fontWeight="800" fontSize="20" fill="var(--ink)">1</text>
          </svg>
          <div className="leyenda hero-leyenda"><span><i className="existente" /> Ya existe</span><span><i className="nuevo" /> Nuevo</span><span><i className="reforma" /> Se reforma</span><strong>0 cifras de costo</strong></div>
          <a href="#flujo" className="btn hero-cta" onClick={() => track('quien_paga_cta')}>Ver las 7 fuentes<Check size={22} /></a>
        </div>
      </section>

      {error ? <p className="wrap error">No se pudo cargar la sección: {error}</p> : null}

      {fin ? (
        <section className="wrap section flujo" id="flujo">
          <div className="paso">
            <span className="k">1 · De dónde saldría</span>
            <div className="leyenda"><span><i className="existente" /> Ya existe</span><span><i className="nuevo" /> Nuevo</span><span><i className="reforma" /> Se reforma</span></div>
            <div className="col src-slider" ref={sliderRef} onScroll={(e) => { const el = e.currentTarget; const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1; const k = Math.round(el.scrollLeft / (w + 10)); if (k !== slide) { setSlide(k); track('fuente_vista', { indice: k + 1 }); } }}>
              {fin.fuentes.map((f, i) => {
                const tipo = f.tipo === 'nuevo' ? 'Nuevo' : f.tipo === 'reforma' ? 'Se reforma' : 'Ya existe';
                const inner = <><span className="src-top"><span className="src-n">{String(i + 1).padStart(2, '0')} / {fin.fuentes.length}</span><span className="src-tipo">{tipo}</span></span><span className="src-body"><strong>{f.nombre}</strong><span>{f.detalle}</span></span><span className="src-foot"><span className="pg">p. {f.pagina}</span>{f.slug ? <span className="src-mas">Cómo funciona →</span> : null}</span></>;
                return f.slug ? <Link key={f.nombre} to={`/quien-paga/${f.slug}`} className={`src ${f.tipo}`} onClick={() => track('fuente_abierta', { fuente: f.slug ?? '', tipo: f.tipo, posicion: i + 1 })}>{inner}</Link> : <div key={f.nombre} className={`src ${f.tipo}`}>{inner}</div>;
              })}
            </div>
            <div className="src-dots" aria-hidden="true">{fin.fuentes.map((f, i) => <button key={f.nombre} type="button" tabIndex={-1} className={`${f.tipo}${i === slide ? ' on' : ''}`} onClick={() => { track('fuente_punto', { indice: i + 1 }); const el = sliderRef.current; const c = el?.children[i] as HTMLElement | undefined; if (el && c) el.scrollTo({ left: c.offsetLeft - el.offsetLeft, behavior: 'smooth' }); }} />)}<span className="src-hint">Desliza →</span></div>
          </div>
          <svg className="embudo" aria-hidden="true" viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeWidth="2"><path d="M60 2v30M48 22l12 12 12-12" /></svg>
          <div className="paso">
            <span className="k">2 · Dónde se junta</span>
            <Link to="/quien-paga/predial-fideicomiso" className="fondo" onClick={() => track('fuente_abierta', { fuente: 'predial-fideicomiso', tipo: 'fondo' })}>
              <span className="k" style={{ color: 'var(--lilac)' }}>Fondo común</span>
              <strong>Fideicomiso Metropolitano del Valle de México</strong>
              <span>Solo para obras de interés metropolitano. Un Comité Técnico decide. Reglas de operación por escribir · pp. 175 y 176 →</span>
            </Link>
          </div>
          <svg className="embudo" aria-hidden="true" viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeWidth="2"><path d="M60 2v30M48 22l12 12 12-12" /></svg>
          <div className="paso">
            <span className="k">3 · En qué se gasta</span>
            <div className="col">
              {fin.destinos.map((d) => <div key={d.nombre} className="dst"><span>{d.nombre}</span><CitaLink pagina={d.pagina} cita={d.cita} origen="destino" className="pg-link" /></div>)}
              <div className="dst gap"><svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3L2 21h20L12 3z" /><path d="M12 10v5" strokeLinecap="round" /><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" /></svg><strong>Riesgo de robo de recursos y corrupción</strong><span>El plan no dice cuánto se juntará, cuándo se gastará ni qué obra va primero, y las reglas del fideicomiso están por escribir (pp. 175 y 176). Sin eso, nadie puede vigilar a dónde va el dinero.</span></div>
            </div>
            <p className="small" style={{ margin: 0 }}>Los instrumentos naranjas y amarillos requieren cambiar leyes fiscales estatales y municipales (pp. 170 y 176). Toca uno para ver cómo funciona.</p>
          </div>
        </section>
      ) : null}

      {area ? (
        <div id="opinar">
          <QuestionFlow area={area} areas={areas ?? undefined} titulo="¿Quién paga? Tu postura" diagHref="#flujo" extra={(p, elegida) => {
            if (!fin || p.slug !== 'quien-paga-situacion' || !elegida) return null;
            const orden = { alto: 0, medio: 1, bajo: 2 } as Record<string, number>;
            const lista = [...(fin.efectos[elegida.valor] ?? [])].sort((a, b) => (orden[a.tono] ?? 9) - (orden[b.tono] ?? 9));
            const [top, ...resto] = lista;
            if (!top) return null;
            return (
              <div className="resultado" aria-live="polite">
                <span className="k">Lo que te afectaría</span>
                <div className="efecto-top">
                  <span className="k">{top.tono === 'alto' ? 'Lo que más te afecta' : top.kicker}</span>
                  <strong>{top.titulo}</strong>
                  <span>{top.texto}</span>
                  <span className="pg-line">POZMVM {top.pagina}</span>
                </div>
                <div className="efecto-resto">
                  {resto.map((e, i) => (
                    <div key={i}><span><strong>{e.titulo}</strong><span className="muted">{e.texto} · {e.pagina}</span></span><span className={`veredicto ${e.tono}`}>{e.kicker}</span></div>
                  ))}
                </div>
              </div>
            );
          }} />
        </div>
      ) : null}
    </article>
  );
}
