// BusinessInspector - the right-hand inspector of /negocios, read as a report:
// Resumen, Competencia, Entorno, Fuentes, and a footer to print or share.
// Before a point exists it explains the page; before a giro exists it offers
// the picker. On a phone the chips row is handed in and sits at the top.

const nbNumber = (value) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });

function BusinessInspector({
    point,
    address,
    radius,
    radii,
    onRadiusChange,
    giros,
    maxGiros,
    stats,
    statsLoading,
    statsError,
    indicators,
    indicatorsLoading,
    categoriesData,
    categoriesLoading,
    pickerOpen,
    onPickerOpen,
    onPickerClose,
    onAddGiro,
    onRemoveGiro,
    onReset,
    isMobile,
    chipsSlot
}) {
    const [copied, setCopied] = React.useState(false);
    const scrollRef = React.useRef(null);

    const hasGiros = giros.length > 0;
    const showPicker = point && (pickerOpen || !hasGiros);

    React.useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTo({ top: 0 });
    }, [point && point.lat, point && point.lng, showPicker]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            window.prompt('Copia este enlace', window.location.href);
        }
    };

    const printReport = () => {
        if (window.analyticsService) {
            window.analyticsService.track('USER_CLICK_PDF_GENERATION', { coordinates: point, radius: radius, categories: giros.map((g) => g.codigo_act) });
        }
        window.print();
    };

    const radiusLabel = radius >= 1000 ? (radius / 1000) + ' km' : radius + ' m';
    const summary = stats && stats.summary;
    const categoryStats = (stats && stats.category_stats) || {};

    // The nearest establishment of the chosen giros, for the one-line reading.
    const nearest = React.useMemo(() => {
        if (!stats || !stats.records || !point || !window.turf) return null;
        let best = null;
        const from = turf.point([point.lng, point.lat]);
        stats.records.forEach((record) => {
            if (!record.geometry) return;
            const d = turf.distance(from, turf.point([record.geometry.lng, record.geometry.lat]), { units: 'meters' });
            if (!best || d < best.distance) best = { distance: d, record: record };
        });
        return best;
    }, [stats, point && point.lat, point && point.lng]);

    const perHabitant = (summary && indicators && indicators.population && summary.total_businesses > 0)
        ? Math.round(indicators.population / summary.total_businesses)
        : null;

    const renderRadiusControl = () => (
        <section className="xb-controls">
            <div className="xb-field">
                <span className="xb-eyebrow">Radio</span>
                <div className="xb-segmented" role="group" aria-label="Radio de alcance">
                    {radii.map((value) => (
                        <button
                            key={value}
                            type="button"
                            className={radius === value ? 'is-active' : ''}
                            aria-pressed={radius === value}
                            onClick={() => onRadiusChange(value)}
                        >
                            {value >= 1000 ? (value / 1000) + ' km' : value + ' m'}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );

    const renderEmpty = () => (
        <section className="xb-empty">
            <h2 className="xb-title">Estudia una zona antes de abrir</h2>
            <p className="xb-muted">
                Cuántos negocios como el tuyo ya hay alrededor de un punto, cuánta gente vive ahí
                y cómo es el entorno, con datos del DENUE, el Censo y la FGJ.
            </p>
            <ol className="xb-steps">
                <li>Escribe una dirección en la barra superior, o haz clic en el mapa para poner el pin.</li>
                <li>Elige hasta {maxGiros} giros, los tipos de negocio que te interesan.</li>
                <li>Cambia el radio para ver la zona a 100, 350 u 800 metros.</li>
            </ol>
        </section>
    );

    const renderPicker = () => (
        <GiroPicker
            categoriesData={categoriesData}
            categoriesLoading={categoriesLoading}
            giros={giros}
            maxGiros={maxGiros}
            onAdd={onAddGiro}
            onClose={hasGiros ? onPickerClose : null}
        />
    );

    const renderReport = () => (
        <React.Fragment>
            <section className="xb-section-head">
                <div>
                    <div className="xb-eyebrow" style={{ marginBottom: 6 }}>Informe de zona</div>
                    <h2 className="xb-title">{address || (point ? point.lat.toFixed(5) + ', ' + point.lng.toFixed(5) : '')}</h2>
                    <p className="xb-muted">
                        {giros.length === 1 ? 'Un giro' : giros.length + ' giros'} a {radiusLabel} · DENUE 2025 · Censo 2020 · FGJ 2022
                    </p>
                </div>
                <button type="button" className="xb-link" onClick={onReset}>Nueva zona</button>
            </section>

            {isMobile && renderRadiusControl()}

            <section className="xb-stats" aria-label="Resumen">
                <div className="xb-eyebrow">Resumen</div>
                <div className="xb-stats-grid">
                    <div className="xb-stat">
                        <div className="xb-stat-value">{statsLoading || !summary ? '…' : nbNumber(summary.total_businesses)}</div>
                        <div className="xb-muted">negocios</div>
                    </div>
                    <div className="xb-stat">
                        <div className="xb-stat-value">{statsLoading || !summary ? '…' : nbNumber(summary.total_jobs)}</div>
                        <div className="xb-muted">empleos</div>
                    </div>
                    <div className="xb-stat">
                        <div className="xb-stat-value">{indicatorsLoading || !indicators ? '…' : indicators.zones === 0 ? '—' : nbNumber(indicators.population)}</div>
                        <div className="xb-muted">habitantes</div>
                    </div>
                </div>
                {statsError ? (
                    <p className="nb-error">No se pudieron contar los negocios: {statsError}</p>
                ) : summary && !statsLoading ? (
                    <p className="nb-lede">
                        {summary.total_businesses === 0
                            ? 'No hay negocios de tus giros en este radio. Prueba con un radio mayor u otro giro.'
                            : (perHabitant ? 'Un negocio de tus giros por cada ' + nbNumber(perHabitant) + ' habitantes. ' : '') +
                              (nearest ? 'El más cercano está a ' + nbNumber(nearest.distance) + ' m.' : '')}
                    </p>
                ) : (
                    <p className="nb-lede">Contando los negocios del DENUE dentro del radio…</p>
                )}
            </section>

            <section className="xb-group" aria-label="Competencia por giro">
                <div className="xb-section-head">
                    <div className="xb-eyebrow">Competencia por giro</div>
                    <span className="xb-muted" style={{ fontSize: 12 }}>negocios · empleos</span>
                </div>
                {giros.map((giro) => {
                    const row = categoryStats[giro.codigo_act];
                    return (
                        <div key={giro.codigo_act} className={'nb-row' + (giro.visible ? '' : ' is-off')}>
                            <span className="nb-chip-dot" aria-hidden="true" style={{ background: giro.color }}></span>
                            <span className="nb-row-name" title={giro.nombre_act}>{giro.nombre_act}</span>
                            <span className="nb-row-value">
                                {statsLoading ? '…' : row ? nbNumber(row.count) + ' · ' + nbNumber(row.total_jobs) : '0 · 0'}
                            </span>
                            <button type="button" className="nb-row-remove" onClick={() => onRemoveGiro(giro)} aria-label={'Quitar ' + giro.nombre_act} title="Quitar giro">
                                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                            </button>
                        </div>
                    );
                })}
                {giros.length < maxGiros && (
                    <button type="button" className="xb-link" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={onPickerOpen}>Añadir giro</button>
                )}
                {nearest && !statsLoading && (
                    <div className="nb-callout" style={{ marginTop: 6 }}>
                        <div className="xb-legend-head">
                            <span className="nb-callout-head">Más cercano</span>
                            <span className="xb-muted">a {nbNumber(nearest.distance)} m</span>
                        </div>
                        <span>{nearest.record.nom_estab || 'Sin nombre'}</span>
                        <span className="xb-muted" style={{ fontSize: 12 }}>
                            {nearest.record.nombre_act}{nearest.record.per_ocu ? ' · ' + nearest.record.per_ocu : ''}
                        </span>
                    </div>
                )}
            </section>

            <section className="xb-group" aria-label="Entorno">
                <div className="xb-eyebrow">Entorno</div>
                {indicatorsLoading || !indicators ? (
                    <p className="nb-lede">Leyendo las zonas censales que toca el radio…</p>
                ) : indicators.zones === 0 ? (
                    <p className="nb-lede">No hay zonas censales con datos para este punto.</p>
                ) : (
                    <React.Fragment>
                        <div className="nb-row">
                            <span className="nb-row-name">Viviendas con internet</span>
                            <span className="nb-row-value">{nbNumber(indicators.housingInternet)} <small>· sin internet {nbNumber(indicators.housingNoInternet)}</small></span>
                        </div>
                        <div className="nb-row">
                            <span className="nb-row-name">Robos a negocios</span>
                            <span className="nb-row-value">{nbNumber(indicators.businessThefts)} <small>casos · 2022</small></span>
                        </div>
                        <div className="nb-row">
                            <span className="nb-row-name">Robos en transporte público</span>
                            <span className="nb-row-value">{nbNumber(indicators.thefts)} <small>casos · 2022</small></span>
                        </div>
                        <div className="nb-row">
                            <span className="nb-row-name">Estaciones de transporte</span>
                            <span className="nb-row-value">{nbNumber(indicators.stations)}{indicators.stationNames ? <small> · {indicators.stationNames}</small> : null}</span>
                        </div>
                        <p className="xb-muted" style={{ fontSize: 12, margin: '2px 0 0' }}>
                            Sumas de las {indicators.zones === 1 ? 'zona censal (AGEB) que toca' : indicators.zones + ' zonas censales (AGEB) que toca'} el radio.
                        </p>
                    </React.Fragment>
                )}
                <a
                    href="/explorar"
                    className="xb-link"
                    style={{ alignSelf: 'flex-start', marginTop: 4, textDecoration: 'none' }}
                    onClick={(e) => { e.preventDefault(); if (window.navigate) window.navigate('/explorar'); else window.location.href = '/explorar'; }}
                >
                    Ver esta zona en Explorar
                </a>
            </section>

            <section className="nb-sources" aria-label="Fuentes">
                <div className="xb-eyebrow">Fuentes</div>
                <div>DENUE, INEGI · unidades económicas y personal ocupado</div>
                <div>Censo de Población y Vivienda 2020, INEGI · por AGEB</div>
                <div>Carpetas de investigación, FGJ CDMX · 2022</div>
                <div>Ciudad MX · redes de transporte</div>
            </section>
        </React.Fragment>
    );

    return (
        <aside className="xb-inspector" aria-label="Informe de la zona">
            {chipsSlot}
            <div className="vertical-panel-content xb-scroll" ref={scrollRef}>
                {!point && renderEmpty()}
                {!point && isMobile && renderRadiusControl()}
                {showPicker && renderPicker()}
                {point && hasGiros && !pickerOpen && renderReport()}
            </div>
            {point && hasGiros && !pickerOpen && (
                <div className="nb-foot">
                    <button type="button" className="nb-btn is-primary" onClick={printReport}>Descargar PDF</button>
                    <button type="button" className="nb-btn" onClick={copyLink}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
                </div>
            )}
        </aside>
    );
}

// GiroPicker - search the DENUE activity catalogue and add up to maxGiros.
function GiroPicker({ categoriesData, categoriesLoading, giros, maxGiros, onAdd, onClose }) {
    const [query, setQuery] = React.useState('');
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const chosen = new Set(giros.map((g) => g.codigo_act));
    const full = giros.length >= maxGiros;
    const text = query.trim().toLowerCase();
    const matches = React.useMemo(() => {
        if (!categoriesData || text.length < 2) return [];
        return categoriesData
            .filter((c) => (c.nombre_act || '').toLowerCase().includes(text) || (c.codigo_act || '').startsWith(text))
            .slice(0, 8);
    }, [categoriesData, text]);

    return (
        <section className="nb-picker" aria-label="Añadir giro">
            <div className="xb-section-head">
                <div>
                    <h2 className="xb-title">{giros.length === 0 ? '¿Qué negocio quieres abrir?' : 'Añadir giro'}</h2>
                    <p className="xb-muted">
                        {full
                            ? 'Ya elegiste ' + maxGiros + ' giros. Quita uno para añadir otro.'
                            : 'Busca en el catálogo del DENUE: cafetería, farmacia, tortillería, consultorio…'}
                    </p>
                </div>
                {onClose && <button type="button" className="xb-link" onClick={onClose}>Listo</button>}
            </div>
            {!full && (
                <input
                    ref={inputRef}
                    type="search"
                    className="nb-picker-input"
                    placeholder={categoriesLoading ? 'Cargando el catálogo…' : 'Escribe un giro'}
                    aria-label="Buscar un giro"
                    value={query}
                    disabled={categoriesLoading}
                    onChange={(e) => setQuery(e.target.value)}
                />
            )}
            {!full && text.length >= 2 && matches.length === 0 && !categoriesLoading && (
                <p className="xb-muted">Ningún giro coincide con “{query.trim()}”.</p>
            )}
            {!full && matches.length > 0 && (
                <div className="nb-picker-list" role="list">
                    {matches.map((category) => (
                        <button
                            key={category.codigo_act}
                            type="button"
                            className="nb-picker-item"
                            role="listitem"
                            disabled={chosen.has(category.codigo_act)}
                            onClick={() => { onAdd(category); setQuery(''); }}
                        >
                            <span className="nb-row-name" title={category.nombre_act}>{category.nombre_act}</span>
                            <code>{category.codigo_act}</code>
                        </button>
                    ))}
                </div>
            )}
            {giros.length > 0 && (
                <div className="xb-group">
                    <div className="xb-eyebrow">Elegidos</div>
                    {giros.map((giro) => (
                        <div key={giro.codigo_act} className="nb-row">
                            <span className="nb-chip-dot" aria-hidden="true" style={{ background: giro.color }}></span>
                            <span className="nb-row-name" title={giro.nombre_act}>{giro.nombre_act}</span>
                            <code style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--xb-muted)' }}>{giro.codigo_act}</code>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

window.BusinessInspector = BusinessInspector;
