// Darker tones than the map's, so the number stays readable as text.
const scoreTone = (value) => {
    if (value === null || value === undefined) return { ink: '#6B7280', wash: '#F3F4F6' };
    if (value < 4) return { ink: '#DC2626', wash: '#FEF2F2' };
    if (value < 5) return { ink: '#EA580C', wash: '#FFF7ED' };
    if (value < 7) return { ink: '#CA8A04', wash: '#FEFCE8' };
    return { ink: '#16A34A', wash: '#F0FDF4' };
};

// The map's own colours for a score, for shapes rather than text.
const mapScoreColor = (value) => value < 4 ? '#EF4444' : value < 5 ? '#F97316' : value < 7 ? '#EAB308' : '#22C55E';

// The ranking strip of each area type (/api/area-score/distribution), fetched
// once: it is the same for every card.
const rankingStrips = {};
const loadRankingStrip = (areaType) => {
    if (!rankingStrips[areaType]) {
        rankingStrips[areaType] = fetch(`/api/area-score/distribution?type=${areaType}&buckets=50`)
            .then(response => response.ok ? response.json() : null)
            .catch(() => null);
    }
    return rankingStrips[areaType];
};

const RANKING_STEPS = [-100, -10, -1, 1, 10, 100];

// Moves through the whole ranking from this area's place: a strip of the city
// from best to worst (a tap jumps there), a slider, steps of 1, 10 and 100,
// and the places around the one in view. "Abrir" opens that area on the map
// through the 'area-score:open' event MapAdminApp listens for.
const RankingScrubber = ({ areaType, code, rank, rankOf }) => {
    const [cursor, setCursor] = React.useState(rank);
    const [strip, setStrip] = React.useState(null);
    const [rows, setRows] = React.useState([]);
    const noun = areaType === 'colonia' ? 'colonias' : 'AGEB';
    const fmt = (n) => n.toLocaleString('es-MX');

    React.useEffect(() => { setCursor(rank); }, [areaType, rank]);

    React.useEffect(() => {
        let cancelled = false;
        loadRankingStrip(areaType).then(data => { if (!cancelled) setStrip(data); });
        return () => { cancelled = true; };
    }, [areaType]);

    // The slider fires on every step; ask for the places once it settles.
    React.useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            fetch(`/api/area-score/ranking?type=${areaType}&from=${Math.max(cursor - 3, 1)}&to=${Math.min(cursor + 3, rankOf)}`)
                .then(response => response.ok ? response.json() : { rows: [] })
                .then(data => { if (!cancelled) setRows(data.rows); })
                .catch(() => {});
        }, 150);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [areaType, cursor, rankOf]);

    const move = (to) => setCursor(Math.min(Math.max(to, 1), rankOf));
    const focus = rows.find(row => row.rank === cursor);
    const open = (row) => window.dispatchEvent(new CustomEvent('area-score:open', { detail: { type: areaType, code: row.code } }));
    const better = rankOf > 1 ? Math.round((rankOf - cursor) / (rankOf - 1) * 100) : 100;
    const tone = scoreTone(focus ? focus.score : null);
    const scores = strip ? strip.buckets.map(bucket => bucket.score) : [];
    const low = Math.min(...scores), high = Math.max(...scores);

    return (
        <div className="hab-ranking">
            <div className="hab-ranking-head">
                <p className="hab-eyebrow">Recorre el ranking</p>
                {cursor !== rank && (
                    <button type="button" className="hab-ranking-home" onClick={() => setCursor(rank)}>
                        Volver al #{fmt(rank)}
                    </button>
                )}
            </div>

            <div className="hab-ranking-focus">
                <div className="hab-ranking-badge" style={{ color: tone.ink, background: tone.wash }}>
                    {focus ? focus.score.toFixed(2) : '…'}
                </div>
                <div className="hab-ranking-focus-text">
                    <span className="hab-ranking-focus-rank">#{fmt(cursor)}</span>
                    <span className="hab-ranking-focus-name">{focus ? focus.name || focus.code : 'Cargando…'}</span>
                    {focus && <span className="hab-caption">{focus.municipality}</span>}
                    <span className="hab-caption">Mejor que el {better}% de las {noun}</span>
                </div>
                {focus && focus.code !== code && (
                    <button type="button" className="hab-ranking-open" onClick={() => open(focus)}>Abrir</button>
                )}
            </div>

            {strip && (
                <div className="hab-ranking-strip" role="group" aria-label={`Calificación promedio de las ${noun}, de la mejor a la peor`}>
                    {strip.buckets.map(bucket => {
                        const inView = cursor >= bucket.from && cursor <= bucket.to;
                        const home = rank >= bucket.from && rank <= bucket.to;
                        const height = high > low ? 14 + (bucket.score - low) / (high - low) * 46 : 36;
                        return (
                            <button type="button" key={bucket.from}
                                    className={'hab-ranking-bucket' + (inView ? ' is-current' : '') + (home ? ' is-home' : '')}
                                    style={{ height: `${height}px`, '--bucket-color': mapScoreColor(bucket.score) }}
                                    aria-label={`Lugares ${fmt(bucket.from)} a ${fmt(bucket.to)}, promedio ${bucket.score.toFixed(1)}`}
                                    onClick={() => move(Math.round((bucket.from + bucket.to) / 2))} />
                        );
                    })}
                </div>
            )}
            <input type="range" className="hab-ranking-slider" min="1" max={rankOf} value={cursor}
                   onChange={(e) => move(Number(e.target.value))} aria-label="Lugar en el ranking" />
            <div className="hab-ranking-ends"><span>#1 · mejor</span><span>#{fmt(rankOf)} · peor</span></div>

            <div className="hab-ranking-steps">
                {RANKING_STEPS.map(step => (
                    <button type="button" key={step} onClick={() => move(cursor + step)}
                            disabled={step < 0 ? cursor === 1 : cursor === rankOf}
                            aria-label={`${step < 0 ? 'Subir' : 'Bajar'} ${Math.abs(step)} ${Math.abs(step) === 1 ? 'lugar' : 'lugares'}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points={step < 0 ? '6 15 12 9 18 15' : '6 9 12 15 18 9'}></polyline>
                        </svg>
                        {Math.abs(step)}
                    </button>
                ))}
            </div>

            <ol className="hab-ranking-list">
                {rows.map(row => (
                    <li key={row.code}>
                        <button type="button"
                                className={'hab-ranking-row' + (row.rank === cursor ? ' is-current' : '') + (row.code === code ? ' is-home' : '')}
                                onClick={() => row.rank === cursor ? (row.code !== code && open(row)) : move(row.rank)}>
                            <span className="hab-ranking-rank">#{fmt(row.rank)}</span>
                            <span className="hab-ranking-name">
                                <span>{row.name || row.code}{row.code === code ? ' · esta zona' : ''}</span>
                                <span className="hab-ranking-place">{row.municipality}</span>
                            </span>
                            <span className="hab-ranking-score">{row.score === null ? '—' : row.score.toFixed(2)}</span>
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
};

const GeozoneDetailsPanel = React.forwardRef(({ selectedGeozone, onClose, highlightedAxis = null }, ref) => {
    const panelRef = React.useRef(null);
    const [selectedCategory, setSelectedCategory] = React.useState(null);
    const [areaScore, setAreaScore] = React.useState(null);
    const [scoreState, setScoreState] = React.useState('loading'); // loading | ready | missing
    const [showMethod, setShowMethod] = React.useState(false);

    const AXIS_COLORS = {
        vivienda: '#3B82F6', transporte: '#10B981', seguridad: '#F59E0B',
        oportunidades: '#8B5CF6', agua: '#06B6D4', riesgo: '#64748B'
    };
    // The map tags every clicked shape as 'ageb', colonias included; a colonia
    // is told apart by its code.
    const geozoneProps = (selectedGeozone && selectedGeozone.properties) || {};
    const isColonia = !!selectedGeozone && (selectedGeozone.type === 'neighborhood' || selectedGeozone.type === 'neighbourhood'
        || (!!geozoneProps.neighbourhood_code && !geozoneProps.cvegeo));
    const areaNoun = isColonia ? 'colonias' : 'AGEB';

    // The Índice de habitabilidad Ciudad MX of the selected area
    // (/api/area-score, computed by build_area_scores).
    React.useEffect(() => {
        if (!selectedGeozone) return;
        setSelectedCategory(null);
        setShowMethod(false);
        const props = selectedGeozone.properties || {};
        const params = new URLSearchParams({ type: isColonia ? 'colonia' : 'ageb' });
        const code = isColonia ? props.neighbourhood_code : props.cvegeo;
        if (code) {
            params.set('code', code);
        } else {
            // No code on the feature: look the area up by the middle of its outline.
            const ring = (selectedGeozone.geometry && selectedGeozone.geometry.type === 'Polygon')
                ? selectedGeozone.geometry.coordinates[0]
                : (selectedGeozone.geometry && selectedGeozone.geometry.coordinates[0] && selectedGeozone.geometry.coordinates[0][0]) || [];
            if (!ring.length) { setScoreState('missing'); return; }
            const lngs = ring.map(c => c[0]), lats = ring.map(c => c[1]);
            params.set('lng', (Math.min(...lngs) + Math.max(...lngs)) / 2);
            params.set('lat', (Math.min(...lats) + Math.max(...lats)) / 2);
        }
        let cancelled = false;
        setScoreState('loading');
        fetch('/api/area-score?' + params.toString())
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (cancelled) return;
                setAreaScore(data);
                setScoreState(data ? 'ready' : 'missing');
            })
            .catch(() => { if (!cancelled) setScoreState('missing'); });
        return () => { cancelled = true; };
    }, [selectedGeozone]);

    // Expose the ref to the parent component
    React.useImperativeHandle(ref, () => ({
        scrollIntoView: () => {
            if (panelRef.current) {
                // Get the panel's position
                const panelRect = panelRef.current.getBoundingClientRect();
                const container = panelRef.current.closest('.vertical-panel-content');
                
                if (container) {
                    // Calculate the scroll position with 20px offset
                    const scrollTop = container.scrollTop + panelRect.top - 20;
                    container.scrollTo({
                        top: scrollTop,
                        behavior: 'smooth'
                    });
                } else {
                    // Fallback to default scrollIntoView
                    panelRef.current.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest' 
                    });
                }
            }
        }
    }));

    if (!selectedGeozone) return null;

    const formatScore = (value) => value === null || value === undefined ? '—' : value.toFixed(1);

    // The six axes as a radar, each label carrying its value; a click opens the axis below.
    const ScoreRadar = ({ axes, selected, highlighted, onSelect, size = 300 }) => {
        const center = size / 2;
        const radius = size / 2 - 58;
        const step = (2 * Math.PI) / axes.length;
        const at = (index, distance) => {
            const angle = index * step - Math.PI / 2;
            return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance];
        };
        const ring = (fraction) => axes.map((_axis, index) => at(index, radius * fraction).join(',')).join(' ');
        const shape = axes.map((axis, index) => at(index, radius * (axis.value || 0) / 10).join(',')).join(' ');

        return (
            <svg className="hab-radar" viewBox={`0 0 ${size} ${size}`} role="img"
                 aria-label={axes.map(axis => `${axis.label} ${formatScore(axis.value)}`).join(', ')}>
                {[0.25, 0.5, 0.75, 1].map(fraction => (
                    <polygon key={fraction} points={ring(fraction)} fill="none" stroke="#E5E7EB" strokeWidth="1" />
                ))}
                {axes.map((axis, index) => {
                    const [x, y] = at(index, radius);
                    return <line key={axis.key} x1={center} y1={center} x2={x} y2={y} stroke="#E5E7EB" strokeWidth="1" />;
                })}
                <polygon points={shape} fill="rgba(59, 130, 246, 0.14)" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />
                {axes.map((axis, index) => {
                    const active = selected === axis.key;
                    const peak = highlighted === axis.key;
                    const color = AXIS_COLORS[axis.key] || '#6B7280';
                    const [x, y] = at(index, radius * (axis.value || 0) / 10);
                    const [labelX, labelY] = at(index, radius + 30);
                    return (
                        <g key={axis.key} className="hab-radar-axis" onClick={() => onSelect(active ? null : axis.key)}>
                            <rect x={labelX - 46} y={labelY - 20} width="92" height="40" fill="transparent" />
                            {peak && axis.value !== null && (
                                <g className="hab-radar-peak">
                                    <line x1={center} y1={center} x2={x} y2={y} stroke={color} strokeWidth="3" strokeLinecap="round" />
                                    <circle cx={x} cy={y} r="13" fill={color} fillOpacity="0.2" />
                                </g>
                            )}
                            {axis.value !== null && (
                                <circle cx={x} cy={y} r={peak ? 7 : active ? 6 : 4.5} fill={color} stroke="#fff" strokeWidth="2" />
                            )}
                            <text x={labelX} y={labelY - 6} textAnchor="middle"
                                  className={'hab-radar-label' + (active || peak ? ' is-active' : '')}
                                  fill={active || peak ? color : '#6B7280'}>{axis.label}</text>
                            <text x={labelX} y={labelY + 11} textAnchor="middle"
                                  className={'hab-radar-value' + (peak ? ' is-peak' : '')}
                                  fill={axis.value === null ? '#9CA3AF' : peak ? color : '#111827'}>{formatScore(axis.value)}</text>
                        </g>
                    );
                })}
            </svg>
        );
    };

    const formatIndicator = (item) => {
        if (item.value === null) return '—';
        const digits = ['%', '/ha', 'cm/año'].includes(item.unit) ? 1 : 0;
        const number = item.value.toLocaleString('es-MX', { maximumFractionDigits: digits });
        if (!item.unit) return number;
        return item.unit === '%' ? number + '%' : number + ' ' + item.unit;
    };

    // One axis as a row with its 0-10 bar; the open one lists the indicators behind it.
    const AxisRow = ({ axis, open, highlighted, onToggle }) => {
        const color = AXIS_COLORS[axis.key] || '#6B7280';
        return (
            <li className={'hab-axis' + (open ? ' is-open' : '') + (highlighted ? ' is-highlighted' : '')} style={{ '--axis-color': color }}>
                <button type="button" className="hab-axis-head" onClick={onToggle} aria-expanded={open}>
                    <span className="hab-axis-dot" />
                    <span className="hab-axis-name">{axis.label}</span>
                    <span className="hab-bar">
                        <span className="hab-bar-fill" style={{ width: `${(axis.value || 0) * 10}%` }} />
                    </span>
                    <span className={'hab-axis-value' + (axis.value === null ? ' is-missing' : '')}>
                        {axis.value === null ? 'sin datos' : axis.value.toFixed(1)}
                    </span>
                    <svg className="hab-axis-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                {open && (
                    <ul className="hab-indicators">
                        {axis.indicators.map(item => (
                            <li key={item.key} className="hab-indicator"
                                title={item.percentile === null ? '' : `Mejor que el ${Math.round(item.percentile)}% de las ${areaNoun} de la ciudad`}>
                                <span className="hab-indicator-label">{item.label}</span>
                                <span className="hab-indicator-value">{formatIndicator(item)}</span>
                                <span className="hab-bar hab-bar-thin">
                                    <span className="hab-bar-fill" style={{ width: `${item.percentile || 0}%` }} />
                                </span>
                            </li>
                        ))}
                        <li className="hab-indicators-note">
                            La barra muestra qué tan bien está frente a las demás {areaNoun}: llena es la mejor de la ciudad.
                        </li>
                    </ul>
                )}
            </li>
        );
    };

    const getGeozoneTitle = () => {
        switch (selectedGeozone.type) {
            case 'ageb':
                return `AGEB ${selectedGeozone.properties.cve_ageb || selectedGeozone.id}`;
            case 'neighborhood':
                return selectedGeozone.properties.name || selectedGeozone.properties.nombre || 'Colonia';
            case 'municipality':
                return selectedGeozone.properties.name || selectedGeozone.properties.nombre || 'Municipio';
            default:
                return 'Zona Geográfica';
        }
    };

    const getGeozoneType = () => {
        switch (selectedGeozone.type) {
            case 'ageb':
                return 'Área Geoestadística Básica';
            case 'neighborhood':
                return 'Colonia';
            case 'municipality':
                return 'Municipio';
            default:
                return 'Zona Geográfica';
        }
    };

    const getGeozoneDetails = () => {
        const details = [];
        
        if (selectedGeozone.properties.cvegeo) {
            details.push({ label: 'CVEGEO', value: selectedGeozone.properties.cvegeo });
        }
        
        if (selectedGeozone.properties.cve_ageb) {
            details.push({ label: 'AGEB', value: selectedGeozone.properties.cve_ageb });
        }
        
        if (selectedGeozone.properties.cve_mun) {
            details.push({ label: 'Municipio', value: selectedGeozone.properties.cve_mun });
        }
        
        if (selectedGeozone.properties.cve_ent) {
            details.push({ label: 'Entidad', value: selectedGeozone.properties.cve_ent });
        }
        
        if (selectedGeozone.properties.nombre) {
            details.push({ label: 'Nombre', value: selectedGeozone.properties.nombre });
        }
        
        if (selectedGeozone.properties.name) {
            details.push({ label: 'Nombre', value: selectedGeozone.properties.name });
        }

        return details;
    };

    const details = getGeozoneDetails();

    return (
        <div className="floating-actions-container" ref={panelRef}>
            <div className="floating-actions-header">
                <div className="geozone-header-content">
                    <h3 className="floating-actions-title">{getGeozoneTitle()}</h3>
                    <span className="geozone-type-badge">{getGeozoneType()}</span>
                </div>
                <button className="close-floating-actions-button" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div className="floating-actions-content">
                <div className="scrollable-content-area">
                    <div className="floating-actions-section">
                        {scoreState === 'loading' && <p className="hab-status">Calculando el índice…</p>}
                        {scoreState === 'missing' && (
                            <p className="hab-status">Esta zona aún no tiene Índice de habitabilidad: por ahora sólo se calcula en la CDMX.</p>
                        )}
                        {scoreState === 'ready' && (() => {
                            const tone = scoreTone(areaScore.score);
                            const better = areaScore.rank && areaScore.rank_of > 1
                                ? Math.round((areaScore.rank_of - areaScore.rank) / (areaScore.rank_of - 1) * 100) : null;
                            const place = [areaScore.municipality,
                                areaScore.population ? `${areaScore.population.toLocaleString('es-MX')} habitantes` : null]
                                .filter(Boolean).join(' · ');
                            return (
                                <div className="hab-summary">
                                    <div className="hab-score" style={{ color: tone.ink, background: tone.wash }}>
                                        <span className="hab-score-number">{formatScore(areaScore.score)}</span>
                                        <span className="hab-score-scale">de 10</span>
                                    </div>
                                    <div className="hab-summary-text">
                                        <p className="hab-eyebrow">Índice de habitabilidad</p>
                                        {areaScore.rank ? (
                                            <p className="hab-rank">
                                                <strong>#{areaScore.rank.toLocaleString('es-MX')}</strong> de {areaScore.rank_of.toLocaleString('es-MX')} {areaNoun}
                                            </p>
                                        ) : (
                                            <p className="hab-rank">Sin lugar en el ranking</p>
                                        )}
                                        <p className="hab-caption">
                                            {better !== null
                                                ? `Mejor que el ${better}% de las ${areaNoun} de la CDMX`
                                                : 'Tiene muy pocos habitantes para compararla con las demás'}
                                        </p>
                                        {place && <p className="hab-caption">{place}</p>}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {scoreState === 'ready' && (
                        <div className="floating-actions-section">
                            <ScoreRadar axes={areaScore.axes} selected={selectedCategory} highlighted={highlightedAxis} onSelect={setSelectedCategory} />
                            <ul className="hab-axes">
                                {areaScore.axes.map(axis => (
                                    <AxisRow key={axis.key} axis={axis} open={selectedCategory === axis.key} highlighted={highlightedAxis === axis.key}
                                             onToggle={() => setSelectedCategory(selectedCategory === axis.key ? null : axis.key)} />
                                ))}
                            </ul>
                        </div>
                    )}

                    {scoreState === 'ready' && areaScore.rank && (
                        <div className="floating-actions-section">
                            <RankingScrubber areaType={areaScore.type} code={areaScore.code} rank={areaScore.rank} rankOf={areaScore.rank_of} />
                        </div>
                    )}

                    <div className="floating-actions-section">
                        <button type="button" className="hab-method-toggle" onClick={() => setShowMethod(!showMethod)} aria-expanded={showMethod}>
                            {showMethod ? 'Ocultar cómo se calcula' : 'Cómo se calcula'}
                        </button>
                        {showMethod && (
                            <div className="hab-method">
                                <p>
                                    Cada eje va de 0 a 10 y compara esta zona con las demás {areaNoun} de la
                                    ciudad: un 7 significa que le va mejor que al 70%. En Riesgo, 10 es el
                                    terreno más seguro. El índice es el promedio de los seis ejes.
                                </p>
                                <p>
                                    Fuentes: Censo 2020 (INEGI), carpetas de investigación de la FGJ, DENUE,
                                    estaciones de transporte y Atlas de Riesgos de la CDMX.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// Make the component available globally
window.GeozoneDetailsPanel = GeozoneDetailsPanel;
 