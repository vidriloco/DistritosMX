// BusinessInspector - the right-hand inspector of /negocios, read as a report:
// a one-sentence verdict with the key figures, then Competencia, Gente and
// Seguridad as titled sections, Fuentes last, and a footer to print or share.
// Before a point exists it explains the page; before a giro exists it offers
// the picker. On a phone the chips row is handed in and sits at the top.

const nbNumber = (value) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });

// Line icons for the report and the picker, drawn on a 24-unit grid in the
// text colour.
const NB_ICON_SHAPES = {
    store: <path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M9 20v-6h6v6" />,
    briefcase: <React.Fragment><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V4h8v3M3 13h18" /></React.Fragment>,
    people: <React.Fragment><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.6 4 2.6 4 6" /></React.Fragment>,
    person: <React.Fragment><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></React.Fragment>,
    shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
    mountain: <path d="M3 20l6-10 4 6 3-4 5 8z" />,
    pin: <React.Fragment><path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></React.Fragment>,
    clock: <React.Fragment><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></React.Fragment>,
    bus: <React.Fragment><rect x="4" y="3" width="16" height="14" rx="2" /><path d="M4 11h16M7 17v3M17 17v3M8 14h.01M16 14h.01" /></React.Fragment>,
    wifi: <path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" />,
    sunrise: <path d="M12 3v3M5 10l2 2M19 10l-2 2M3 18h18M7 18a5 5 0 0 1 10 0" />,
    sun: <React.Fragment><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></React.Fragment>,
    moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
    quake: <path d="M2 12h4l3-8 4 16 3-8h6" />,
    drop: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />,
    rain: <path d="M7 15a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 7a4 4 0 0 1-1 8M8 19v2M12 17v4M16 19v2" />,
    hail: <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" />,
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
    heat: <path d="M14 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0z" />,
    layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />,
    sink: <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />,
    crack: <path d="M4 4l5 6-3 4 6 6M14 3l2 5-3 3 4 5 3 4" />,
    mine: <path d="M3 21l10-10M14 4a8 8 0 0 1 6 6M10 5a12 12 0 0 1 9 9" />,
    alert: <path d="M12 3l10 18H2zM12 10v4M12 17v.5" />,
    cup: <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3" />,
    health: <React.Fragment><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" /></React.Fragment>,
    cart: <path d="M6 6h15l-2 9H8zM6 6L5 3H2M9 20h.01M18 20h.01" />,
    scissors: <React.Fragment><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.5 7.5L20 18M8.5 16.5L20 6" /></React.Fragment>,
    school: <path d="M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />,
    factory: <path d="M3 20V10l6 4V10l6 4V6h6v14z" />,
    search: <React.Fragment><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></React.Fragment>,
    back: <path d="M15 6l-6 6 6 6" />,
    next: <path d="M9 6l6 6-6 6" />,};
