import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Link, useOutletContext } from 'react-router-dom';

import { SLIDES as TOPICS, introSlide } from '../lib/heroSlides';
import type { Consulta } from '../lib/api';
import { Check } from './Check';
import { BarWave, DotMatrix, Houses, Pile, RainHill } from './Graphics';
import { track } from '../lib/analytics';

/** The first screen: one slide per topic, each with its figure, drawing and question. Auto-advances until the visitor touches it. */
export function HeroSlider() {
  const consulta = useOutletContext<Consulta | null>();
  const SLIDES = [introSlide(consulta?.inicio, consulta?.cierre), ...TOPICS];
  const [i, setI] = useState(0);
  const intro = i === 0;
  const touched = useRef(false);
  const startX = useRef<number | null>(null);
  const s = SLIDES[i];
  const go = (k: number, via: string) => {
    touched.current = true;
    const to = ((k % SLIDES.length) + SLIDES.length) % SLIDES.length;
    track('hero_slide', { desde: s.slug || 'intro', hacia: SLIDES[to].slug || 'intro', indice: to, via });
    setI(to);
  };

  useEffect(() => { touched.current = false; }, []);

  const g = s.grafico;
  const graphic =
    g.kind === 'calendar' ? <DotMatrix total={g.total} lit={g.total - g.left} on={s.soft} off={s.ink} label={`${g.total} días de consulta, quedan ${g.left}`} /> :
    g.kind === 'dots' ? <DotMatrix total={g.total} lit={g.lit} on={s.soft} off={s.ink} label={`${g.total} puntos, ${g.total - g.lit} encendido`} /> :
    g.kind === 'bars' ? <BarWave bars={g.bars} highlight={g.highlight} base={s.soft} accent={s.ink} label={`${g.bars} barras, ${g.highlight} resaltadas`} /> :
    g.kind === 'houses' ? <Houses total={g.total} filled={g.filled} color={s.soft} label={`${g.total} casas, ${g.filled} vacías`} /> :
    g.kind === 'pile' ? <Pile layers={g.layers} color={s.ink} accent="#c2531f" label="pila de residuos" /> :
    <RainHill color={s.ink} light={s.bg} label="lluvia sobre una ladera con casas" />;

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current; startX.current = null;
    if (Math.abs(dx) > 48) go(dx < 0 ? i + 1 : i - 1, 'deslizar');
  };
  // On phones the coloured card is a tap target, like stories: the left third goes back, the rest forward.
  const onCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!window.matchMedia('(max-width: 860px)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    go(e.clientX - r.left < r.width / 3 ? i - 1 : i + 1, 'tocar');
  };

  return (
    <section className="hero" aria-roledescription="carrusel" aria-label="La consulta y cinco temas del plan" style={{ ['--hero-bg' as string]: s.bg, ['--hero-ink' as string]: s.ink, ['--arrow-ink' as string]: s.bg }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="wrap hero-tabs">
        <span className="k hero-count">{intro ? 'La consulta' : `Tema ${i} de ${SLIDES.length - 1}`}</span>
        <div role="tablist">
          {SLIDES.map((t, k) => (
            <button key={t.slug || 'intro'} role="tab" aria-selected={k === i} onClick={() => go(k, 'tab')}><span>{k === 0 ? 'La consulta' : `${String(k).padStart(2, '0')} ${t.corto[0].toUpperCase() + t.corto.slice(1)}`}</span></button>
          ))}
        </div>
        <div className="hero-arrows">
          <button type="button" className="arrow" aria-label="Tema anterior" onClick={() => go(i - 1, 'flecha')}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 6l-6 6 6 6" /></svg></button>
          <button type="button" className="arrow fill" aria-label="Tema siguiente" onClick={() => go(i + 1, 'flecha')}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg></button>
        </div>
      </div>
      <div className="hero-desk">
      <div className="hero-top" onClick={onCardClick}>
      <div className="wrap hero-grid">
        <div className="hero-text hero-head" aria-live="polite" aria-atomic="true">
          <span className="k long" style={{ opacity: .75 }}>{intro ? s.tema : `Tema ${i} de ${SLIDES.length - 1} · ${s.tema}`}</span><span className="k short" style={{ opacity: .8 }}>{s.tema}</span>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <strong className="num hero-cifra">{s.cifra}</strong>
            <span className="hero-etiqueta long">{s.etiqueta}</span>
            <span className="hero-etiqueta short">{s.etiquetaCorta}</span>
          </span>
          <span className="small fuente" style={{ color: 'inherit', opacity: .7, fontWeight: 600 }}>{intro ? `Consulta abierta, ${s.pagina}` : `Fuente: POZMVM en consulta, ${s.pagina}`}</span>
        </div>
        <div className="hero-fig" key={i}>{graphic}</div>
      </div>
      </div>
      <div className="hero-bottom">
      <div className="wrap hero-grid">
        <div className="hero-text hero-ask">
          <span className="k pregunta-k">{intro ? 'Qué puedes hacer' : 'La pregunta'}</span>
          <p className="hero-q long">{s.pregunta}</p>
          <p className="hero-q short">{s.preguntaCorta}</p>
          <p className="pista">{s.pista}</p>
          <div className="hero-actions">
            {intro ? <button type="button" className="btn hero-btn" onClick={() => { track('hero_empezar'); go(1, 'empezar'); }}>Empezar<Check size={22} /></button> : <Link to={`/area/${s.slug}`} className="btn hero-btn" onClick={() => track('hero_cta', { tema: s.slug, accion: 'opinar' })}>Opinar sobre {s.corto}<Check size={22} /></Link>}
            {intro ? <a href="#temas" className="hero-secondary" style={{ color: s.ink }} onClick={() => track('hero_cta', { accion: 'ver_temas' })}>Ver los 9 temas →</a> : <Link to={`/area/${s.slug}`} className="hero-secondary" style={{ color: s.ink }} onClick={() => track('hero_cta', { tema: s.slug, accion: 'ver_plan' })}>Primero ver qué propone el plan →</Link>}
          </div>
        </div>
      </div>
      </div>
      </div>
    </section>
  );
}
