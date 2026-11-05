import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Check } from '../components/Check';
import { api, type Borrador } from '../lib/api';
import { NO_SE, conOpinion, useRespuestas } from '../lib/respuestas';
import { useSeo } from '../lib/seo';
import { track } from '../lib/analytics';

export function Resumen() {
  useSeo('/mi-opinion');
  const { elecciones, comentarios, municipio, firma, setMunicipio, setFirma, limpiar } = useRespuestas();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  // `n` is the letter's points; "No sé" answers count as answered but add no point.
  const n = conOpinion(elecciones);
  const respondidas = Object.keys(elecciones).length;
  const faltaQuienPaga = n > 0 && !Object.entries(elecciones).some(([k, v]) => k.startsWith('quien-paga-') && v !== NO_SE);

  useEffect(() => {
    const t = setTimeout(() => { api.opinion({ elecciones, comentarios, municipio, firma }).then(setBorrador).catch((e: Error) => setError(e.message)); }, 250);
    return () => clearTimeout(t);
  }, [elecciones, comentarios, municipio, firma]);

  const copiar = async () => { if (!borrador) return; try { await navigator.clipboard.writeText(borrador.texto); setCopiado(true); track('carta_copiada', { puntos: n, firmada: !!firma.nombre }); setTimeout(() => setCopiado(false), 2000); } catch { track('carta_copia_fallida', { puntos: n }); /* text stays selectable */ } };
  const mailto = borrador ? `mailto:${borrador.consulta.correo}?subject=${encodeURIComponent('Opinión ciudadana sobre el proyecto de POZMVM')}&body=${encodeURIComponent(borrador.texto)}` : '#';

  return (
    <article className="wrap two" style={{ paddingTop: 40, paddingBottom: 64 }}>
      <div>
        <span className="k" style={{ color: 'var(--violet)' }}>Paso 3 · Opinar</span>
        <h1 className="h-light" style={{ margin: 0, fontSize: 'clamp(36px, 5vw, 48px)' }}>Tu opinión, <strong>lista para enviar</strong></h1>
        <p className="muted" style={{ margin: 0, fontSize: 17 }}>{n === 0 ? <>{respondidas > 0 ? 'Por ahora respondiste «No sé» en todo, así que tu carta aún no tiene puntos.' : 'Todavía no has respondido ninguna pregunta.'} <Link to="/temas" style={{ display: 'inline-block', padding: '6px 0' }} onClick={() => track('nav', { destino: '/temas', origen: 'carta_vacia' })}>Empieza por un tema</Link> y vuelve aquí.</> : `Respondiste ${respondidas} pregunta${respondidas === 1 ? '' : 's'}. Esta carta junta lo que elegiste${respondidas > n ? ' (sin las que marcaste «No sé»)' : ''}, con la página del documento que respalda cada punto.`}</p>
        {faltaQuienPaga ? (
          <Link to="/quien-paga" className="nudge" onClick={() => track('nudge_quien_paga', { puntos: n })}>
            <span className="num">$</span>
            <span><strong>Falta lo que más pesa: ¿quién paga?</strong><span>El plan necesita miles de millones y no dice de dónde saldrán. Una pregunta más y tu carta lo exige.</span></span>
            <span className="nudge-cta">1 pregunta<Check size={18} /></span>
          </Link>
        ) : null}
        <details className="firma ph-no-capture" open={!!(firma.nombre || firma.colonia || municipio)}>
          <summary onClick={(e) => track('firma_toggle', { abierta: !(e.currentTarget.parentElement as HTMLDetailsElement).open })}><span>Firmar la carta con tu nombre y dirección</span><span className="muted">opcional ▾</span></summary>
          <p className="muted small">Una carta firmada y con lugar pesa más. Nada de esto se guarda en este sitio: solo va en el texto que tú envías.</p>
          <div className="firma-grid">
            <label><span>Nombre</span><input value={firma.nombre} onChange={(e) => setFirma({ nombre: e.target.value })} placeholder="María López" autoComplete="name" onBlur={(e) => track('firma_campo', { campo: 'nombre', lleno: !!e.target.value.trim() })} /></label>
            <label><span>Colonia o barrio</span><input value={firma.colonia} onChange={(e) => setFirma({ colonia: e.target.value })} placeholder="San Juan de Aragón" autoComplete="address-level3" onBlur={(e) => track('firma_campo', { campo: 'colonia', lleno: !!e.target.value.trim() })} /></label>
            <label><span>Municipio o alcaldía</span><input value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Ecatepec, Iztapalapa, Tizayuca…" autoComplete="address-level2" onBlur={(e) => track('firma_campo', { campo: 'municipio', lleno: !!e.target.value.trim() })} /></label>
            <label><span>Estado</span><select value={firma.estado} onChange={(e) => { setFirma({ estado: e.target.value }); track('firma_campo', { campo: 'estado', lleno: !!e.target.value }); }}><option value="">Elige</option><option>Ciudad de México</option><option>Estado de México</option><option>Hidalgo</option><option>Morelos</option></select></label>
          </div>
        </details>
        {error ? <p className="error">No se pudo generar la carta: {error}</p> : null}
        <textarea className="carta ph-no-capture" onCopy={() => track('carta_copiada_manual', { puntos: n })} aria-label="Tu carta para la consulta" value={borrador ? borrador.texto : 'Armando tu carta…'} readOnly rows={borrador ? Math.min(40, borrador.texto.split('\n').length + 2) : 18} />
        <div className="acciones">
          <button type="button" className="btn ghost" onClick={copiar} disabled={n === 0}>{copiado ? 'Copiado' : 'Copiar texto'}</button>
          <a className="btn rust ph-no-capture" href={mailto} aria-disabled={n === 0} onClick={(e) => n === 0 ? e.preventDefault() : track('carta_enviada_correo', { puntos: n, firmada: !!firma.nombre, municipio: !!municipio })}>Enviar por correo a SEDATU<Check size={22} /></a>
        </div>
        {respondidas > 0 ? <button type="button" onClick={() => { if (confirm('¿Borrar todas tus respuestas?')) limpiar(); else track('respuestas_borrar_cancelado', { puntos: n }); }} style={{ background: 'none', border: 0, color: 'var(--rust)', textDecoration: 'underline', cursor: 'pointer', alignSelf: 'flex-start', padding: 0 }}>Borrar mis respuestas</button> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="dark" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong style={{ fontSize: 17 }}>Cómo enviarla</strong>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 8, color: '#d9d0ea' }}>
            <li>Manda el texto a <strong style={{ color: 'var(--bone)' }}>{borrador?.consulta.correo ?? 'participacion.dgomr@sedatu.gob.mx'}</strong> antes del 22 de noviembre de 2026. Pon tu nombre al final.</li>
            <li>Agrega tu colonia y un ejemplo concreto: las opiniones con lugar y página son más difíciles de ignorar.</li>
            <li>También puedes llevarla a un foro presencial o subirla en la página oficial de la consulta.</li>
          </ol>
        </div>
        <p className="small" style={{ margin: 0 }}>Tus respuestas se suman de forma anónima a <Link to="/resultados">Qué opinan otros</Link>: sin tu nombre ni tu colonia, solo tu municipio si lo escribes. No se envía nada a SEDATU por ti.</p>
      </div>
    </article>
  );
}
