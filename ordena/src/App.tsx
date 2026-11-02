import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { Check, LogoMark } from './components/Check';
import { PageError } from './components/PageError';
import { api } from './lib/api';
import { useFetch } from './lib/useFetch';
import { useRespuestas } from './lib/respuestas';
import { track } from './lib/analytics';

export default function App() {
  const { data: consulta } = useFetch(api.consulta, []);
  const { elecciones } = useRespuestas();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const nav = (destino: string, origen = 'menu') => () => track('nav', { destino, origen });
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open]);
  const n = Object.keys(elecciones).length;
  // The main laciudad.mx site, whichever host this is (ordena.laciudad.mx, ordena.localhost locally)
  const ciudadUrl = `${location.protocol}//${location.hostname.replace(/^ordena\./, '')}${location.port ? `:${location.port}` : ''}/`;
  const total = consulta ? Math.max(1, Math.round((new Date(consulta.cierre + 'T23:59:59-06:00').getTime() - new Date(consulta.inicio + 'T00:00:00-06:00').getTime()) / 86400000)) : 60;
  const dias = consulta ? Math.max(0, Math.ceil((new Date(consulta.cierre + 'T23:59:59-06:00').getTime() - Date.now()) / 86400000)) : null;

  return (
    <>
      <header className={`top${open ? ' open' : ''}`}>
        <div className="wrap top-row">
          <Link to="/" className="brand" onClick={nav('/', 'logo')}><LogoMark size={36} /><span className="brand-t"><span>¿Qué opinas?</span><small>Programa de Ordenación de la Megalópolis</small></span></Link>
          <button type="button" className="burger" aria-expanded={open} aria-controls="nav" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => { track('menu', { abierto: !open }); setOpen((o) => !o); }}>
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square">
              {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
          <nav id="nav" aria-label="Principal">
            <NavLink to="/temas" onClick={nav('/temas')}><span className="nav-n" aria-hidden="true">01</span><span className="nav-t"><span>Temas</span><small>Nueve temas, dos o tres preguntas cada uno</small></span></NavLink>
            <NavLink to="/quien-paga" onClick={nav('/quien-paga')}><span className="nav-n" aria-hidden="true">02</span><span className="nav-t"><span>¿Quién paga?</span><small>De dónde saldría el dinero del plan</small></span></NavLink>
            <NavLink to="/mi-opinion" onClick={nav('/mi-opinion')}><span className="nav-n" aria-hidden="true">03</span><span className="nav-t"><span>Mi opinión{n > 0 ? <span className="badge" aria-label={`${n} respuestas`}>{n}</span> : null}</span><small>{n > 0 ? `Tu carta lleva ${n} ${n === 1 ? 'punto' : 'puntos'}` : 'Tu carta, lista para enviar'}</small></span></NavLink>
            <NavLink to="/resultados" onClick={nav('/resultados')}><span className="nav-n" aria-hidden="true">04</span><span className="nav-t"><span>Qué opinan otros</span><small>Lo más elegido por tema</small></span></NavLink>
            <a href={ciudadUrl} className="nav-city"><span className="nav-n" aria-hidden="true" /><span className="nav-t"><span><img className="nav-city-ico" src="/ciudad-mx-icon.png" alt="" width="20" height="20" />La Ciudad</span><small>Mapas y datos de la Ciudad de México</small></span></a>
            {dias !== null ? (
              <span className="deadline">
                <span>{dias > 0 ? <>Consulta abierta · quedan <strong>{dias} días</strong></> : 'La consulta cerró'}</span>
                <i className="deadline-bar" aria-hidden="true"><b style={{ width: `${Math.min(100, Math.max(0, 100 - (dias / total) * 100))}%` }} /></i>
              </span>
            ) : null}
            <Link to={n > 0 ? '/mi-opinion' : '/temas'} className="btn nav-cta" onClick={() => track('nav', { destino: n > 0 ? '/mi-opinion' : '/temas', origen: 'cta_menu', respuestas: n })}>{n > 0 ? 'Ver mi carta' : 'Empezar a opinar'}<Check size={22} /></Link>
          </nav>
        </div>
      </header>
      {open ? <button type="button" className="nav-scrim" aria-label="Cerrar menú" onClick={() => { track('menu', { abierto: false, via: 'fondo' }); setOpen(false); }} /> : null}
      <main>
        <PageError key={pathname}><Outlet context={consulta} /></PageError>
      </main>
      <footer>
        <div className="wrap">
          Sitio ciudadano independiente para entender el proyecto del Programa de Ordenación de la Megalópolis que SEDATU puso a consulta pública. No es un sitio oficial. Fuente: {consulta ? <a href={consulta.documento} target="_blank" rel="noreferrer">documento en consulta (PDF, 203 págs.)</a> : 'documento en consulta'}.
        </div>
      </footer>
      <a className="credito" href="https://tallerdeapps.mx" target="_blank" rel="noopener">
        <span className="wrap credito-in">
          <svg aria-hidden="true" width="34" height="34" viewBox="0 0 34 34"><rect width="34" height="34" rx="8" fill="#5b2bd6" /><path d="M9 11h16M17 11v13" stroke="#f3f1ec" strokeWidth="3.2" strokeLinecap="round" /></svg>
          <span className="credito-t"><small>Hecho con cuidado por</small><strong>TallerdeApps</strong></span>
          <span className="credito-l">tallerdeapps.mx ↗</span>
        </span>
      </a>
    </>
  );
}
