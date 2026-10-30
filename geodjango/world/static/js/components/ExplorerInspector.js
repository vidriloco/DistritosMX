// ExplorerInspector - the right-hand inspector of /explorar.
// One topic at a time (tabs), its indicators, year and radius, an inline
// legend and the totals inside the analysis radius. Detail panels for a
// station, a line or a geozone render above the topic content.

const EXPLORER_SECTIONS = [
    {
        id: 'oportunidades',
        label: 'Oportunidades',
        description: 'Población, empleo y equipamiento por AGEB según el Censo 2020 del INEGI y el DENUE.',
        source: 'INEGI · Censo 2020 y DENUE'
    },
    {
        id: 'inseguridad',
        label: 'Inseguridad',
        description: 'Carpetas de investigación de la FGJ CDMX agrupadas por zona. Elige un indicador y un año.',
        source: 'FGJ CDMX · carpetas de investigación'
    },
    {
        id: 'rentas_temporales',
        label: 'Vivienda',
        description: 'Anuncios de Airbnb y sus precios por noche, por tipo de alojamiento.',
        source: 'Inside Airbnb'
    },
    {
        id: 'movilidad',
        label: 'Movilidad',
        description: 'Estaciones de cada sistema de transporte dentro de la zona.',
        source: 'Ciudad MX · redes de transporte'
    }
];

const EXPLORER_OPPORTUNITY_INDICATORS = [
    { name: 'Población', property: 'population', unit: 'habitantes' },
    { name: 'Empresas', property: 'companies', unit: 'oficinas' },
    { name: 'Trabajos', property: 'jobs', unit: 'empleos' },
    { name: 'Educación', property: 'education', unit: 'escuelas' },
    { name: 'Salud', property: 'health', unit: 'hospitales' },
    { name: 'Comercio', property: 'provision', unit: 'negocios' },
    { name: 'Ocio', property: 'leisure', unit: '' }
];

const EXPLORER_CRIME_INDICATORS = (year) => [
    { name: 'Robos en transporte público', property: `thefts_${year}`, unit: 'casos' },
    { name: 'Delitos sexuales', property: `sexual_assault_${year}`, unit: 'casos' },
    { name: 'Robos a casa habitación', property: `house_thefts_${year}`, unit: 'casos' },
    { name: 'Robos a negocios', property: `business_thefts_${year}`, unit: 'casos' }
];

const EXPLORER_AIRBNB_GROUPS = [
    { key: 'general', label: 'General', suffix: '' },
    { key: 'fullHouse', label: 'Casas y departamentos completos', suffix: '_full_house' },
    { key: 'privateRoom', label: 'Habitaciones privadas', suffix: '_private_room' },
    { key: 'sharedRoom', label: 'Habitaciones compartidas', suffix: '_shared_room' },
    { key: 'hotelRoom', label: 'Habitaciones de hotel', suffix: '_entire_hotel' }
];

const EXPLORER_AIRBNB_INDICATORS = (suffix) => [
    { name: 'Número de Airbnbs', property: `airbnb_listings${suffix}`, unit: 'anuncios', count: true },
    { name: 'Suma de precios', property: `airbnb_listings${suffix}_price`, unit: 'MXN / noche' },
    { name: 'Precio promedio', property: `airbnb_listings${suffix}_price_average`, unit: 'MXN / noche' }
];

const EXPLORER_MOBILITY_INDICATORS = [
    { name: 'Estaciones Ecobici', property: 'ecobici_stations', unit: 'estaciones' },
    { name: 'Estaciones Cablebús', property: 'cablebus_stations', unit: 'estaciones' },
    { name: 'Estaciones Metro', property: 'metro_stations', unit: 'estaciones' },
    { name: 'Estaciones Metrobús', property: 'metrobus_stations', unit: 'estaciones' },
    { name: 'Estaciones RTP', property: 'rtp_stations', unit: 'estaciones' },
    { name: 'Estaciones Concesionados', property: 'concesionados_stations', unit: 'estaciones' },
    { name: 'Estaciones Tren Interurbano', property: 'tren_interurbano_stations', unit: 'estaciones' },
    { name: 'Estaciones Tren Suburbano', property: 'tren_suburbano_stations', unit: 'estaciones' },
    { name: 'Estaciones Mexibús', property: 'mexibus_stations', unit: 'estaciones' },
    { name: 'Estaciones Mexicable', property: 'mexicable_stations', unit: 'estaciones' },
    { name: 'Estaciones Tren Ligero', property: 'tren_ligero_stations', unit: 'estaciones' }
];

