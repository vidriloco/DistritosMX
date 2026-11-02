export function Baldios() {
  return (
    <>
      <section className="banner" style={{ background: 'var(--rust)', color: 'var(--bone)' }}>
        <div className="wrap banner-grid">
          <div>
            <span className="k" style={{ opacity: .8 }}>Instrumento nuevo · pp. 169 a 171</span>
            <h1 className="h-light">Impuesto al <strong>desperdicio urbano</strong></h1>
            <p>Un cobro anual a los terrenos vacíos o casi vacíos que están en zonas con agua, drenaje, transporte y escuelas. La idea: si la ciudad ya pagó los servicios, dejar el terreno sin usar le cuesta a todos. No grava la propiedad, grava el desperdicio.</p>
          </div>
          <div><span className="num">≥ 1 %</span><span style={{ fontWeight: 300, fontSize: 16 }}>del valor del terreno, cada año, como tasa mínima sugerida · p. 170</span></div>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h-light h2">¿Qué cuenta como <strong>desperdicio</strong>?</h2>
        <p className="muted" style={{ margin: 0, maxWidth: '70ch', fontSize: 15 }}>Solo dentro de polígonos consolidados y prioritarios, con infraestructura y servicios suficientes. Basta con cumplir una de estas cuatro condiciones (p. 169).</p>
        <div className="rgrid c4 white">
          <div><svg aria-hidden="true" viewBox="0 0 120 80" width="120" height="80"><rect x="2" y="2" width="116" height="76" fill="#f3f1ec" stroke="#1e0f33" strokeWidth="2" strokeDasharray="6 4" /></svg><strong>Sin construcción</strong><span className="muted" style={{ fontSize: 14 }}>Terreno baldío en zona con servicios.</span></div>
          <div><svg aria-hidden="true" viewBox="0 0 120 80" width="120" height="80"><rect x="2" y="2" width="116" height="76" fill="#f3f1ec" stroke="#1e0f33" strokeWidth="2" /><rect x="8" y="50" width="26" height="22" fill="#c2531f" /></svg><strong>Casi vacío</strong><span className="muted" style={{ fontSize: 14 }}>Lo construido usa menos del 25 % de lo que permite la zonificación (CUS &lt; 0.25).</span></div>
          <div><svg aria-hidden="true" viewBox="0 0 120 80" width="120" height="80"><rect x="2" y="2" width="116" height="76" fill="#f3f1ec" stroke="#1e0f33" strokeWidth="2" /><path d="M20 72 L20 30 L50 18 L80 30 L80 72Z" fill="none" stroke="#c2531f" strokeWidth="3" strokeDasharray="7 5" /></svg><strong>Abandono o ruina</strong><span className="muted" style={{ fontSize: 14 }}>Predio inhabitable por abandono.</span></div>
          <div><svg aria-hidden="true" viewBox="0 0 120 80" width="120" height="80"><rect x="2" y="2" width="116" height="76" fill="#f3f1ec" stroke="#1e0f33" strokeWidth="2" /><rect x="14" y="20" width="50" height="52" fill="#5b2bd6" /><rect x="72" y="52" width="34" height="20" fill="#c2531f" /></svg><strong>Construcción que vale poco</strong><span className="muted" style={{ fontSize: 14 }}>Lo edificado vale menos del 50 % del terreno, según avalúo.</span></div>
        </div>
      </section>

      <section className="wrap section two">
        <div>
          <h2 className="h-light h2">¿Cómo se <strong>calcula</strong>?</h2>
          <div className="numlist">
            <div><span className="n">1</span><span><strong>Base: cuánto vale el terreno si se usara al máximo.</strong> <span className="muted">El valor residual del suelo con el mejor uso que permite la zonificación, o el valor comercial de inmuebles iguales. Lo fija un valuador acreditado (p. 170).</span></span></div>
            <div><span className="n">2</span><span><strong>Tasa: al menos 1 % al año.</strong> <span className="muted">Sugerida, no fijada. Cada estado la escribe en su ley de ingresos.</span></span></div>
            <div><span className="n">3</span><span><strong>Factor por tamaño: de 1 a 1.5.</strong> <span className="muted">Factor 1 si el terreno mide igual o menos que el lote típico de la colonia; sube hasta 1.5 según cuántas veces lo supere (p. 170).</span></span></div>
            <div><span className="n">4</span><span><strong>Impuesto = base × tasa × factor.</strong> <span className="muted">Lo administra y cobra el municipio; en CDMX, el gobierno central.</span></span></div>
          </div>
        </div>
        <div className="ex">
          <span className="k">Ejemplo ilustrativo · cifras inventadas para mostrar la fórmula</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {[['Terreno en colonia consolidada', '600 m²'], ['Lote típico de la colonia', '200 m²'], ['Valor residual (avalúo)', '$6,000,000'], ['Supera 3 veces el lote moda', 'factor 1.5']].map(([l, v]) => (
              <div key={l} style={{ borderLeft: '3px solid var(--yellow)', paddingLeft: 12 }}><span style={{ fontSize: 13, color: 'var(--lilac)' }}>{l}</span><br /><strong style={{ fontSize: 24 }}>{v}</strong></div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #3a2a55', paddingTop: 16 }}>
            <span style={{ color: '#d9d0ea' }}>$6,000,000 × 1 % × 1.5 =</span>
            <div className="num big">$90,000 al año</div>
            <span style={{ fontSize: 14, color: '#d9d0ea' }}>Si el mismo terreno midiera 200 m² (factor 1) y valiera $2,000,000, pagaría $20,000 al año. Si se construye conforme a la zonificación, deja de pagar.</span>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h-light h2">Y si aun así no se construye: <strong>polígonos prioritarios</strong></h2>
        <p className="muted" style={{ margin: 0, maxWidth: '72ch', fontSize: 15 }}>Un segundo instrumento acompaña al impuesto (pp. 170 y 171). La autoridad declara un polígono, cataloga los baldíos y pone plazo. El plan lo describe como no expropiatorio: el dueño recibe el dinero de la subasta.</p>
        <div className="timeline">
          <div><span className="k" style={{ color: 'var(--violet)' }}>Año 0</span><strong>Declaratoria</strong><span className="muted" style={{ fontSize: 14 }}>El municipio publica el polígono y la lista de predios baldíos o subutilizados.</span></div>
          <div><span className="k" style={{ color: 'var(--violet)' }}>Años 1 a 2</span><strong>Plazo para edificar</strong><span className="muted" style={{ fontSize: 14 }}>Mientras tanto se paga el impuesto. Construir conforme a la norma libera el predio.</span></div>
          <div className="rust"><span className="k" style={{ color: 'var(--rust)' }}>Años 2 a 4</span><strong>Plazo máximo</strong><span className="muted" style={{ fontSize: 14 }}>Entre 2 y 4 años según lo que fije la declaratoria.</span></div>
          <div className="ink"><span className="k">Si vence</span><strong>Venta forzosa en subasta pública</strong><span className="muted" style={{ fontSize: 14 }}>Un privado compra y se obliga a construir. El dueño original recibe el pago.</span></div>
        </div>
      </section>

      <section className="wrap open-ask" style={{ paddingBottom: 24 }}>
        <div className="open" style={{ gridColumn: '1 / -1' }}>
          <span className="k">Lo que el plan deja abierto</span>
          <ul>
            <li>La tasa exacta, la periodicidad, las excepciones y la gradualidad: cada estado y municipio las define con estudios de factibilidad (p. 170).</li>
            <li>No hay exención escrita para herencias, pequeños propietarios o predios en litigio.</li>
            <li>Requiere reformar las leyes fiscales de las cuatro entidades antes de cobrarse (p. 169).</li>
            <li>No dice a dónde va lo recaudado: al Fideicomiso Metropolitano o al municipio.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
