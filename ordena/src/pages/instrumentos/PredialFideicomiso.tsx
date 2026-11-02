const Arrow = () => <svg aria-hidden="true" width="52" height="40" viewBox="0 0 52 40" fill="none" stroke="#1e0f33" strokeWidth="3"><path d="M0 20h40M30 8l12 12-12 12" /></svg>;

export function PredialFideicomiso() {
  return (
    <>
      <section className="banner" style={{ background: 'var(--yellow)', color: 'var(--ink)' }}>
        <div className="wrap banner-grid">
          <div>
            <span className="k" style={{ opacity: .7 }}>Instrumentos existente y nuevo · pp. 174 a 176</span>
            <h1 className="h-light">El predial que ya existe y el <strong>fondo que no existe</strong></h1>
            <p style={{ opacity: .9 }}>El predial es el impuesto con más espacio para crecer y el peor cobrado. El plan propone cobrarlo bien en tres fases y mandar una parte a un fondo común nuevo, el Fideicomiso Metropolitano, que pagaría las obras que ningún municipio puede pagar solo.</p>
          </div>
          <div style={{ borderColor: 'rgba(30,15,51,.3)' }}><span className="num">3 + 1</span><span style={{ fontWeight: 300, fontSize: 16 }}>fases para el predial y un fideicomiso que las recoge</span></div>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h-light h2">Predial: <strong>tres fases</strong>, de lo fácil a lo que requiere ley</h2>
        <div className="rgrid c3 white">
          <div><span className="k" style={{ color: 'var(--violet)', fontSize: 12 }}>1 · Sin cambiar leyes</span><strong style={{ fontSize: 18 }}>Cobrar lo que ya dice la ley</strong><span className="muted" style={{ fontSize: 14 }}>Convenios para que el estado haga todo el ciclo: determinar, inspeccionar, cobrar y ejecutar créditos fiscales (p. 174).</span></div>
          <div><span className="k" style={{ color: 'var(--violet)', fontSize: 12 }}>2 · Técnica</span><strong style={{ fontSize: 18 }}>Actualizar el catastro a valor de mercado</strong><span className="muted" style={{ fontSize: 14 }}>Valuación masiva y cartografía catastral con nuevas tecnologías. Es donde tu recibo puede subir aunque la tasa no cambie (p. 174).</span></div>
          <div><span className="k" style={{ color: 'var(--rust)', fontSize: 12 }}>3 · Requiere reforma</span><strong style={{ fontSize: 18 }}>Ajustar base, cuotas y tarifas</strong><span className="muted" style={{ fontSize: 14 }}>Cambios a las leyes hacendarias estatales, discutidos en el Parlamento Metropolitano (p. 174).</span></div>
        </div>
        <p className="small" style={{ margin: 0 }}>Y una decisión política: una proporción del predial se transferiría al Fideicomiso Metropolitano (p. 174). El plan no dice qué proporción.</p>
      </section>

      <section className="wrap section">
        <h2 className="h-light h2">Fideicomiso Metropolitano: <strong>quién pone, quién decide, a qué va</strong></h2>
        <div className="flow" style={{ gridTemplateColumns: 'minmax(0, 4fr) 72px minmax(0, 4fr) 72px minmax(0, 4fr)' }}>
          <div className="col">
            <span className="k" style={{ fontSize: 12 }} >Fideicomitentes · quién pone</span>
            <div className="src"><span><strong>Gobierno federal</strong><br /><span className="muted">a través de la secretaría competente</span></span></div>
            <div className="src"><span><strong>CDMX, Edomex, Hidalgo, Morelos</strong><br /><span className="muted">lo que fijen sus congresos</span></span></div>
            <div className="src nuevo"><span><strong>Municipios</strong><br /><span className="muted">directo o vía convenios: predial, baldíos, plusvalías, suelo periférico</span></span></div>
          </div>
          <div className="arr"><Arrow /></div>
          <div className="fondo">
            <span className="k" style={{ fontSize: 12, color: 'var(--lilac)' }}>Estructura · quién decide</span>
            <div style={{ fontSize: 14 }}><strong>Fiduciaria</strong><br /><span style={{ color: 'var(--lilac)', fontSize: 13 }}>un banco que custodia el dinero</span></div>
            <div style={{ fontSize: 14 }}><strong>Comité Técnico</strong><br /><span style={{ color: 'var(--lilac)', fontSize: 13 }}>recibe las solicitudes y decide</span></div>
            <div style={{ fontSize: 14 }}><strong>Secretariado Técnico Conjunto</strong><br /><span style={{ color: 'var(--lilac)', fontSize: 13 }}>redacta el proyecto</span></div>
            <div style={{ fontSize: 14 }}><strong>Consejo de Desarrollo Metropolitano</strong><br /><span style={{ color: 'var(--lilac)', fontSize: 13 }}>lo aprueba · p. 175</span></div>
          </div>
          <div className="arr"><Arrow /></div>
          <div className="col">
            <span className="k" style={{ fontSize: 12 }}>Destino · a qué va</span>
            <div className="dst"><strong>Solo obras de interés metropolitano</strong> · p. 176</div>
            <div className="dst"><strong>Agencias de servicios intermunicipales</strong></div>
            <div className="dst gap"><strong>Montos y periodicidad: por definir</strong></div>
          </div>
        </div>
      </section>

      <section className="wrap open-ask" style={{ paddingBottom: 24 }}>
        <div className="open" style={{ gridColumn: '1 / -1' }}>
          <span className="k">Lo que el plan deja abierto</span>
          <ul>
            <li>Cuánto pone cada gobierno y con qué periodicidad: lo fija el contrato que aún no existe.</li>
            <li>Quién se sienta en el Comité Técnico. No se menciona participación ciudadana ni de los municipios pequeños.</li>
            <li>Cómo se priorizan los proyectos cuando el dinero no alcanza para los diez prioritarios.</li>
            <li>Qué tan público será: no hay obligación escrita de datos abiertos ni de informes.</li>
            <li>Si tu predial sube por la actualización catastral, no hay tope ni gradualidad definidos.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