const nbIcon = (name, size) => (
    <svg aria-hidden="true" width={size || 18} height={size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nb-icon">
        {NB_ICON_SHAPES[name]}
    </svg>
);

// The Atlas hazards by key, with their icon.
const NB_HAZARD_ICONS = { sismo: 'quake', inundacion: 'drop', precipitac: 'rain', granizo: 'hail', tom_elec: 'bolt', tem_max: 'heat', sus_ladera: 'mountain' };

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

    // On a phone the report opens the sheet to nearly the full screen; the
    // picker and the start screen keep it at half height, under the map.
    const showReport = Boolean(point && hasGiros && !pickerOpen);
    const [sheetExpanded, setSheetExpanded] = React.useState(false);
    React.useEffect(() => { setSheetExpanded(showReport); }, [showReport]);

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

    // One titled block of the report, separated from the next by a rule: an
    // icon, the title, and on the right either a short verdict
    // ({ text, tone }) or a control.
    const renderSection = (title, icon, children, note, badge) => (
        <section className="nb-section" aria-label={title}>
            <div className="nb-section-head">
                <span className="nb-section-icon">{nbIcon(icon, 20)}</span>
                <h3>{title}</h3>
                {badge ? <span className={'nb-badge is-' + badge.tone}>{badge.text}</span> : null}
                {note ? <span className="nb-section-note">{note}</span> : null}
            </div>
            {children}
        </section>
    );
    const eyebrow = (icon, text) => <div className="xb-eyebrow nb-eyebrow">{nbIcon(icon, 14)}{text}</div>;

    // While the DENUE count (with everything computed alongside it) or the
    // census are on their way, each block they fill holds a loading card.
    const statsBusy = statsLoading || (!summary && !statsError);
    const censusBusy = indicatorsLoading || !indicators;
    const spinner = <span className="nb-spinner" aria-hidden="true"></span>;
    const loadingCard = (text) => <div className="nb-loading" role="status">{spinner}{text}</div>;

    const renderCompetitorSizes = () => {
        if (statsBusy) {
            return (
                <div className="nb-sub" aria-label="Tamaño de la competencia">
                    {eyebrow('person', 'Tamaño')}
                    {loadingCard('Midiendo el tamaño de la competencia…')}
                </div>
            );
        }
        if (!sizeBands) return null;
        const { bands, known, micro } = sizeBands;
        const microShare = Math.round((micro / known) * 10);
        return (
            <div className="nb-sub" aria-label="Tamaño de la competencia">
                {eyebrow('person', 'Tamaño')}
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
        if (statsBusy) {
            return (
                <div className="nb-sub" aria-label="Afluencia por hora">
                    {eyebrow('clock', '¿Cuándo pasa más gente?')}
                    {loadingCard('Calculando la afluencia por hora…')}
                </div>
            );
        }
        if (!footTraffic || !footTraffic.from_date) return null;
        const hours = footTraffic[trafficDays] || [];
        const shown = hours.filter((v) => v !== null);
        const peak = trafficPeak(hours);
        const withheld = ['weekday', 'weekend'].some((key) => (footTraffic[key] || []).some((v) => v === null));
        return (
            <div className="nb-sub" aria-label="Afluencia por hora">
                {eyebrow('clock', '¿Cuándo pasa más gente?')}
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
        if (statsBusy) {
            return (
                <div className="nb-sub" aria-label="Cuándo ocurren los robos a negocio">
                    {eyebrow('clock', '¿Cuándo ocurren los robos a negocio?')}
                    {loadingCard('Revisando a qué hora ocurren los robos…')}
                </div>
            );
        }
        if (!robberyTimes) return null;
        const total = robberyTimes.total;
        const periods = [
            { key: 'morning', label: 'Mañana', hours: '6–12 h', icon: 'sunrise' },
            { key: 'afternoon', label: 'Tarde', hours: '12–19 h', icon: 'sun' },
            { key: 'night', label: 'Noche', hours: '19–6 h', icon: 'moon' },
        ];
        const top = total ? periods.reduce((a, b) => (robberyTimes[b.key] > robberyTimes[a.key] ? b : a)) : null;
        return (
            <div className="nb-sub" aria-label="Cuándo ocurren los robos a negocio">
                {eyebrow('clock', '¿Cuándo ocurren los robos a negocio?')}
                {total === 0 ? (
                    <p className="nb-empty-note">Sin robos a negocio con hora registrada en el radio desde {robberyTimes.from_year || 2019}.</p>
                ) : (
                    <React.Fragment>
                        <p className="nb-insight">La mayoría, de <b>{top.label.toLowerCase()}</b> ({top.hours}).</p>
                        {/* One card per part of the day; the busiest (ties too) stand out. */}
                        <div className="nb-periods">
                            {periods.map((p) => {
                                const share = Math.round((robberyTimes[p.key] / total) * 100);
                                const most = robberyTimes[p.key] === robberyTimes[top.key];
                                return (
                                    <div key={p.key} className={'nb-period' + (most ? ' is-top' : '')}>
                                        {nbIcon(p.icon, 22)}
                                        <span className="nb-period-value">{share}%</span>
                                        <span className="nb-period-name">{p.label}<small>{p.hours}</small></span>
                                    </div>
                                );
                            })}
                        </div>
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
    const fact = (name, value, detail, icon) => (
        <div className="nb-fact" key={name}>
            <span className="nb-fact-name">{icon ? nbIcon(icon, 16) : null}{name}</span>
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
        // Only known once loaded: outside the city the section goes away.
        if (statsBusy) return renderSection('Terreno y clima', 'mountain', loadingCard('Consultando el Atlas de Riesgos…'));
        if (!terrain) return null;
        const levels = terrain.levels || {};
        const climate = [['inundacion', 'Inundación'], ['precipitac', 'Lluvias'], ['granizo', 'Granizo'], ['tom_elec', 'Tormentas eléctricas'], ['tem_max', 'Calor']];
        const high = [['sismo', 'Sismo'], ...climate, ['sus_ladera', 'Laderas inestables']]
            .filter(([key]) => levels[key] === 'Alto' || levels[key] === 'Muy Alto');
        const zone = terrain.geotechnical_zone;
        const { mines, sinkholes, fractures, faults, waterlogging } = terrain;
        return renderSection('Terreno y clima', 'mountain', (
            <React.Fragment>
                {high.length ? (
                    <React.Fragment>
                        <p className="nb-insight">Peligro alto por <b>{nbList(high.map(([, label]) => label.toLowerCase()))}</b>.</p>
                        <div className="nb-hazards" aria-hidden="true">
                            {high.map(([key, label]) => (
                                <span key={key} className="nb-hazard">{nbIcon(NB_HAZARD_ICONS[key], 22)}{label}</span>
                            ))}
                        </div>
                    </React.Fragment>
                ) : (
                    <p className="nb-insight">Ningún peligro natural alto en esta zona.</p>
                )}
                <div className="nb-sub" aria-label="Suelo">
                    {eyebrow('layers', 'Suelo')}
                    <div className="nb-facts">
                        {zone && NB_GROUND[zone.zone] && fact('Tipo de suelo', NB_GROUND[zone.zone][0] + ' · zona ' + zone.zone, NB_GROUND[zone.zone][1], 'layers')}
                        {levels.sismo && fact('Peligro sísmico', renderLevel(levels.sismo), null, 'quake')}
                        {fact('Hundimiento del suelo',
                            terrain.subsidence_cm_year ? terrain.subsidence_cm_year.replace('-', '–') + ' cm al año' : 'Sin hundimiento regional',
                            terrain.subsidence_cm_year ? 'Puede agrietar muros y pisos con los años.' : null, 'sink')}
                        {terrain.crack_zone && fact('Zona de agrietamiento', terrain.crack_zone, null, 'crack')}
                        {fractures.count > 0 && fact('Fracturas en el terreno', 'La más cercana a ' + nbNumber(fractures.nearest_m) + ' m', null, 'crack')}
                        {faults.count > 0 && fact('Fallas geológicas', 'La más cercana a ' + nbNumber(faults.nearest_m) + ' m', null, 'crack')}
                        {fact('Minas antiguas', mines.count ? nbNumber(mines.count) + ' en el radio' : 'Ninguna en el radio',
                            mines.count ? 'La más cercana a ' + nbNumber(mines.nearest_m) + ' m' : null, 'mine')}
                        {fact('Socavones', sinkholes.count ? nbNumber(sinkholes.count) + ' en el radio' : 'Ninguno en el radio',
                            'Reportados ' + nbYears(sinkholes), 'alert')}
                        {(levels.sus_ladera === 'Medio' || levels.sus_ladera === 'Alto' || levels.sus_ladera === 'Muy Alto') &&
                            fact('Laderas inestables', renderLevel(levels.sus_ladera), null, 'mountain')}
                    </div>
                </div>
                <div className="nb-sub" aria-label="Agua y clima">
                    {eyebrow('drop', 'Agua y clima')}
                    <div className="nb-facts">
                        {fact('Encharcamientos', waterlogging.count ? nbNumber(waterlogging.count) + ' en el radio' : 'Ninguno en el radio',
                            'Reportados ' + nbYears(waterlogging), 'drop')}
                        {climate.filter(([key]) => levels[key]).map(([key, label]) => fact(label, renderLevel(levels[key]), null, NB_HAZARD_ICONS[key]))}
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

    // The recent reports grouped by place: pins a few metres apart on the same
    // street are one place to the person, so each address is one card (in
    // the order of its newest report) with a row per report.
    const recentPlaces = React.useMemo(() => {
        const places = [];
        (recent || []).forEach((entry) => {
            const name = entry.address || entry.lat.toFixed(5) + ', ' + entry.lng.toFixed(5);
            let place = places.find((p) => p.name === name);
            if (!place) { place = { name: name, entries: [] }; places.push(place); }
            place.entries.push(entry);
        });
        return places;
    }, [recent]);

    // Starting over means choosing a point: the address search is the way in.
    const focusSearch = () => {
        const input = document.querySelector('.nb-search input');
        if (input) input.focus();
    };
    const renderNewZone = () => (
        <button type="button" className="nb-new-zone" onClick={focusSearch}>
            <svg width="52" height="52" viewBox="0 0 56 56" aria-hidden="true">
                <rect width="56" height="56" rx="14" fill="#2B5FC4" />
                <path d="M0 20h56M0 38h56M20 0v56M38 0v56" stroke="#4473D0" strokeWidth="3" />
                <path d="M28 40s-10-8.5-10-17a10 10 0 0 1 20 0c0 8.5-10 17-10 17z" fill="#F5C84B" stroke="#163A80" strokeWidth="2" />
                <path d="M28 19v8M24 23h8" stroke="#163A80" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="nb-new-zone-text">
                <b>Estudiar una zona nueva</b>
                <span>Busca una dirección o toca el mapa</span>
            </span>
            {nbIcon('next', 18)}
        </button>
    );

    const renderRecent = () => (
        <section className="nb-recent" aria-label="Lugares que has estudiado">
            {renderNewZone()}
            <div className="nb-recent-head">
                <div className="xb-eyebrow">Lugares que has estudiado</div>
                <button type="button" className="xb-link nb-recent-forget" onClick={onForgetRecent}>Borrar</button>
            </div>
            {recentPlaces.map((place) => (
                <div key={place.name} className="nb-place">
                    <div className="nb-place-head">
                        <span className="nb-recent-icon" aria-hidden="true">{nbIcon('pin', 18)}</span>
                        <span className="nb-recent-text">
                            <span className="nb-recent-place">{place.name}</span>
                            <span className="nb-recent-meta">
                                {place.entries.length === 1 ? '1 informe' : place.entries.length + ' informes'}
                                {' · '}{place.entries.length === 1 ? '' : 'el último '}{nbAgo(place.entries[0].at)}
                            </span>
                        </span>
                    </div>
                    <ul className="nb-place-reports">
                        {place.entries.map((entry) => {
                            const giroText = entry.giros.length === 1 ? entry.giros[0].nombre_act : entry.giros.length + ' giros';
                            const radiusText = entry.radius >= 1000 ? (entry.radius / 1000) + ' km' : entry.radius + ' m';
                            return (
                                <li key={entry.lat + ',' + entry.lng + ',' + entry.giros.map((g) => g.codigo_act).join(',')}>
                                    <button type="button" className="nb-place-report" onClick={() => onOpenRecent(entry)}
                                        title={entry.giros.map((g) => g.nombre_act).join(', ')}>
                                        {nbIcon('store', 16)}
                                        <span className="nb-place-giro">{giroText}</span>
                                        <span className="nb-place-radius">{radiusText}</span>
                                        <span className="nb-recent-total">{nbNumber(entry.total)}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
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
                            <span role="cell" className={'nb-num' + (!statsLoading && !count ? ' is-zero' : '')}>{statsLoading ? spinner : nbNumber(count)}</span>
                            <span role="cell" className={'nb-num' + (!statsLoading && !jobs ? ' is-zero' : '')}>{statsLoading ? spinner : nbNumber(jobs)}</span>
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
        if (statsLoading || !summary) return <p className="nb-verdict-text is-loading">{spinner}Contando los negocios del DENUE dentro del radio…</p>;
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

    const stat = (value, label, empty, icon, busy) => (
        <div className="xb-stat nb-stat">
            {nbIcon(icon, 20)}
            <div className={'xb-stat-value' + (empty ? ' is-empty' : '')} aria-label={empty ? 'sin datos' : busy ? 'cargando' : undefined}>
                {busy ? spinner : value}
            </div>
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
                    {stat(summary ? nbNumber(summary.total_businesses) : '—', 'negocios', !statsBusy && !summary, 'store', statsBusy)}
                    {stat(summary ? nbNumber(summary.total_jobs) : '—', 'empleos', !statsBusy && !summary, 'briefcase', statsBusy)}
                    {stat(censusMissing ? '—' : nbNumber(indicators && indicators.population), 'habitantes', censusMissing, 'people', censusBusy)}
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

            {renderSection('Competencia', 'store', (
                <React.Fragment>
                    {renderGiroTable()}
                    {statsBusy && loadingCard('Buscando el negocio más cercano…')}
                    {nearest && !statsBusy && (
                        <div className="nb-callout nb-callout-icon">
                            {nbIcon('pin', 22)}
                            <div className="nb-callout-body">
                                <div className="xb-legend-head">
                                    <span className="nb-callout-head">Más cercano</span>
                                    <b>a {nbNumber(nearest.distance)} m</b>
                                </div>
                                <span className="nb-callout-name">{nearest.record.nom_estab || 'Sin nombre'}</span>
                                <span className="xb-muted" style={{ fontSize: 12 }}>
                                    {nearest.record.nombre_act}{nearest.record.per_ocu ? ' · ' + nearest.record.per_ocu : ''}
                                </span>
                            </div>
                        </div>
                    )}
                    {renderCompetitorSizes()}
                </React.Fragment>
            ), null, statsLoading || !summary ? null : { text: nbNumber(summary.total_businesses) + ' a ' + radiusLabel, tone: 'neutral' })}

            {renderSection('Gente', 'people', (
                <React.Fragment>
                    {renderFootTraffic()}
                    <div className="nb-sub" aria-label="Vecindario">
                        {eyebrow('pin', 'Vecindario')}
                        {censusBusy ? (
                            loadingCard('Leyendo las zonas censales que toca el radio…')
                        ) : censusMissing ? (
                            <p className="nb-empty-note">Sin datos del censo para este punto.</p>
                        ) : (
                            <React.Fragment>
                                <div className="nb-row">
                                    {nbIcon('wifi', 18)}
                                    <span className="nb-row-name">Viviendas con internet</span>
                                    <span className="nb-row-value">{nbNumber(indicators.housingInternet)} <small>· sin internet {nbNumber(indicators.housingNoInternet)}</small></span>
                                </div>
                                <div className="nb-row">
                                    {nbIcon('bus', 18)}
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

            {renderSection('Seguridad', 'shield', (
                <React.Fragment>
                    {censusBusy ? loadingCard('Contando los robos de la FGJ en la zona…') : censusReady ? (
                        <div className="nb-tiles">
                            <div className="nb-tile">
                                {nbIcon('store', 20)}
                                <span className="nb-tile-value">{nbNumber(indicators.businessThefts)}</span>
                                <span className="nb-tile-name">robos a negocios <small>· 2022</small></span>
                            </div>
                            <div className="nb-tile">
                                {nbIcon('bus', 20)}
                                <span className="nb-tile-value">{nbNumber(indicators.thefts)}</span>
                                <span className="nb-tile-name">robos en transporte público <small>· 2022</small></span>
                            </div>
                        </div>
                    ) : censusMissing ? (
                        <p className="nb-empty-note">Sin totales de la FGJ por zona para este punto.</p>
                    ) : null}
                    {renderRobberyTimes()}
                </React.Fragment>
            ), null, censusReady ? {
                text: nbNumber(indicators.businessThefts) + (indicators.businessThefts === 1 ? ' robo' : ' robos') + ' · 2022',
                tone: indicators.businessThefts ? 'warn' : 'good'
            } : null)}

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
        <aside className={`xb-inspector${point ? '' : ' is-empty'}${isMobile && point && sheetExpanded ? ' is-expanded' : ''}`} aria-label="Informe de la zona">
            {isMobile && point && <XbSheetHandle expanded={sheetExpanded} onChange={setSheetExpanded} />}
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

// The picker's sectors, by the SCIAN code's leading digits. Bakeries and
// tortillerías are manufacturing in SCIAN (3118) but read as food, and
// pharmacies (464) as health rather than shops. Giros outside these six are
// found by searching.
const NB_SECTORS = [
    { id: 'comida', label: 'Comida y bebida', icon: 'cup', tone: 'clay', has: (code) => code.startsWith('722') || code.startsWith('3118') },
    { id: 'salud', label: 'Salud', icon: 'health', tone: 'green', has: (code) => code.startsWith('62') || code.startsWith('464') },
    { id: 'tiendas', label: 'Tiendas', icon: 'cart', tone: 'blue', has: (code) => code.startsWith('46') && !code.startsWith('464') },
    { id: 'servicios', label: 'Servicios y reparaciones', icon: 'scissors', tone: 'amber', has: (code) => code.startsWith('81') },
    { id: 'educacion', label: 'Educación', icon: 'school', tone: 'blue', has: (code) => code.startsWith('61') },
    { id: 'talleres', label: 'Talleres y fábricas', icon: 'factory', tone: 'grey', has: (code) => /^3[123]/.test(code) && !code.startsWith('3118') },
];

// GiroPicker - search the DENUE activity catalogue, or browse it by sector,
// and add up to maxGiros.
function GiroPicker({ categoriesData, categoriesLoading, giros, maxGiros, onAdd, onClose }) {
    const [query, setQuery] = React.useState('');
    const [sectorId, setSectorId] = React.useState(null);
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const chosen = new Set(giros.map((g) => g.codigo_act));
    const full = giros.length >= maxGiros;
    const first = giros.length === 0;
    const text = query.trim().toLowerCase();
    const sector = NB_SECTORS.find((s) => s.id === sectorId) || null;
    const inSector = React.useMemo(() => {
        if (!categoriesData) return {};
        const counts = {};
        NB_SECTORS.forEach((s) => { counts[s.id] = categoriesData.filter((c) => s.has(c.codigo_act || '')).length; });
        return counts;
    }, [categoriesData]);
    // Inside a sector its whole list shows, narrowed by what is typed;
    // outside one, a search across the catalogue from two letters on.
    const matches = React.useMemo(() => {
        if (!categoriesData) return [];
        const typed = (c) => (c.nombre_act || '').toLowerCase().includes(text) || (c.codigo_act || '').startsWith(text);
        if (sector) return categoriesData.filter((c) => sector.has(c.codigo_act || '') && (!text || typed(c)));
        if (text.length < 2) return [];
        return categoriesData.filter(typed).slice(0, 8);
    }, [categoriesData, text, sector]);

    const openSector = (s) => {
        if (window.analyticsService) window.analyticsService.track('USER_OPEN_SECTOR', { sector: s.id });
        setSectorId(s.id);
        setQuery('');
    };

    return (
        <section className="nb-picker" aria-label="Añadir giro">
            <div className="xb-section-head">
                <div>
                    <h2 className="xb-title">{first ? '¿Qué negocio quieres abrir?' : 'Añadir giro'}</h2>
                    <p className="xb-muted">
                        {full
                            ? 'Ya elegiste ' + maxGiros + ' giros. Quita uno para añadir otro.'
                            : first ? 'Búscalo en el catálogo del DENUE o explora por sector.' : 'Búscalo o explora por sector.'}
                    </p>
                </div>
                {onClose ? <button type="button" className="xb-link" onClick={onClose}>Listo</button> : (
                    // Someone raising the shutter of their own shop.
                    <svg className="nb-picker-art" width="96" height="96" viewBox="0 0 112 112" aria-hidden="true">
                        <circle cx="56" cy="56" r="54" fill="#F4E4DC" />
                        <rect x="22" y="40" width="68" height="56" fill="#FFFFFF" stroke="#1C3684" strokeWidth="3" />
                        <path d="M16 40h80l-6-14H22z" fill="#B0532B" />
                        <path d="M26 44h60v20H26z" fill="#CFD8F2" />
                        <path d="M26 50h60M26 56h60" stroke="#1C3684" strokeWidth="1.5" />
                        <circle cx="70" cy="70" r="6" fill="#1C3684" />
                        <path d="M62 96v-14a8 8 0 0 1 16 0v14z" fill="#2B4FB3" />
                        <path d="M64 82l-6-16" stroke="#2B4FB3" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                )}
            </div>
            {!full && (
                <label className="nb-picker-search">
                    {nbIcon('search', 18)}
                    <input
                        ref={inputRef}
                        type="search"
                        placeholder={categoriesLoading ? 'Cargando el catálogo…' : sector ? 'Busca en ' + sector.label.toLowerCase() : 'Cafetería, farmacia, consultorio…'}
                        aria-label={sector ? 'Buscar en ' + sector.label : 'Buscar un giro'}
                        value={query}
                        disabled={categoriesLoading}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </label>
            )}
            {!full && !sector && text.length < 2 && (
                <div className="nb-sectors" role="list" aria-label="Sectores">
                    {NB_SECTORS.map((s) => (
                        <button key={s.id} type="button" role="listitem" className="nb-sector" onClick={() => openSector(s)}>
                            <span className={'nb-sector-icon is-' + s.tone}>{nbIcon(s.icon, 22)}</span>
                            <span className="nb-sector-name">{s.label}</span>
                            {categoriesData ? <span className="nb-sector-count">{inSector[s.id]} giros</span> : null}
                        </button>
                    ))}
                </div>
            )}
            {!full && sector && (
                <div className="nb-sector-head">
                    <button type="button" className="xb-link nb-sector-back" onClick={() => { setSectorId(null); setQuery(''); }}>
                        {nbIcon('back', 16)}Sectores
                    </button>
                    <span className={'nb-sector-icon is-' + sector.tone}>{nbIcon(sector.icon, 18)}</span>
                    <b>{sector.label}</b>
                </div>
            )}
            {!full && sector && categoriesLoading && <p className="xb-muted">Cargando el catálogo…</p>}
            {!full && (sector ? text.length > 0 : text.length >= 2) && matches.length === 0 && !categoriesLoading && (
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
