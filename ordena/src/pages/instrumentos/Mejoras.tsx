export function Mejoras() {
  return (
    <>
      <section className="banner dark">
        <div className="wrap banner-grid">
          <div>
            <span className="k" style={{ color: 'var(--lilac)' }}>Ya existe, se reforma · pp. 176 y 177</span>
            <h1 className="h-light">Contribución de <strong>mejoras</strong></h1>
            <p style={{ color: '#d9d0ea' }}>Si una obra pública sube el valor de tu casa, tú pagas una parte de la obra. Ya está en las leyes de los cuatro estados y casi no se usa. El plan propone seis cambios para que sí funcione, sobre todo para financiar Metro, trenes y Metrobús.</p>
          </div>
          <div style={{ borderColor: '#3a2a55' }}><span className="num" style={{ color: 'var(--yellow)' }}>100 %</span><span style={{ fontWeight: 300, fontSize: 16, color: '#d9d0ea' }}>del costo de la obra podría cubrirse con esta contribución, con tope por capacidad de pago · p. 176</span></div>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h-light h2">¿Quién es <strong>beneficiario</strong>?</h2>
        <p className="muted" style={{ margin: 0, maxWidth: '72ch', fontSize: 15 }}>Hoy el área de beneficio se traza por frentes de calle. Para una estación de Metro el plan pide otro método: superficie, uso e intensidad de los inmuebles y morfología de la zona, calculado obra por obra (p. 177).</p>
        <div className="two" style={{ background: '#fff', border: '1px solid var(--line)', padding: 20 }}>
          <svg aria-label="Una estación con tres anillos de beneficio; el más cercano paga más" role="img" viewBox="0 0 560 300" style={{ width: '100%', height: 'auto' }}>
            <rect width="560" height="300" fill="#f3f1ec" />
            <circle cx="280" cy="150" r="140" fill="#ece6f8" /><circle cx="280" cy="150" r="95" fill="#cdbdff" /><circle cx="280" cy="150" r="50" fill="#9b7bff" />
            <rect x="0" y="142" width="560" height="16" fill="#1e0f33" /><rect x="262" y="128" width="36" height="44" fill="#c2531f" />
            <g fill="#1e0f33" fontFamily="Inter Tight, sans-serif" fontSize="13" fontWeight="600"><text x="300" y="112">A · 0 a 300 m</text><text x="340" y="70">B · 300 a 600 m</text><text x="395" y="30">C · 600 a 900 m</text></g>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 15 }}>
            <span><strong>Anillo A:</strong> mayor valorización, mayor cuota.</span>
            <span><strong>Anillo B:</strong> cuota media.</span>
            <span><strong>Anillo C:</strong> cuota baja. Fuera del anillo, nada.</span>
            <span className="small">Los anillos son un ejemplo de método por distancia. Un local comercial frente a la estación no paga igual que una casa.</span>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h-light h2">El orden <strong>importa</strong>: primero el acuerdo, luego la obra</h2>
        <div className="timeline c5">
          <div><span className="num" style={{ fontSize: 28, color: 'var(--violet)' }}>1</span><strong>Proyecto y costo</strong><span className="muted" style={{ fontSize: 14 }}>La autoridad presenta la obra con costos directos e indirectos.</span></div>
          <div><span className="num" style={{ fontSize: 28, color: 'var(--violet)' }}>2</span><strong>Área y reparto</strong><span className="muted" style={{ fontSize: 14 }}>Quién se beneficia y cuánto le toca a cada predio, con tope por capacidad de pago.</span></div>
          <div className="rust"><span className="num" style={{ fontSize: 28, color: 'var(--rust)' }}>3</span><strong>Acuerdo de los beneficiarios</strong><span className="muted" style={{ fontSize: 14 }}>Requisito previo: los vecinos aprueban proyecto, costos y reparto antes de la obra (p. 177).</span></div>
          <div><span className="num" style={{ fontSize: 28, color: 'var(--violet)' }}>4</span><strong>Obra con seguimiento</strong><span className="muted" style={{ fontSize: 14 }}>Mecanismos constantes para ver el avance.</span></div>
          <div className="ink"><span className="num" style={{ fontSize: 28 }}>5</span><strong>Cobro</strong><span className="muted" style={{ fontSize: 14 }}>Aunque la obra se pagó con fondos federales o privados, la contribución se cobra igual (p. 176).</span></div>
        </div>
      </section>

      <section className="wrap section two">
        <div>
          <h2 className="h-light h2">Los <strong>seis cambios</strong> que pide el plan</h2>
          <ol style={{ margin: 0, paddingLeft: 22, fontSize: 15, lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>Que pueda cubrir el <strong>costo total</strong> de la obra.</li>
            <li>Que se cobre <strong>sin importar de dónde salió</strong> el dinero inicial.</li>
            <li>Que sirva para <strong>transporte masivo y semimasivo</strong> y sus estaciones.</li>
            <li>Que el área de beneficio se calcule con <strong>métodos flexibles</strong>, obra por obra.</li>
            <li>Que haya <strong>acuerdo previo</strong> de los beneficiarios y seguimiento.</li>
            <li>Que municipios y estados puedan <strong>convenir entre sí</strong> cuando la valorización cruza límites.</li>
          </ol>
        </div>
        <div className="ex">
          <span className="k">Ejemplo ilustrativo · cifras inventadas para mostrar el reparto</span>
          <div><span style={{ fontSize: 14, color: 'var(--lilac)' }}>Una estación nueva de tren ligero cuesta</span><div className="num" style={{ fontSize: 40 }}>$400 millones</div></div>
          <div className="bars" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #3a2a55', paddingTop: 14 }}>
            {[['Fondos del Fideicomiso', 60, '#9b7bff'], ['Anillo A · 800 predios', 22, '#c2531f'], ['Anillo B · 1,600 predios', 13, '#c2531f'], ['Anillo C · 2,400 predios', 5, '#c2531f']].map(([l, p, c]) => (
              <div key={l as string}><span>{l}</span><span className="track"><span className="fill" style={{ width: `${p}%`, background: c as string }} /></span><span className="pct">{p} %</span></div>
            ))}
          </div>
          <span style={{ fontSize: 14, color: '#d9d0ea' }}>Una casa del anillo A pagaría unos $110,000, quizá en 10 años. Una del anillo C, unos $8,000.</span>
        </div>
      </section>

      <section className="wrap open-ask" style={{ paddingBottom: 24 }}>
        <div className="open" style={{ gridColumn: '1 / -1' }}>
          <span className="k">Lo que el plan deja abierto</span>
          <ul>
            <li>Qué porcentaje de beneficiarios debe aprobar para que el acuerdo valga.</li>
            <li>Cómo se mide capacidad de pago y quién queda exento.</li>
            <li>Si un inquilino puede acabar pagándola a través de la renta.</li>
            <li>Plazos de pago y qué pasa si alguien no puede cubrirla.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
