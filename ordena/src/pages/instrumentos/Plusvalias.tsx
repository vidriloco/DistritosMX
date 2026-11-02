export function Plusvalias() {
  return (
    <>
      <section className="banner" style={{ background: 'var(--violet-deep)', color: 'var(--bone)' }}>
        <div className="wrap banner-grid">
          <div>
            <span className="k" style={{ color: 'var(--lilac)' }}>Instrumento nuevo · pp. 174 y 175</span>
            <h1 className="h-light">Captura de <strong>plusvalías</strong></h1>
            <p>Cuando la ciudad permite construir más pisos, cambiar el uso de un terreno o urbanizar lo que era campo, el terreno vale más de un día para otro. Ese aumento lo produce la sociedad, no el dueño. El plan propone que parte de esa ganancia regrese al municipio.</p>
          </div>
          <div><span className="num">3</span><span style={{ fontWeight: 300, fontSize: 16 }}>momentos en que el suelo se valoriza y el plan quiere cobrar · p. 174</span></div>
        </div>
      </section>

      <section className="wrap section two" style={{ alignItems: 'center' }}>
        <div>
          <h2 className="h-light h2">Pisos gratis, <strong>pisos que retribuyen</strong></h2>
          <p className="muted" style={{ margin: 0, fontSize: 15 }}>En zonas donde la norma permite densificar, el dueño puede construir hasta un <strong>potencial básico</strong> sin pagar nada. Si su proyecto quiere llegar al <strong>potencial máximo</strong>, retribuye al municipio antes de obtener el permiso. La zonificación deja de ser un regalo y se vuelve un recurso al que se accede a cambio de algo (p. 174).</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          <svg aria-label="Edificio: cuatro pisos básicos gratuitos y tres adicionales que retribuyen" role="img" viewBox="0 0 320 300" width="280" height="262">
            <rect x="0" y="292" width="320" height="8" fill="#1e0f33" />
            {[52, 86, 120].map((y) => <rect key={y} x="80" y={y} width="160" height="30" fill="#5b2bd6" />)}
            {[154, 188, 222].map((y) => <rect key={y} x="80" y={y} width="160" height="30" fill="#9b7bff" />)}
            <rect x="80" y="256" width="160" height="36" fill="#9b7bff" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
            <span style={{ display: 'flex', gap: 10 }}><span style={{ width: 16, height: 16, background: '#5b2bd6', flexShrink: 0, marginTop: 3 }} /><span><strong>Pisos 5 a 7: potencial máximo.</strong><br /><span className="muted">Solo si el dueño retribuye.</span></span></span>
            <span style={{ display: 'flex', gap: 10 }}><span style={{ width: 16, height: 16, background: '#9b7bff', flexShrink: 0, marginTop: 3 }} /><span><strong>Pisos 1 a 4: potencial básico.</strong><br /><span className="muted">Gratis, como hoy.</span></span></span>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h-light h2">Las <strong>tres modalidades</strong></h2>
        <div className="rgrid c3 white">
          <div><span className="k" style={{ color: 'var(--violet)', fontSize: 12 }}>i · Más edificabilidad</span><strong style={{ fontSize: 17, lineHeight: 1.25 }}>Construir por encima del potencial básico en zonas que la norma deja densificar.</strong><span className="muted" style={{ fontSize: 14 }}>Aplica en corredores y centralidades.</span></div>
          <div><span className="k" style={{ color: 'var(--rust)', fontSize: 12 }}>ii · Suelo periférico</span><strong style={{ fontSize: 17, lineHeight: 1.25 }}>Convertir suelo rural o vacío en urbanizable en la orilla de la ciudad.</strong><span className="muted" style={{ fontSize: 14 }}>La diferencia entre el valor rural y el urbano es la plusvalía que se captura. Es también un freno a la expansión.</span></div>
          <div><span className="k" style={{ color: '#9a7a12', fontSize: 12 }}>iii · Cambio de uso</span><strong style={{ fontSize: 17, lineHeight: 1.25 }}>Subir COS, CUS o niveles por encima del máximo, o aprovechar zonas no urbanizables.</strong><span className="muted" style={{ fontSize: 14 }}>De casa a comercio, de dos niveles a diez. Cada cambio paga una retribución.</span></div>
        </div>
      </section>

      <section className="wrap section two">
        <div>
          <h2 className="h-light h2">¿Cómo se <strong>paga</strong>?</h2>
          <div className="rgrid" style={{ gridTemplateColumns: '1fr' }}>
            {[['A', 'En suelo: cede terreno, de preferencia en zona consolidada del mismo municipio.'], ['B', 'En obra pública: construye lo que la autoridad indique, donde lo indique.'], ['C', 'En dinero: aportación económica al municipio o al estado.']].map(([l, t]) => (
              <div key={l} style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 14, background: '#fff', padding: '14px 18px' }}><span style={{ width: 40, height: 40, background: 'var(--violet)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{l}</span><span style={{ fontSize: 15 }}>{t}</span></div>
            ))}
          </div>
        </div>
        <div className="ex">
          <span className="k">Porcentajes por uso · el principio, no las cifras</span>
          <p style={{ margin: 0, fontSize: 15, color: '#d9d0ea' }}>El plan no fija porcentajes. Sí fija la regla: más alto para lo más rentable, más bajo para vivienda social (p. 175).</p>
          <div className="bars" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><span>Comercio y oficinas</span><span className="track"><span className="fill" style={{ width: '85%', background: 'var(--rust)' }} /></span></div>
            <div><span>Vivienda media</span><span className="track"><span className="fill" style={{ width: '50%', background: '#9b7bff' }} /></span></div>
            <div><span>Vivienda social</span><span className="track"><span className="fill" style={{ width: '15%', background: 'var(--yellow)' }} /></span></div>
          </div>
          <span style={{ fontSize: 12, color: '#9a8fb5' }}>Barras ilustrativas; los valores reales saldrían de corridas financieras por municipio (p. 174).</span>
        </div>
      </section>

      <section className="wrap open-ask" style={{ paddingBottom: 24 }}>
        <div className="open" style={{ gridColumn: '1 / -1' }}>
          <span className="k">Lo que el plan deja abierto</span>
          <ul>
            <li>Los porcentajes, el potencial básico y el máximo de cada zona: se calibran municipio por municipio.</li>
            <li>Si se cobra como impuesto o como condición no fiscal: cada estado decide (p. 174).</li>
            <li>Qué pasa si el desarrollador traslada el costo al precio de venta. El plan asume que el precio del suelo baja, no lo garantiza.</li>
            <li>La coordinación entre municipios vecinos para que no compitan bajando la retribución.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
