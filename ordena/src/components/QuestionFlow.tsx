import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Check } from './Check';
import { TopicIcon } from './TopicIcon';
import type { Area, AreaResumen, Opcion, Pregunta } from '../lib/api';
import { NO_SE, useRespuestas } from '../lib/respuestas';
import { track } from '../lib/analytics';

const Prev = () => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 6l-6 6 6 6" /></svg>;
const Info = () => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" strokeLinecap="round" /></svg>;

/** The question deck every topic shares: violet strip, one card per question, the free comment, and the navigation under it. */
export function QuestionFlow({ area, areas, titulo, extra, diagHref = '#contexto' }: { area: Area; areas?: AreaResumen[]; titulo: string; diagHref?: string; extra?: (p: Pregunta, elegida: Opcion | undefined) => ReactNode }) {
  const { elecciones, comentarios, elegir, comentar } = useRespuestas();
  const [step, setStep] = useState(0);
  const [x0, setX0] = useState<number | null>(null);
  useEffect(() => { setStep(0); }, [area.slug]);

  const idx = areas?.findIndex((a) => a.slug === area.slug) ?? -1;
  const siguiente = areas && idx >= 0 ? areas[idx + 1] : undefined;
  const total = area.preguntas.length;
  const respondidas = area.preguntas.filter((p) => elecciones[p.slug]).length;
  const esComentario = step >= total;
  const p = esComentario ? null : area.preguntas[step];
  const elegida = p ? p.opciones.find((o) => o.valor === elecciones[p.slug]) : undefined;
  const noSe = p ? elecciones[p.slug] === NO_SE : false;
  const contestada = !!elegida || noSe;
  const go = (k: number, via: string) => { track('pregunta_nav', { tema: area.slug, desde: step, hacia: k, via }); setStep(k); };

  return (
    <>
      <div className="qstrip">
        <TopicIcon slug={area.slug} size={44} />
        <span className="qstrip-t"><span className="k">{titulo}</span><strong>{total} {total === 1 ? 'pregunta' : 'preguntas'} · {Math.max(1, Math.round(total * 0.6))} min</strong></span>
        <span className="num qcount">{Math.min(step + 1, total)}<span>/{total}</span></span>
      </div>

      <section className="qscreen" aria-live="polite">
        <div className="deck" onTouchStart={(e) => setX0(e.touches[0].clientX)} onTouchEnd={(e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; setX0(null); if (dx < -50 && (esComentario ? false : contestada || step < total)) go(Math.min(step + 1, total), 'deslizar'); if (dx > 50) go(Math.max(step - 1, 0), 'deslizar'); }}>
          {step < total ? <div className="deck-back" aria-hidden="true" /> : null}
          <div className="card" key={p ? p.slug : 'comentario'}>
            {p ? (
              <fieldset className="q">
                <legend className="k muted">Pregunta {step + 1} · {p.corto}</legend>
                <p className="qtext">{p.texto}</p>
                <div className="pills">
                  {p.opciones.map((o) => (
                    <button key={o.valor} type="button" aria-pressed={elegida?.valor === o.valor} onClick={() => elegir(p.slug, o.valor, area.slug)}>
                      {elegida?.valor === o.valor ? <Check size={16} /> : null}{o.etiqueta}
                    </button>
                  ))}
                  <button type="button" className="no-se" aria-pressed={noSe} onClick={() => elegir(p.slug, NO_SE, area.slug)}>
                    {noSe ? <Check size={16} /> : null}No sé / no tengo opinión
                  </button>
                </div>
                {elegida ? <blockquote className="frase"><span className="k">Tu frase para la carta</span>{elegida.opinion}</blockquote> : noSe ? <p className="muted hint frase-hint">Sin problema: esta pregunta no irá en tu carta.</p> : <p className="muted hint frase-hint">Elige una opción y te mostramos la frase que irá en tu carta.</p>}
                {extra ? extra(p, elegida) : null}
              </fieldset>
            ) : (
              <div className="q">
                <span className="k muted">Para cerrar el tema</span>
                <p className="qtext">¿Algo más sobre {area.titulo.toLowerCase()}? Escríbelo con tus palabras.</p>
                <textarea className="ph-no-capture" rows={5} aria-label="Comentario libre" onBlur={(e) => { if (e.target.value.trim()) track('comentario_escrito', { tema: area.slug, caracteres: e.target.value.length }); }} value={comentarios[area.slug] ?? ''} onChange={(e) => comentar(area.slug, e.target.value)} placeholder="Ejemplo: en mi colonia el último micro pasa a las 9 de la noche…" />
                <p className="muted hint">Opcional. Se añade al final de tu carta, tal cual lo escribas.</p>
              </div>
            )}
            <div className="card-foot">
              <span className="muted">{step < total ? 'Desliza para la siguiente →' : `${respondidas} de ${total} respondidas`}</span>
              <div role="tablist" aria-label="Preguntas">
                {area.preguntas.map((q, k) => <button key={q.slug} role="tab" aria-selected={k === step} className={elecciones[q.slug] ? 'done' : ''} onClick={() => go(k, 'tab')}><span>{k + 1} · {q.corto}</span></button>)}
                <button role="tab" aria-selected={esComentario} className={comentarios[area.slug] ? 'done' : ''} onClick={() => go(total, 'tab')}><span>Comentario</span></button>
              </div>
            </div>
          </div>
        </div>
        <div className="qnav">
          {esComentario ? (
            <>
              <button type="button" className="btn ghost" onClick={() => go(step - 1, 'anterior')}><Prev />Anterior</button>
              <Link className="btn rust" to="/mi-opinion" onClick={() => track('tema_terminado', { tema: area.slug, respondidas })}>Ver mi opinión<Check size={22} /></Link>
            </>
          ) : (
            <>
              <button type="button" className="btn ghost" disabled={step === 0} onClick={() => go(step - 1, 'anterior')}><Prev />Anterior</button>
              <button type="button" className="btn" disabled={!contestada} onClick={() => go(step + 1, 'siguiente')}>Siguiente<Check size={22} /></button>
            </>
          )}
        </div>
        <a href={diagHref} className="diag-link" onClick={() => track('diagnostico_abierto', { tema: area.slug })}><Info />Ver el diagnóstico de este tema</a>
        {esComentario && siguiente ? <Link className="diag-link" to={siguiente.slug === 'quien-paga' ? '/quien-paga' : `/area/${siguiente.slug}`} onClick={() => track('tema_siguiente', { desde: area.slug, hacia: siguiente.slug })}>Siguiente tema: {siguiente.titulo} →</Link> : null}
      </section>

    </>
  );
}
