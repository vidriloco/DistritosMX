// BusinessInspector - the right-hand inspector of /negocios, read as a report:
// a one-sentence verdict with the key figures, then Competencia, Gente and
// Seguridad as titled sections, Fuentes last, and a footer to print or share.
// Before a point exists it explains the page; before a giro exists it offers
// the picker. On a phone the chips row is handed in and sits at the top.

const nbNumber = (value) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });

// A picture of the map for the printed report: the ring and its
// establishments, cropped to the radius, with the chosen point drawn in (the
// pin is an HTML marker, not part of the canvas). WebGL clears its buffer
// after each frame, so the pixels are read inside a render callback. Resolves
// to a data URL, or null when the map cannot be read in time.
const nbMapSnapshot = (point, radius) => new Promise((resolve) => {
    const map = window.map;
    if (!map || !window.turf) return resolve(null);
    const [west, south, east, north] = turf.bbox(turf.circle([point.lng, point.lat], radius / 1000, { steps: 64, units: 'kilometers' }));
    const timer = setTimeout(() => resolve(null), 9000);

    const grab = () => {
        map.once('render', () => {
            clearTimeout(timer);
            try {
                const source = map.getCanvas();
                const scale = source.width / source.clientWidth;
                const sw = map.project([west, south]);
                const ne = map.project([east, north]);
                // The ring with a little room around it, widened towards a
                // landscape frame where the map has the width, so the page
                // gets more street context instead of a tall square.
                const margin = (ne.x - sw.x) * 0.08;
                const y0 = Math.max(0, ne.y - margin);
                const y1 = Math.min(source.clientHeight, sw.y + margin);
                const half = Math.max(ne.x - sw.x + 2 * margin, (y1 - y0) * 1.5) / 2;
                const middle = (sw.x + ne.x) / 2;
                const x0 = Math.max(0, middle - half);
                const x1 = Math.min(source.clientWidth, middle + half);
                const out = document.createElement('canvas');
                out.width = Math.round((x1 - x0) * scale);
                out.height = Math.round((y1 - y0) * scale);
                const ctx = out.getContext('2d');
                ctx.drawImage(source, x0 * scale, y0 * scale, out.width, out.height, 0, 0, out.width, out.height);
                const pin = map.project([point.lng, point.lat]);
                ctx.beginPath();
                ctx.arc((pin.x - x0) * scale, (pin.y - y0) * scale, 7 * scale, 0, Math.PI * 2);
                ctx.fillStyle = '#111111';
                ctx.fill();
                ctx.lineWidth = 3 * scale;
                ctx.strokeStyle = '#FFFFFF';
                ctx.stroke();
                resolve(out.toDataURL('image/jpeg', 0.9));
            } catch (error) {
                resolve(null);
            }
        });
        map.triggerRepaint();
    };

    // The report can be ready before the map is: the establishments layer is
    // added once the style loads, its GeoJSON is parsed in a worker, and the
    // first fit to the ring is animated. Wait for all of it.
    const settled = () => map.isStyleLoaded() && map.getSource('nb-points') && map.isSourceLoaded('nb-points') &&
        !map.isMoving() && map.areTilesLoaded();
    const started = Date.now();
    const whenSettled = () => {
        if (!settled() && Date.now() - started < 4000) { setTimeout(whenSettled, 100); return; }
        // The user may have panned the ring out of view: bring it back first.
        const sw = map.project([west, south]);
        const ne = map.project([east, north]);
        const canvas = map.getCanvas();
        const inView = sw.x >= 0 && ne.y >= 0 && ne.x <= canvas.clientWidth && sw.y <= canvas.clientHeight;
        if (!inView) map.fitBounds([[west, south], [east, north]], { padding: 40, duration: 0 });
        // Idle also fires right after this repaint when nothing is pending.
        map.once('idle', grab);
        map.triggerRepaint();
    };
    whenSettled();
});

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
    hazardsOn,
    onHazardsToggle,
    recent,
    onOpenRecent,
    onForgetRecent,
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

    // The printed report carries a picture of the map, taken when the button
    // is pressed. It is dropped whenever the zone changes, so a print from
    // the browser's own menu never shows the map of another zone.
    const [mapImage, setMapImage] = React.useState(null);
    const [preparing, setPreparing] = React.useState(false);
    React.useEffect(() => {
        setMapImage(null);
    }, [point && point.lat, point && point.lng, radius, stats]);

    const printReport = async () => {
        if (window.analyticsService) {
            window.analyticsService.track('USER_CLICK_PDF_GENERATION', { coordinates: point, radius: radius, categories: giros.map((g) => g.codigo_act) });
        }
        setPreparing(true);
        setMapImage(await nbMapSnapshot(point, radius));
        setPreparing(false);
        // Let React paint the picture before the print dialog freezes the page.
        requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    };

    const placeName = address || (point ? point.lat.toFixed(5) + ', ' + point.lng.toFixed(5) : '');

    // The browser names the PDF after the page title.
    React.useEffect(() => {
        if (!point) return undefined;
        let saved = null;
        const before = () => { saved = document.title; document.title = 'Informe de zona · ' + placeName + ' · Ciudad MX'; };
        const after = () => { if (saved !== null) document.title = saved; saved = null; };
        window.addEventListener('beforeprint', before);
        window.addEventListener('afterprint', after);
        return () => {
            window.removeEventListener('beforeprint', before);
            window.removeEventListener('afterprint', after);
        };
    }, [point, placeName]);

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

    // How big the competition is: DENUE gives each business a headcount band.
    // A street of family shops and one of chain stores call for different plans.
    const sizeBands = React.useMemo(() => {
        const records = (stats && stats.records) || [];
        if (!records.length) return null;
        const order = ['0 a 5 personas', '6 a 10 personas', '11 a 30 personas', '31 a 50 personas',
            '51 a 100 personas', '101 a 250 personas', '251 y más personas'];
        const counts = {};
        records.forEach((r) => { if (r.per_ocu) counts[r.per_ocu] = (counts[r.per_ocu] || 0) + 1; });
        const bands = order.filter((b) => counts[b]).map((b) => ({ label: b.replace(' personas', ''), count: counts[b] }));
        const known = bands.reduce((sum, b) => sum + b.count, 0);
        if (!known) return null;
        const micro = (counts['0 a 5 personas'] || 0) + (counts['6 a 10 personas'] || 0);
        return { bands, known, micro };
    }, [stats]);

    // One titled block of the report, separated from the next by a rule.
    const renderSection = (title, children, note) => (
        <section className="nb-section" aria-label={title}>
            <div className="nb-section-head">
                <h3>{title}</h3>
                {note ? <span className="nb-section-note">{note}</span> : null}
            </div>
            {children}
        </section>
    );

    const renderCompetitorSizes = () => {
        if (!sizeBands) return null;
        const { bands, known, micro } = sizeBands;
        const microShare = Math.round((micro / known) * 10);
        return (
            <div className="nb-sub" aria-label="Tamaño de la competencia">
                <div className="xb-eyebrow">Tamaño</div>
                <p className="nb-insight">
                    {microShare >= 10 ? 'Todos son micronegocios' : <React.Fragment><b>{microShare} de cada 10</b> son micronegocios</React.Fragment>} (hasta 10 personas).
                </p>
                {bands.map((b) => (
                    <div key={b.label} className="nb-bar-row">
                        <span className="nb-bar-name">{b.label} <small>personas</small></span>
                        <span className="nb-bar is-size" aria-hidden="true"><span style={{ width: Math.round((b.count / known) * 100) + '%' }}></span></span>
                        <span className="nb-bar-value">{nbNumber(b.count)}</span>
                    </div>
                ))}
            </div>
        );
    };

    // Foot traffic from the phone panel, already aggregated and thresholded on
    // the server: a relative curve by hour, weekdays and weekends apart.
    const footTraffic = stats && stats.foot_traffic;
    // '2025-03-05' -> '5 mar 2025', read as a calendar day, not a UTC instant.
    const nbDay = (iso) => {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const [trafficDays, setTrafficDays] = React.useState('weekday');
    const trafficPeak = (hours) => {
        const shown = hours.filter((v) => v !== null);
        return shown.length ? hours.indexOf(Math.max(...shown)) : -1;
    };
    const renderHoursChart = (hours, peak) => (
        <React.Fragment>
            <div className="nb-hours" role="img"
                aria-label={'Afluencia relativa por hora; la más alta a las ' + peak + ' h'}>
                {hours.map((v, h) => (
                    <span key={h}
                        className={v === null ? 'is-withheld' : (h === peak ? 'is-peak' : '')}
                        style={v === null ? null : { height: Math.max(v, 3) + '%' }}
                        title={v === null ? h + ' h · pocos datos' : h + ' h · ' + v}></span>
                ))}
            </div>
            <div className="nb-hours-axis" aria-hidden="true"><span>0 h</span><span>6</span><span>12</span><span>18</span><span>23 h</span></div>
        </React.Fragment>
    );
    const renderFootTraffic = () => {
        if (!footTraffic || !footTraffic.from_date) return null;
        const hours = footTraffic[trafficDays] || [];
        const shown = hours.filter((v) => v !== null);
        const peak = trafficPeak(hours);
        const withheld = ['weekday', 'weekend'].some((key) => (footTraffic[key] || []).some((v) => v === null));
        return (
            <div className="nb-sub" aria-label="Afluencia por hora">
                <div className="xb-eyebrow">¿Cuándo pasa más gente?</div>
                {!footTraffic.enough ? (
                    <p className="nb-empty-note">Pocos datos de teléfonos en este radio para estimarlo.</p>
                ) : (
                    <React.Fragment>
                        <div className="nb-screen-only">
                            <div className="nb-sub-head">
                                <p className="nb-insight">
                                    {shown.length === 0 ? 'Pocos datos para estos días.' : <React.Fragment>Más gente hacia las <b>{peak} h</b></React.Fragment>}
                                </p>
                                <div className="xb-segmented is-compact" role="group" aria-label="Días">
                                    {[['weekday', 'Entre semana'], ['weekend', 'Fin de semana']].map(([key, label]) => (
                                        <button key={key} type="button" className={trafficDays === key ? 'is-active' : ''}
                                            aria-pressed={trafficDays === key} onClick={() => setTrafficDays(key)}>{label}</button>
                                    ))}
                                </div>
                            </div>
                            {shown.length > 0 && renderHoursChart(hours, peak)}
                        </div>
                        {/* On paper there is no toggle: both curves, one above the other. */}
                        <div className="nb-print-only" aria-hidden="true">
                            {[['weekday', 'Entre semana'], ['weekend', 'Fin de semana']].map(([key, label]) => {
                                const series = footTraffic[key] || [];
                                const top = trafficPeak(series);
                                return (
                                    <div key={key} className="nb-print-hours">
                                        <p className="nb-insight">
                                            <b>{label}</b>{top < 0 ? ': pocos datos.' : <React.Fragment>: más gente hacia las <b>{top} h</b></React.Fragment>}
                                        </p>
                                        {top >= 0 && renderHoursChart(series, top)}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="nb-note">
                            Índice relativo (hora pico = 100)
                            {withheld ? '. Rayado: muy pocos datos.' : ''}
                        </p>
                    </React.Fragment>
                )}
            </div>
        );
    };

    // When robberies from businesses happen inside the radius: tells an owner
    // which hours need the most care, or whether to open late at all.
    const robberyTimes = stats && stats.business_robbery_by_time;
    const robberyYears = robberyTimes && robberyTimes.from_year
        ? (robberyTimes.from_year === robberyTimes.to_year ? String(robberyTimes.from_year) : robberyTimes.from_year + '–' + robberyTimes.to_year)
        : '';
    const renderRobberyTimes = () => {
        if (!robberyTimes) return null;
        const total = robberyTimes.total;
        const periods = [
            { key: 'morning', label: 'Mañana', hours: '6–12 h' },
            { key: 'afternoon', label: 'Tarde', hours: '12–19 h' },
            { key: 'night', label: 'Noche', hours: '19–6 h' },
        ];
        const top = total ? periods.reduce((a, b) => (robberyTimes[b.key] > robberyTimes[a.key] ? b : a)) : null;
        return (
            <div className="nb-sub" aria-label="Cuándo ocurren los robos a negocio">
                <div className="xb-eyebrow">¿Cuándo ocurren los robos a negocio?</div>
                {total === 0 ? (
                    <p className="nb-empty-note">Sin robos a negocio con hora registrada en el radio desde {robberyTimes.from_year || 2019}.</p>
                ) : (
                    <React.Fragment>
                        <p className="nb-insight">La mayoría, de <b>{top.label.toLowerCase()}</b> ({top.hours}).</p>
                        {periods.map((p) => {
                            const share = Math.round((robberyTimes[p.key] / total) * 100);
                            return (
                                <div key={p.key} className="nb-bar-row">
                                    <span className="nb-bar-name">{p.label} <small>{p.hours}</small></span>
                                    <span className="nb-bar" aria-hidden="true"><span style={{ width: share + '%' }}></span></span>
                                    <span className="nb-bar-value">{share}%</span>
                                </div>
                            );
                        })}
                        <p className="nb-note">{nbNumber(total)} {total === 1 ? 'robo' : 'robos'} con hora registrada en el radio, {robberyYears}.</p>
                    </React.Fragment>
                )}
            </div>
        );
    };

    // Natural hazards from the Atlas de Riesgos CDMX: the levels of the census
    // zone the point falls in, the ground under it, and what lies within the
    // radius. Null outside the city, where the Atlas has nothing to say.
    const terrain = stats && stats.terrain_climate;
    const NB_LEVELS = ['Muy Bajo', 'Bajo', 'Medio', 'Alto', 'Muy Alto'];
    const levelName = (level) => level.charAt(0) + level.slice(1).toLowerCase();
    const renderLevel = (level) => {
        const step = NB_LEVELS.indexOf(level);
        if (step < 0) return <span className="xb-muted">Sin dato</span>;
        return (
            <span className={'nb-level is-' + step}>
                <span className="nb-level-meter" aria-hidden="true">
                    {NB_LEVELS.map((_, i) => <span key={i} className={i <= step ? 'is-on' : ''}></span>)}
                </span>
                {levelName(level)}
            </span>
        );
    };
    const fact = (name, value, detail) => (
        <div className="nb-fact" key={name}>
            <span className="nb-fact-name">{name}</span>
            <span className="nb-fact-value">
                {value}
                {detail ? <small>{detail}</small> : null}
            </span>
        </div>
    );
    // The building code's geotechnical zones, by what they mean for a building.
    const NB_GROUND = {
        'I': ['Lomas', 'Suelo firme: los sismos se sienten menos.'],
        'II': ['Transición', 'Entre suelo firme y blando.'],
        'III': ['Lago', 'Antiguo lago: suelo blando que amplifica los sismos.'],
    };
    const nbList = (items) => items.length > 1 ? items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1] : items[0];
    const nbYears = (found) => found.from_year === found.to_year ? String(found.from_year) : found.from_year + '–' + found.to_year;
    const renderTerrain = () => {
        if (!terrain) return null;
        const levels = terrain.levels || {};
        const climate = [['inundacion', 'Inundación'], ['precipitac', 'Lluvias'], ['granizo', 'Granizo'], ['tom_elec', 'Tormentas eléctricas'], ['tem_max', 'Calor']];
        const high = [['sismo', 'sismo'], ...climate, ['sus_ladera', 'laderas inestables']]
            .filter(([key]) => levels[key] === 'Alto' || levels[key] === 'Muy Alto')
            .map(([, label]) => label.toLowerCase());
        const zone = terrain.geotechnical_zone;
        const { mines, sinkholes, fractures, faults, waterlogging } = terrain;
        return renderSection('Terreno y clima', (
            <React.Fragment>
                <p className="nb-insight">
                    {high.length ? <React.Fragment>Peligro alto por <b>{nbList(high)}</b>.</React.Fragment> : 'Ningún peligro natural alto en esta zona.'}
                </p>
                <div className="nb-sub" aria-label="Suelo">
                    <div className="xb-eyebrow">Suelo</div>
                    <div className="nb-facts">
                        {zone && NB_GROUND[zone.zone] && fact('Tipo de suelo', NB_GROUND[zone.zone][0] + ' · zona ' + zone.zone, NB_GROUND[zone.zone][1])}
                        {levels.sismo && fact('Peligro sísmico', renderLevel(levels.sismo))}
                        {fact('Hundimiento del suelo',
                            terrain.subsidence_cm_year ? terrain.subsidence_cm_year.replace('-', '–') + ' cm al año' : 'Sin hundimiento regional',
                            terrain.subsidence_cm_year ? 'Puede agrietar muros y pisos con los años.' : null)}
                        {terrain.crack_zone && fact('Zona de agrietamiento', terrain.crack_zone)}
                        {fractures.count > 0 && fact('Fracturas en el terreno', 'La más cercana a ' + nbNumber(fractures.nearest_m) + ' m')}
                        {faults.count > 0 && fact('Fallas geológicas', 'La más cercana a ' + nbNumber(faults.nearest_m) + ' m')}
                        {fact('Minas antiguas', mines.count ? nbNumber(mines.count) + ' en el radio' : 'Ninguna en el radio',
                            mines.count ? 'La más cercana a ' + nbNumber(mines.nearest_m) + ' m' : null)}
                        {fact('Socavones', sinkholes.count ? nbNumber(sinkholes.count) + ' en el radio' : 'Ninguno en el radio',
                            'Reportados ' + nbYears(sinkholes))}
                        {(levels.sus_ladera === 'Medio' || levels.sus_ladera === 'Alto' || levels.sus_ladera === 'Muy Alto') &&
                            fact('Laderas inestables', renderLevel(levels.sus_ladera))}
                    </div>
                </div>
                <div className="nb-sub" aria-label="Agua y clima">
                    <div className="xb-eyebrow">Agua y clima</div>
                    <div className="nb-facts">
                        {fact('Encharcamientos', waterlogging.count ? nbNumber(waterlogging.count) + ' en el radio' : 'Ninguno en el radio',
                            'Reportados ' + nbYears(waterlogging))}
                        {climate.filter(([key]) => levels[key]).map(([key, label]) => fact(label, renderLevel(levels[key])))}
                    </div>
                    {terrain.levels && <p className="nb-note">Niveles del Atlas de Riesgos de la CDMX para la zona censal (AGEB) del punto.</p>}
                </div>
            </React.Fragment>
        ), (
            <button type="button" className={'nb-map-toggle nb-screen-only' + (hazardsOn ? ' is-active' : '')}
                aria-pressed={!!hazardsOn} onClick={onHazardsToggle}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" />
                </svg>
                {hazardsOn ? 'En el mapa' : 'Ver en el mapa'}
            </button>
        ));
    };

    // "hace 3 h", "ayer", "12 mar": how long ago a recent report was opened.
    const nbAgo = (time) => {
        const minutes = Math.round((Date.now() - time) / 60000);
        const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' });
        if (minutes < 1) return 'ahora';
        if (minutes < 60) return rtf.format(-minutes, 'minute');
        if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), 'hour');
        if (minutes < 60 * 24 * 7) return rtf.format(-Math.round(minutes / 1440), 'day');
        return new Date(time).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    };

    const renderRecent = () => (
        <section className="nb-recent" aria-label="Zonas recientes">
            <div className="nb-recent-head">
                <div className="xb-eyebrow">Recientes</div>
                <button type="button" className="xb-link nb-recent-forget" onClick={onForgetRecent}>Borrar</button>
            </div>
            <ul className="nb-recent-list">
                {recent.map((entry) => {
                    const place = entry.address || entry.lat.toFixed(5) + ', ' + entry.lng.toFixed(5);
                    const giroText = entry.giros.length === 1 ? entry.giros[0].nombre_act : entry.giros.length + ' giros';
                    const radiusText = entry.radius >= 1000 ? (entry.radius / 1000) + ' km' : entry.radius + ' m';
                    return (
                        <li key={entry.lat + ',' + entry.lng + ',' + entry.giros.map((g) => g.codigo_act).join(',')}>
                            <button type="button" className="nb-recent-item" onClick={() => onOpenRecent(entry)}>
                                <span className="nb-recent-icon" aria-hidden="true">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />
                                    </svg>
                                </span>
                                <span className="nb-recent-text">
                                    <span className="nb-recent-place">{place}</span>
                                    <span className="nb-recent-meta">{giroText} · {radiusText}</span>
                                </span>
                                <span className="nb-recent-side">
                                    <span className="nb-recent-total">{nbNumber(entry.total)}</span>
                                    <span className="nb-recent-ago">{nbAgo(entry.at)}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );

    // Nothing studied yet: a drawing of a street corner with a pin, and the
    // three steps.
    const renderNoRecent = () => (
        <section className="nb-no-recent" aria-label="Sin zonas recientes">
            <svg className="nb-no-recent-art" width="148" height="112" viewBox="0 0 148 112" fill="none" aria-hidden="true">
                <ellipse cx="74" cy="100" rx="58" ry="7" fill="#EFEFEC" />
                <rect x="22" y="40" width="58" height="56" rx="4" fill="#FFFFFF" stroke="#D9D9D5" strokeWidth="2" />
                <path d="M18 40h66l-6-16H24z" fill="#F3F3F0" stroke="#D9D9D5" strokeWidth="2" strokeLinejoin="round" />
                <path d="M33 24l-3 16M44 24l-1 16M55 24l1 16M66 24l3 16" stroke="#D9D9D5" strokeWidth="2" />
                <rect x="31" y="54" width="18" height="16" rx="2" fill="#F7F7F4" stroke="#D9D9D5" strokeWidth="2" />
                <rect x="56" y="54" width="15" height="42" rx="2" fill="#F7F7F4" stroke="#D9D9D5" strokeWidth="2" />
                <rect x="88" y="58" width="38" height="38" rx="4" fill="#FFFFFF" stroke="#D9D9D5" strokeWidth="2" />
                <path d="M88 70h38M107 58v38" stroke="#EFEFEC" strokeWidth="2" />
                <path d="M108 50s-14-12.4-14-23a14 14 0 0 1 28 0c0 10.6-14 23-14 23z" fill="#2456B5" />
                <circle cx="108" cy="27" r="5.5" fill="#FFFFFF" />
            </svg>
            <h3 className="nb-no-recent-title">Aún no has estudiado ninguna zona</h3>
            <p className="xb-muted">Tus informes aparecerán aquí para volver a ellos.</p>
            <ol className="xb-steps nb-no-recent-steps">
                <li>Busca una dirección o marca un punto en el mapa.</li>
                <li>Elige hasta {maxGiros} giros.</li>
                <li>Ajusta el radio.</li>
            </ol>
        </section>
    );

    const renderEmpty = () => (
        <React.Fragment>
            <section className="xb-empty">
                <h2 className="xb-title">Estudia una zona antes de abrir</h2>
                <p className="xb-muted">Competencia, población y entorno alrededor de un punto.</p>
            </section>
            {recent && recent.length > 0 ? renderRecent() : renderNoRecent()}
        </React.Fragment>
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

    // The chosen giros as a small table: name with a bar for its share of
    // the businesses found, then businesses and jobs in aligned columns.
    const renderGiroTable = () => {
        const counts = giros.map((g) => (categoryStats[g.codigo_act] || {}).count || 0);
        const most = Math.max(1, ...counts);
        return (
            <div className="nb-giros" role="table" aria-label="Competencia por giro">
                <div className="nb-giros-row is-head" role="row">
                    <span role="columnheader">Giro</span>
                    <span role="columnheader" className="nb-num">Negocios</span>
                    <span role="columnheader" className="nb-num">Empleos</span>
                    <span aria-hidden="true"></span>
                </div>
                {giros.map((giro, i) => {
                    const row = categoryStats[giro.codigo_act];
                    const count = row ? row.count : 0;
                    const jobs = row ? row.total_jobs : 0;
                    return (
                        <div key={giro.codigo_act} role="row" className={'nb-giros-row' + (giro.visible ? '' : ' is-off')}>
                            <span role="cell" className="nb-giros-name">
                                <span className="nb-giros-label">
                                    <span className="nb-chip-dot" aria-hidden="true" style={{ background: giro.color }}></span>
                                    <span className="nb-giros-text" title={giro.nombre_act}>{giro.nombre_act}</span>
                                </span>
                                <span className="nb-giros-bar" aria-hidden="true">
                                    <span style={{ width: (statsLoading ? 0 : Math.round((counts[i] / most) * 100)) + '%', background: giro.color }}></span>
                                </span>
                            </span>
                            <span role="cell" className={'nb-num' + (!statsLoading && !count ? ' is-zero' : '')}>{statsLoading ? '…' : nbNumber(count)}</span>
                            <span role="cell" className={'nb-num' + (!statsLoading && !jobs ? ' is-zero' : '')}>{statsLoading ? '…' : nbNumber(jobs)}</span>
                            <span role="cell">
                                <button type="button" className="nb-row-remove" onClick={() => onRemoveGiro(giro)} aria-label={'Quitar ' + giro.nombre_act} title="Quitar giro">
                                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                                </button>
                            </span>
                        </div>
                    );
                })}
                {giros.length < maxGiros && (
                    <button type="button" className="nb-giros-add" onClick={onPickerOpen}>
                        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        Añadir giro <span className="nb-giros-add-left">· {maxGiros - giros.length} más</span>
                    </button>
                )}
            </div>
        );
    };

    // The one-sentence reading at the top of the report.
    const renderVerdict = () => {
        if (statsError) return <p className="nb-error">No se pudieron contar los negocios: {statsError}</p>;
        if (statsLoading || !summary) return <p className="nb-verdict-text is-loading">Contando los negocios del DENUE dentro del radio…</p>;
        if (summary.total_businesses === 0) {
            return (
                <p className="nb-verdict-text">
                    Ningún negocio de tus giros a {radiusLabel}.
                    <small>Prueba con un radio mayor u otro giro.</small>
                </p>
            );
        }
        return (
            <p className="nb-verdict-text">
                <b>{nbNumber(summary.total_businesses)} {summary.total_businesses === 1 ? 'negocio' : 'negocios'}</b> de tus giros a {radiusLabel}
                {nearest ? <React.Fragment>; el más cercano, a <b>{nbNumber(nearest.distance)} m</b></React.Fragment> : null}.
                {perHabitant ? <small>Uno por cada {nbNumber(perHabitant)} habitantes.</small> : null}
            </p>
        );
    };

    const stat = (value, label, empty) => (
        <div className="xb-stat">
            <div className={'xb-stat-value' + (empty ? ' is-empty' : '')} aria-label={empty ? 'sin datos' : undefined}>{value}</div>
            <div className="xb-muted">{label}</div>
        </div>
    );

    const censusMissing = !indicatorsLoading && indicators && indicators.zones === 0;
    const censusReady = !indicatorsLoading && indicators && indicators.zones > 0;
    const explorarLink = (
        <a
            href="/explorar"
            className="xb-link nb-screen-only"
            style={{ alignSelf: 'flex-start', textDecoration: 'none' }}
            onClick={(e) => { e.preventDefault(); if (window.navigate) window.navigate('/explorar'); else window.location.href = '/explorar'; }}
        >
            Ver esta zona en Explorar
        </a>
    );

    const renderReport = () => (
        <React.Fragment>
            <div className="nb-print-only nb-print-head">
                <span className="nb-print-brand">Ciudad MX</span>
                <span>{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <header className="nb-report-head">
                <div>
                    <div className="xb-eyebrow" style={{ marginBottom: 6 }}>Informe de zona</div>
                    <h2 className="xb-title">{placeName}</h2>
                    <p className="xb-muted">
                        {giros.length === 1 ? giros[0].nombre_act : giros.length + ' giros'} · radio de {radiusLabel}
                        <span className="nb-print-only"> · {point.lat.toFixed(5)}, {point.lng.toFixed(5)}</span>
                    </p>
                </div>
                <button type="button" className="xb-link nb-screen-only" onClick={onReset}>Nueva zona</button>
            </header>

            <section className="nb-verdict" aria-label="Resumen">
                {renderVerdict()}
                <div className="xb-stats-grid">
                    {stat(statsLoading || !summary ? '…' : nbNumber(summary.total_businesses), 'negocios')}
                    {stat(statsLoading || !summary ? '…' : nbNumber(summary.total_jobs), 'empleos')}
                    {stat(indicatorsLoading || !indicators ? '…' : censusMissing ? '—' : nbNumber(indicators.population), 'habitantes', censusMissing)}
                </div>
            </section>

            {mapImage && (
                <figure className="nb-print-only nb-print-map">
                    <img src={mapImage} alt={'Mapa del radio de ' + radiusLabel + ' con los negocios encontrados'} />
                    <figcaption>
                        <span>
                            Radio de {radiusLabel} alrededor del punto negro{summary && summary.total_businesses > 0 ? '; cada círculo de color es un negocio de los giros elegidos' : ''}.
                            {hazardsOn ? ' Anillos y líneas punteadas: encharcamientos, socavones, minas, fracturas y fallas (ver Terreno y clima).' : ''}
                        </span>
                        <span>© Mapbox © OpenStreetMap</span>
                    </figcaption>
                </figure>
            )}

            {renderSection('Competencia', (
                <React.Fragment>
                    {renderGiroTable()}
                    {nearest && !statsLoading && (
                        <div className="nb-callout">
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
                    {renderCompetitorSizes()}
                </React.Fragment>
            ))}

            {renderSection('Gente', (
                <React.Fragment>
                    {renderFootTraffic()}
                    <div className="nb-sub" aria-label="Vecindario">
                        <div className="xb-eyebrow">Vecindario</div>
                        {indicatorsLoading || !indicators ? (
                            <p className="nb-empty-note">Leyendo las zonas censales que toca el radio…</p>
                        ) : censusMissing ? (
                            <p className="nb-empty-note">Sin datos del censo para este punto.</p>
                        ) : (
                            <React.Fragment>
                                <div className="nb-row">
                                    <span className="nb-row-name">Viviendas con internet</span>
                                    <span className="nb-row-value">{nbNumber(indicators.housingInternet)} <small>· sin internet {nbNumber(indicators.housingNoInternet)}</small></span>
                                </div>
                                <div className="nb-row">
                                    <span className="nb-row-name">Estaciones de transporte</span>
                                    <span className="nb-row-value">{nbNumber(indicators.stations)}{indicators.stationNames ? <small> · {indicators.stationNames}</small> : null}</span>
                                </div>
                                <p className="nb-note">
                                    Sumas de {indicators.zones === 1 ? 'la zona censal (AGEB) que toca' : 'las ' + indicators.zones + ' zonas censales (AGEB) que toca'} el radio.
                                </p>
                            </React.Fragment>
                        )}
                        {explorarLink}
                    </div>
                </React.Fragment>
            ))}

            {renderSection('Seguridad', (
                <React.Fragment>
                    {censusReady ? (
                        <React.Fragment>
                            <div className="nb-row">
                                <span className="nb-row-name">Robos a negocios</span>
                                <span className="nb-row-value">{nbNumber(indicators.businessThefts)} <small>casos · 2022</small></span>
                            </div>
                            <div className="nb-row">
                                <span className="nb-row-name">Robos en transporte público</span>
                                <span className="nb-row-value">{nbNumber(indicators.thefts)} <small>casos · 2022</small></span>
                            </div>
                        </React.Fragment>
                    ) : censusMissing ? (
                        <p className="nb-empty-note">Sin totales de la FGJ por zona para este punto.</p>
                    ) : null}
                    {renderRobberyTimes()}
                </React.Fragment>
            ))}

            {renderTerrain()}

            <section className="nb-sources" aria-label="Fuentes">
                <div className="xb-eyebrow">Fuentes</div>
                <div>DENUE 2025, INEGI · unidades económicas y personal ocupado</div>
                <div>Censo de Población y Vivienda 2020, INEGI · por AGEB</div>
                <div>Carpetas de investigación, FGJ CDMX · 2022{robberyYears ? ` · hora de los robos ${robberyYears}` : ''}</div>
                <div>Ciudad MX · redes de transporte</div>
                {terrain && <div>Atlas de Riesgos CDMX, SGIRPC · peligros por AGEB, zonificación geotécnica (NTC 2017), hundimientos, grietas, minas, socavones {nbYears(terrain.sinkholes)}, encharcamientos {nbYears(terrain.waterlogging)}</div>}
                {footTraffic && footTraffic.enough && <div>Muestra de ubicaciones de teléfonos, datos agregados · {nbDay(footTraffic.from_date)} al {nbDay(footTraffic.to_date)}</div>}
            </section>

            <p className="nb-print-only nb-print-link">
                Ábrelo en línea para cambiar el radio o los giros: <span>{window.location.href}</span>
            </p>
        </React.Fragment>
    );

    return (
        <aside className={`xb-inspector${point ? '' : ' is-empty'}`} aria-label="Informe de la zona">
            {chipsSlot}
            {/* On a phone the top bar has no room for the radius, so once a
                point is set it stays pinned above the sheet's scroll: it can
                change while the giro picker is open, not only in the report. */}
            {point && isMobile && <div className="nb-sheet-radius">{renderRadiusControl()}</div>}
            <div className="vertical-panel-content xb-scroll" ref={scrollRef}>
                {!point && renderEmpty()}
                {!point && isMobile && renderRadiusControl()}
                {showPicker && renderPicker()}
                {point && hasGiros && !pickerOpen && renderReport()}
            </div>
            {point && hasGiros && !pickerOpen && (
                <div className="nb-foot">
                    <button type="button" className="nb-btn is-primary" onClick={printReport} disabled={preparing || statsLoading || indicatorsLoading}>
                        {preparing ? 'Preparando…' : 'Descargar PDF'}
                    </button>
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