// A small line icon per indicator, in front of its name. Transport stations
// use the system's own logo, as the chips over the map do.
const EXPLORER_ICON_PATHS = {
    population: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M21 19c0-2.5-1.8-4.5-4-4.5"/>',
    companies: '<rect x="4" y="3" width="12" height="18" rx="1"/><path d="M16 9h4v12h-4M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1M9 21v-3h2v3"/>',
    jobs: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/>',
    education: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6"/>',
    health: '<path d="M12 4v16M4 12h16"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
    provision: '<path d="M6 8h12l1 13H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    leisure: '<path d="M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6z"/><path d="M10 5v14"/>',
    thefts: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v2M16 18v2M8 15h.5M15.5 15h.5"/>',
    sexual_assault: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M12 8v4M12 15h.01"/>',
    house_thefts: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10M10 20v-5h4v5"/>',
    business_thefts: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 11v9h14v-9M10 20v-5h4v5"/>',
    airbnb_listings: '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18M5 10V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v4M8 10V8h8v2"/>',
    airbnb_price: '<path d="M20 12l-8 8-9-9V4h7z"/><circle cx="7.5" cy="7.5" r="1"/>',
    airbnb_price_average: '<path d="M3 20h18"/><path d="M4 16l5-5 4 3 7-8"/><path d="M16 6h4v4"/>'
};
const EXPLORER_TRANSPORT_LOGO_KEYS = {
    ecobici: 'ecobici', cablebus: 'cablebus', metro: 'stc-metro', metrobus: 'metrobus', rtp: 'rtp',
    concesionados: 'concesionados', tren_interurbano: 'interurbano', tren_suburbano: 'suburbano',
    mexibus: 'mexibus', mexicable: 'mexicable', tren_ligero: 'tren-ligero'
};
function explorerIndicatorIcon(property) {
    const station = property.match(/^(.+)_stations$/);
    if (station) {
        const key = EXPLORER_TRANSPORT_LOGO_KEYS[station[1]];
        const src = key && window.UrlUtils ? UrlUtils.getTransportSystemLogoUrl(key) : (key ? `/static/images/transports/${key}-logo.png` : null);
        if (src) return <img className="xb-indicator-icon" src={src} alt="" />;
    }
    let paths = null;
    if (property.startsWith('airbnb_listings')) {
        paths = property.endsWith('_price_average') ? EXPLORER_ICON_PATHS.airbnb_price_average
            : property.endsWith('_price') ? EXPLORER_ICON_PATHS.airbnb_price
            : EXPLORER_ICON_PATHS.airbnb_listings;
    } else {
        const base = property.replace(/_\d{4}$/, '');
        paths = EXPLORER_ICON_PATHS[base] || null;
    }
    if (!paths) return null;
    return (
        <svg className="xb-indicator-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: paths }} />
    );
}

const EXPLORER_CRIME_YEARS = [2019, 2020, 2021, 2022, 2023, 2024];
const EXPLORER_RADII = [300, 500, 1000, 2000];

const explorerSectionOf = (indicator) => {
    if (!indicator) return null;
    if (['population', 'companies', 'jobs', 'education', 'health', 'provision', 'leisure'].includes(indicator)) return 'oportunidades';
    if (/^(thefts|sexual_assault|house_thefts|business_thefts)_/.test(indicator)) return 'inseguridad';
    if (indicator.startsWith('airbnb_listings')) return 'rentas_temporales';
    if (indicator.endsWith('_stations')) return 'movilidad';
    return null;
};

const explorerFirstIndicator = (section, year) => {
    switch (section) {
        case 'oportunidades': return { property: 'population', name: 'Población' };
        case 'inseguridad': return { property: `thefts_${year || 2022}`, name: 'Robos en transporte público' };
        case 'rentas_temporales': return { property: 'airbnb_listings', name: 'Número de Airbnbs' };
        case 'movilidad': return { property: 'ecobici_stations', name: 'Estaciones Ecobici' };
        default: return null;
    }
};

const explorerFormatValue = (value, indicator) => {
    const n = typeof value === 'number' && isFinite(value) ? value : 0;
    if (indicator.unit && indicator.unit.startsWith('MXN')) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
    }
    return n.toLocaleString('es-MX', { maximumFractionDigits: 0 });
};

const explorerFormatRadius = (m) => (m >= 1000 ? `${m / 1000} km` : `${m} m`);

function ExplorerInspector({
    map,
    showSearchDialog,
    setShowSearchDialog,
    transportData,
    onLineSelect,
    indicatorsData,
    indicatorsLoading,
    downloadProgress,
    indicatorsError,
    indicatorsVisible,
    setIndicatorsVisible,
    intersectingFeatures,
    hoveredFeature,
    selectedIndicator,
    onIndicatorSelect,
    selectedRadius,
    onRadiusChange,
    selectedYearCrime,
    onCrimeYearChange,
    selectedStation,
    onCloseStationDetails,
    selectedLine,
    onCloseLineDetails,
    lineDetailsPanelRef,
    selectedGeozone,
    onCloseGeozoneDetails,
    geozoneDetailsPanelRef,
    removeAllAnalysisLayers,
    removeAgebDataLayers,
    setSelectedIndicator,
    setIsClearingDueToSectionClose,
    selectedAnalysis,
    onAnalysisSelect,
    isMobile
}) {
    const transportSystems = window.transportSystems || {};
    const [activeSection, setActiveSection] = React.useState(null);
    const scrollRef = React.useRef(null);
    const stationPanelRef = React.useRef(null);

    // Keep the tab in step with whatever indicator is selected on the map side.
    React.useEffect(() => {
        const section = explorerSectionOf(selectedIndicator);
        if (section && section !== activeSection) setActiveSection(section);
    }, [selectedIndicator]);

    // A crime indicator follows the selected year.
    React.useEffect(() => {
        if (!selectedIndicator) return;
        const m = selectedIndicator.match(/^(thefts|sexual_assault|house_thefts|business_thefts)_(\d{4})$/);
        if (!m || Number(m[2]) === selectedYearCrime) return;
        const names = {
            thefts: 'Robos en transporte público',
            sexual_assault: 'Delitos sexuales',
            house_thefts: 'Robos a casa habitación',
            business_thefts: 'Robos a negocios'
        };
        onIndicatorSelect({ property: `${m[1]}_${selectedYearCrime}`, name: names[m[1]] });
    }, [selectedYearCrime]);

    // Scroll a detail panel into view when it opens.
    React.useEffect(() => {
        if (selectedStation && stationPanelRef.current) {
            setTimeout(() => stationPanelRef.current && stationPanelRef.current.scrollIntoView(), 100);
        }
    }, [selectedStation]);
    React.useEffect(() => {
        if (selectedLine && lineDetailsPanelRef && lineDetailsPanelRef.current) {
            setTimeout(() => lineDetailsPanelRef.current && lineDetailsPanelRef.current.scrollIntoView(), 100);
        }
    }, [selectedLine]);
    React.useEffect(() => {
        if (selectedGeozone && geozoneDetailsPanelRef && geozoneDetailsPanelRef.current) {
            setTimeout(() => geozoneDetailsPanelRef.current && geozoneDetailsPanelRef.current.scrollIntoView(), 100);
        }
    }, [selectedGeozone]);

    const handleTabClick = (section) => {
        if (section === activeSection) return;
        if (indicatorsLoading) return;
        if (indicatorsError) {
            alert('Error al cargar los indicadores: ' + indicatorsError);
            return;
        }
        if (!indicatorsData) return;
        // The indicators need a spatial unit; default to AGEB when none is chosen.
        if (!selectedAnalysis && onAnalysisSelect) onAnalysisSelect('agebs');
        setActiveSection(section);
        setIndicatorsVisible(true);
        if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        const first = explorerFirstIndicator(section, selectedYearCrime);
        if (first) setTimeout(() => onIndicatorSelect(first), 100);
    };

    const handleClearSection = () => {
        if (setIsClearingDueToSectionClose) setIsClearingDueToSectionClose(true);
        setSelectedIndicator(null);
        if (map && removeAgebDataLayers) removeAgebDataLayers();
        setActiveSection(null);
        setIndicatorsVisible(false);
        if (removeAllAnalysisLayers) removeAllAnalysisLayers();
    };

    const valueFor = (indicator) => {
        if (hoveredFeature && hoveredFeature.properties) {
            const v = hoveredFeature.properties[indicator.property];
            return typeof v === 'number' ? v : 0;
        }
        const pool = (intersectingFeatures && intersectingFeatures.length > 0)
            ? intersectingFeatures
            : (indicatorsData && indicatorsData.features) || [];
        return pool.reduce((sum, f) => {
            const v = f.properties ? f.properties[indicator.property] : 0;
            return sum + (typeof v === 'number' ? v : 0);
        }, 0);
    };

    const renderIndicator = (indicator) => {
        const selected = selectedIndicator === indicator.property;
        return (
            <label key={indicator.property} className={`xb-indicator${selected ? ' is-selected' : ''}`}>
                <input
                    type="radio"
                    name="xb-indicator"
                    checked={selected}
                    onChange={() => onIndicatorSelect(indicator)}
                />
                {explorerIndicatorIcon(indicator.property)}
                <span className="xb-indicator-name">{indicator.name}</span>
                <span className="xb-indicator-value">
                    {explorerFormatValue(valueFor(indicator), indicator)}
                    {indicator.unit ? <small> {indicator.unit}</small> : null}
                </span>
                {selected && renderScale(indicator)}
            </label>
        );
    };

    // The colour scale of the selected metric, with the value each end of the
    // ramp stands for, so the reader can place any zone's colour on it.
    const renderScale = (indicator) => {
        if (!window.ColorUtils) return null;
        const ranges = ColorUtils.getManualRanges(indicator.property) || [];
        if (ranges.length === 0) return null;
        const { minColor, maxColor } = ColorUtils.getColorRange(indicator.property);
        const min = ranges[0].min;
        const max = ranges[ranges.length - 1].max;
        const steps = 16;
        return (
            <span className="xb-indicator-scale" aria-label={`Escala de color: de ${min} a ${max}`}>
                <span className="xb-scale-min">{min.toLocaleString('es-MX')}</span>
                <span className="xb-scale-bar" aria-hidden="true">
                    {Array.from({ length: steps }, (_, i) => (
                        <span key={i} style={{ background: ColorUtils.interpolateColor(minColor, maxColor, i / (steps - 1)) }}></span>
                    ))}
                    <span className="xb-scale-max">{max.toLocaleString('es-MX')}+</span>
                </span>
            </span>
        );
    };

    // With AGEB or Colonia scope the app works on every zone it loaded; only
    // the Isocronas scope narrows the list to the zones inside the radius.
    const isRadiusScope = selectedAnalysis === 'isochrones';
    const zoneNoun = selectedAnalysis === 'neighborhood' ? 'colonias' : 'AGEB';

    const renderRadiusStats = () => {
        const count = intersectingFeatures ? intersectingFeatures.length : 0;
        if (!count) return null;
        const current = activeIndicators.find((i) => i.property === selectedIndicator);
        const total = { value: current ? explorerFormatValue(valueFor(current), current) : '—', label: current ? (current.unit || current.name) : 'indicador' };
        return (
            <section className="xb-stats" aria-label={isRadiusScope ? 'Totales en el radio' : 'Totales de la ciudad'}>
                <div className="xb-eyebrow">{isRadiusScope ? 'En el radio' : 'Total de la ciudad'}</div>
                <div className="xb-stats-grid">
                    <div className="xb-stat">
                        <div className="xb-stat-value">{total.value}</div>
                        <div className="xb-muted">{total.label}</div>
                    </div>
                    <div className="xb-stat">
                        <div className="xb-stat-value">{count.toLocaleString('es-MX')}</div>
                        <div className="xb-muted">{zoneNoun}</div>
                    </div>
                    {isRadiusScope && (
                        <div className="xb-stat">
                            <div className="xb-stat-value">{explorerFormatRadius(selectedRadius)}</div>
                            <div className="xb-muted">radio</div>
                        </div>
                    )}
                </div>
                {!isRadiusScope && (
                    <p className="xb-muted">Elige «Isocronas» arriba para acotar los totales a un radio alrededor del pin.</p>
                )}
            </section>
        );
    };

    const section = EXPLORER_SECTIONS.find((s) => s.id === activeSection) || null;
    let activeIndicators = [];
    if (activeSection === 'oportunidades') activeIndicators = EXPLORER_OPPORTUNITY_INDICATORS;
    if (activeSection === 'inseguridad') activeIndicators = EXPLORER_CRIME_INDICATORS(selectedYearCrime);
    if (activeSection === 'movilidad') activeIndicators = EXPLORER_MOBILITY_INDICATORS;
    if (activeSection === 'rentas_temporales') {
        activeIndicators = EXPLORER_AIRBNB_GROUPS.flatMap((g) => EXPLORER_AIRBNB_INDICATORS(g.suffix));
    }

    const tabsDisabled = !indicatorsData || indicatorsLoading;

    return (
        <aside className="xb-inspector" aria-label="Inspector de capas">
            {indicatorsLoading && (
                <div className="xb-progress" role="progressbar" aria-label="Cargando datos de indicadores" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(downloadProgress || 0)}>
                    <span style={{ width: `${Math.max(4, Math.min(100, downloadProgress || 0))}%` }}></span>
                </div>
            )}
            {/* On a phone the top bar has no room for the unit chips. */}
            {isMobile && (
                <ExplorerUnitChips
                    className="xb-sheet-units"
                    selectedAnalysis={selectedAnalysis}
                    onAnalysisSelect={onAnalysisSelect}
                />
            )}
            <div className="xb-tabs" role="tablist" aria-label="Temas">
                {EXPLORER_SECTIONS.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={activeSection === s.id}
                        className={`xb-tab${activeSection === s.id ? ' is-active' : ''}`}
                        onClick={() => handleTabClick(s.id)}
                        disabled={tabsDisabled}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="vertical-panel-content xb-scroll" ref={scrollRef}>
                {selectedGeozone && (
                    <GeozoneDetailsPanel
                        ref={geozoneDetailsPanelRef}
                        selectedGeozone={selectedGeozone}
                        onClose={onCloseGeozoneDetails}
                    />
                )}
                {selectedLine && (
                    <LineDetailsPanel
                        ref={lineDetailsPanelRef}
                        selectedLine={selectedLine}
                        transportSystems={transportSystems}
                        onClose={onCloseLineDetails}
                    />
                )}
                {selectedStation && (
                    <StationDetailsPanel
                        ref={stationPanelRef}
                        selectedStation={selectedStation}
                        onClose={onCloseStationDetails}
                    />
                )}

                {!selectedGeozone && !section && (
                    <section className="xb-empty">
                        <h2 className="xb-title">Explora el territorio</h2>
                        {indicatorsLoading && (
                            <div className="xb-notice" role="status" aria-live="polite">
                                <div className="xb-notice-row">
                                    <span className="xb-notice-spinner" aria-hidden="true"></span>
                                    <span>Cargando los datos de las zonas…</span>
                                    <strong>{Math.round(downloadProgress || 0)}%</strong>
                                </div>
                                <div className="xb-notice-bar" aria-hidden="true">
                                    <span style={{ width: `${Math.max(2, Math.min(100, downloadProgress || 0))}%` }}></span>
                                </div>
                            </div>
                        )}
                        <p className="xb-muted">Elige un tema arriba. Las zonas se pintan según el indicador que selecciones.</p>
                    </section>
                )}

                {!selectedGeozone && section && (
                    <React.Fragment>
                        <section className="xb-section-head">
                            <div>
                                <h2 className="xb-title">{section.label}</h2>
                                <p className="xb-muted">{section.description}</p>
                            </div>
                            <button type="button" className="xb-link" onClick={handleClearSection}>Quitar</button>
                        </section>

                        {activeSection === 'rentas_temporales' ? (
                            EXPLORER_AIRBNB_GROUPS.map((g) => (
                                <div key={g.key} className="xb-group" role="radiogroup" aria-label={g.label}>
                                    <div className="xb-eyebrow">{g.label}</div>
                                    {EXPLORER_AIRBNB_INDICATORS(g.suffix).map(renderIndicator)}
                                </div>
                            ))
                        ) : (
                            <div className="xb-group" role="radiogroup" aria-label="Indicador">
                                {activeIndicators.map(renderIndicator)}
                            </div>
                        )}

                        <section className="xb-controls">
                            {activeSection === 'inseguridad' && (
                                <div className="xb-field">
                                    <label htmlFor="xb-year" className="xb-eyebrow">Año</label>
                                    <select
                                        id="xb-year"
                                        className="xb-select"
                                        value={selectedYearCrime}
                                        onChange={(e) => onCrimeYearChange(Number(e.target.value))}
                                    >
                                        {EXPLORER_CRIME_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            )}
                            {isRadiusScope && (
                            <div className="xb-field">
                                <div className="xb-eyebrow">Radio · {explorerFormatRadius(selectedRadius)}</div>
                                <div className="xb-segmented" role="group" aria-label="Radio de análisis">
                                    {EXPLORER_RADII.map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            className={selectedRadius === r ? 'is-active' : ''}
                                            onClick={() => onRadiusChange(r)}
                                            aria-pressed={selectedRadius === r}
                                        >
                                            {explorerFormatRadius(r)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            )}
                        </section>

                        {renderRadiusStats()}
                    </React.Fragment>
                )}
            </div>

            <footer className="xb-foot">
                <span>{section ? `Fuente: ${section.source}` : 'Fuente: INEGI · Censo 2020'}</span>
                {section && <button type="button" className="xb-link" onClick={handleClearSection}>Limpiar mapa</button>}
            </footer>

            {showSearchDialog && (
                <LinesNavigator
                    transportData={transportData}
                    transportSystems={transportSystems}
                    onClose={() => setShowSearchDialog(false)}
                    map={map}
                    onLineSelect={onLineSelect}
                />
            )}
        </aside>
    );
}

window.ExplorerInspector = ExplorerInspector;
