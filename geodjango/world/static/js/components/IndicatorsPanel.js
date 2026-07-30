// Helper function to get indicator display name (shared with MapAdminApp)
const getIndicatorDisplayName = (indicatorProperty) => {
    const INDICATOR_NAMES = {
        'population': 'Población',
        'companies': 'Empresas', 
        'jobs': 'Trabajos',
        'education': 'Educación',
        'health': 'Salud',
        'provision': 'Comercio',
        'leisure': 'Ocio',
        'housing': 'Vivienda',
        'cars': 'Autos',
        'bikes': 'Bicis',
        'motorcycles': 'Motos',
        // Crime indicators - these will be dynamically mapped based on year
        'thefts': 'Robos en transporte público',
        'sexual_assault': 'Delitos sexuales',
        'house_thefts': 'Robos a casa habitación',
        'business_thefts': 'Robos a negocios',
        // Airbnb indicators
        'airbnb_listings': 'Número de Airbnbs',
        'airbnb_listings_price': 'Suma de precios',
        'airbnb_listings_price_average': 'Precio promedio',
        'airbnb_listings_full_house': 'Casas completas',
        'airbnb_listings_full_house_price': 'Suma precios casas completas',
        'airbnb_listings_full_house_price_average': 'Precio promedio casas completas',
        'airbnb_listings_private_room': 'Habitaciones privadas',
        'airbnb_listings_private_room_price': 'Suma precios habitaciones privadas',
        'airbnb_listings_private_room_price_average': 'Precio promedio habitaciones privadas',
        'airbnb_listings_shared_room': 'Habitaciones compartidas',
        'airbnb_listings_shared_room_price': 'Suma precios habitaciones compartidas',
        'airbnb_listings_shared_room_price_average': 'Precio promedio habitaciones compartidas',
        'airbnb_listings_entire_hotel': 'Habitaciones de hotel',
        'airbnb_listings_entire_hotel_price': 'Suma precios habitaciones de hotel',
        'airbnb_listings_entire_hotel_price_average': 'Precio promedio habitaciones de hotel'
    };

    // Handle crime indicators with year suffixes (e.g., "thefts_2022" -> "thefts")
    let indicatorName = INDICATOR_NAMES[indicatorProperty];
    if (!indicatorName && indicatorProperty.includes('_')) {
        // Split by underscore and check if the last part is a year (4 digits)
        const parts = indicatorProperty.split('_');
        const lastPart = parts[parts.length - 1];
        
        if (/^\d{4}$/.test(lastPart)) {
            // Last part is a year, so the base indicator is everything before it
            const baseIndicator = parts.slice(0, -1).join('_');
            indicatorName = INDICATOR_NAMES[baseIndicator];
        }
    }
    
    // Fallback to the original indicator name if not found
    return indicatorName || indicatorProperty;
};

const IndicatorsPanel = React.forwardRef(({ indicatorsData, onClose, intersectingFeatures, hoveredFeature, onIndicatorSelect, selectedIndicator, selectedYearCrime, onCrimeYearChange, activeSections = {}, onSectionClose }, ref) => {
    const panelRef = React.useRef(null);

    // Expose the scrollIntoView function through the ref
    React.useImperativeHandle(ref, () => ({
        scrollIntoView: () => {
            if (panelRef.current) {
                // Get the panel's position
                const panelRect = panelRef.current.getBoundingClientRect();
                const container = panelRef.current.closest('.vertical-panel-content');
                
                if (container) {
                    // Calculate the scroll position to scroll to the very top of the panel
                    const scrollTop = container.scrollTop + panelRect.top - container.offsetTop;
                    container.scrollTo({
                        top: scrollTop,
                        behavior: 'smooth'
                    });
                } else {
                    // Fallback to default scrollIntoView with top alignment
                    panelRef.current.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }
        }
    }));

    if (!indicatorsData) return null;

    // Define indicators and their mapping to geojson properties
    const opportunityIndicators = [
        { id: 1, name: "Población", property: "population", category: "Demografía", unit: "habitantes" },
        { id: 2, name: "Empresas", property: "companies", category: "Empresas", unit: "oficinas" },
        { id: 3, name: "Trabajos", property: "jobs", category: "Trabajos", unit: "empleos" },
        { id: 4, name: "Educación", property: "education", category: "Educación", unit: "escuelas" },
        { id: 5, name: "Salud", property: "health", category: "Salud", unit: "hospitales" },
        { id: 6, name: "Comercio", property: "provision", category: "Comercio", unit: "negocios" },
        { id: 7, name: "Ocio", property: "leisure", category: "Ocio", unit: "" }
    ];

    // Function to generate crime indicators based on selected year
    const getCrimeIndicators = (year) => [
        { id: 1, name: "Robos en transporte público", property: `thefts_${year}`, category: "Robos", unit: "casos" },
        { id: 2, name: "Delitos sexuales", property: `sexual_assault_${year}`, category: "Delitos sexuales", unit: "casos" },
        { id: 3, name: "Robos a casa habitación", property: `house_thefts_${year}`, category: "Robos", unit: "casos" },
        { id: 4, name: "Robos a negocios", property: `business_thefts_${year}`, category: "Robos", unit: "casos" }
    ];

    // Get current crime indicators based on selected year
    const crimeIndicators = getCrimeIndicators(selectedYearCrime);

    // Define Airbnb indicators organized by subsections
    const airbnbIndicators = {
        general: [
            { id: 1, name: "Número de Airbnbs", property: "airbnb_listings", category: "Airbnb", unit: "listings", hint: "Muestra el número total de Airbnbs en la zona seleccionada" },
            { id: 2, name: "Suma de precios", property: "airbnb_listings_price", category: "Airbnb", unit: "MXN", hint: "Muestra la suma de los precios de los Airbnbs en la zona seleccionada por noche de ocupación" },
            { id: 3, name: "Precio promedio", property: "airbnb_listings_price_average", category: "Airbnb", unit: "MXN", hint: "Muestra el precio promedio de los Airbnbs en la zona seleccionada por noche de ocupación" }
        ],
        fullHouse: [
            { id: 4, name: "Número de Airbnbs", property: "airbnb_listings_full_house", category: "Airbnb", unit: "listings", hint: "Muestra el número de casas completas en la zona seleccionada" },
            { id: 5, name: "Suma de precios", property: "airbnb_listings_full_house_price", category: "Airbnb", unit: "MXN", hint: "Muestra la suma de los precios de las casas completas en la zona seleccionada por noche de ocupación" },
            { id: 6, name: "Precio promedio", property: "airbnb_listings_full_house_price_average", category: "Airbnb", unit: "MXN", hint: "Muestra el precio promedio de las casas completas en la zona seleccionada por noche de ocupación" }
        ],
        privateRoom: [
            { id: 7, name: "Número de Airbnbs", property: "airbnb_listings_private_room", category: "Airbnb", unit: "listings", hint: "Muestra el número de habitaciones privadas en la zona seleccionada" },
            { id: 8, name: "Suma de precios", property: "airbnb_listings_private_room_price", category: "Airbnb", unit: "MXN", hint: "Muestra la suma de los precios de las habitaciones privadas en la zona seleccionada por noche de ocupación" },
            { id: 9, name: "Precio promedio", property: "airbnb_listings_private_room_price_average", category: "Airbnb", unit: "MXN", hint: "Muestra el precio promedio de las habitaciones privadas en la zona seleccionada por noche de ocupación" }
        ],
        sharedRoom: [
            { id: 10, name: "Número de Airbnbs", property: "airbnb_listings_shared_room", category: "Airbnb", unit: "listings", hint: "Muestra el número de habitaciones compartidas en la zona seleccionada" },
            { id: 11, name: "Suma de precios", property: "airbnb_listings_shared_room_price", category: "Airbnb", unit: "MXN", hint: "Muestra la suma de los precios de las habitaciones compartidas en la zona seleccionada por noche de ocupación" },
            { id: 12, name: "Precio promedio", property: "airbnb_listings_shared_room_price_average", category: "Airbnb", unit: "MXN", hint: "Muestra el precio promedio de las habitaciones compartidas en la zona seleccionada por noche de ocupación" }
        ],
        hotelRoom: [
            { id: 13, name: "Número de Airbnbs", property: "airbnb_listings_entire_hotel", category: "Airbnb", unit: "listings", hint: "Muestra el número de habitaciones de hotel en la zona seleccionada" },
            { id: 14, name: "Suma de precios", property: "airbnb_listings_entire_hotel_price", category: "Airbnb", unit: "MXN", hint: "Muestra la suma de los precios de las habitaciones de hotel en la zona seleccionada por noche de ocupación" },
            { id: 15, name: "Precio promedio", property: "airbnb_listings_entire_hotel_price_average", category: "Airbnb", unit: "MXN", hint: "Muestra el precio promedio de las habitaciones de hotel en la zona seleccionada por noche de ocupación" }
        ]
    };

    // Define section titles
    const airbnbSectionTitles = {
        general: "General",
        fullHouse: "Casas / Departamentos completos",
        privateRoom: "Habitaciones privadas",
        sharedRoom: "Habitaciones compartidas",
        hotelRoom: "Habitaciones de hotel"
    };

    // Define Movilidad indicators
    const movilidadIndicators = [
        { id: 1, name: "Estaciones Ecobici", property: "ecobici_stations", category: "Movilidad", unit: "estaciones" },
        { id: 2, name: "Estaciones Cablebús", property: "cablebus_stations", category: "Movilidad", unit: "estaciones" },
        { id: 3, name: "Estaciones Metro", property: "metro_stations", category: "Movilidad", unit: "estaciones" },
        { id: 4, name: "Estaciones Metrobús", property: "metrobus_stations", category: "Movilidad", unit: "estaciones" },
        { id: 5, name: "Estaciones RTP", property: "rtp_stations", category: "Movilidad", unit: "estaciones" },
        { id: 6, name: "Estaciones Concesionados", property: "concesionados_stations", category: "Movilidad", unit: "estaciones" },
        { id: 7, name: "Estaciones Tren Interurbano", property: "tren_interurbano_stations", category: "Movilidad", unit: "estaciones" },
        { id: 8, name: "Estaciones Tren Suburbano", property: "tren_suburbano_stations", category: "Movilidad", unit: "estaciones" },
        { id: 9, name: "Estaciones Mexibús", property: "mexibus_stations", category: "Movilidad", unit: "estaciones" },
        { id: 10, name: "Estaciones Mexicable", property: "mexicable_stations", category: "Movilidad", unit: "estaciones" },
        { id: 11, name: "Estaciones Tren Ligero", property: "tren_ligero_stations", category: "Movilidad", unit: "estaciones" }
    ];

    const handleIndicatorSelect = (indicator) => {
        onIndicatorSelect(indicator);
    };

    const handleYearSelect = (year) => {
        if (onCrimeYearChange && typeof onCrimeYearChange === 'function') {
            onCrimeYearChange(year);
        }
    };

    const availableYears = [2019, 2020, 2021, 2022, 2023, 2024];

    return (
        <div className="floating-actions-container" ref={panelRef}>
            <div className="floating-actions-header">
                <button className="close-floating-actions-button" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <h3 className="floating-actions-title">Capas seleccionadas</h3>
            </div>
            <div className="floating-actions-content">
                <div className="floating-actions-section">
                    <div className="indicator-list-section">
                        {/* Show Oportunidades section if active */}
                        {activeSections.oportunidades && (
                            <div className="indicator-section-container">
                                <div className="indicator-list-section-header">
                                    <h4 className="indicator-list-section-title">Oportunidades</h4>
                                    <a 
                                        className="close-section-link" 
                                        onClick={() => onSectionClose('oportunidades')}
                                        title="Cerrar sección"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Cerrar
                                    </a>
                                </div>
                                {opportunityIndicators.map((indicator) => {
                                    let indicatorValue = 0;
                                    if (hoveredFeature && hoveredFeature.properties) {
                                        const v = hoveredFeature.properties[indicator.property];
                                        indicatorValue = typeof v === 'number' ? v : 0;
                                    } else if (intersectingFeatures && intersectingFeatures.length > 0) {
                                        indicatorValue = intersectingFeatures.reduce((sum, f) => {
                                            const v = f.properties[indicator.property];
                                            return sum + (typeof v === 'number' ? v : 0);
                                        }, 0);
                                    } else if (indicatorsData && indicatorsData.features && indicatorsData.features.length > 0) {
                                        // Fallback: show total from all available data when no specific features are selected
                                        indicatorValue = indicatorsData.features.reduce((sum, f) => {
                                            const v = f.properties[indicator.property];
                                            return sum + (typeof v === 'number' ? v : 0);
                                        }, 0);
                                    }
                                    const indicatorRanges = ColorUtils.getManualRanges(indicator.property);
                                    
                                    // Get the color brackets for gradient calculation
                                    const colorRange = ColorUtils.getColorRange(indicator.property);
                                    const minColor = colorRange.minColor;
                                    const maxColor = colorRange.maxColor;
                                    
                                    return (
                                        <div
                                            key={indicator.id}
                                            className={`indicator-list-item${selectedIndicator === indicator.property ? ' selected' : ''}`}
                                            onClick={() => handleIndicatorSelect(indicator)}
                                        >
                                            <div className="indicator-list-content">
                                                <span className="indicator-list-label">{indicator.name}</span>
                                                <span className="indicator-list-value">
                                                    {indicatorValue.toLocaleString()}
                                                </span>
                                            </div>
                                            {selectedIndicator === indicator.property && indicatorRanges.length > 0 && (
                                                <div className="indicator-bar-section indicator-bar-section-inline">
                                                    <div className="legend-bar-container">
                                                        <div className="legend-bar">
                                                            {Array.from({ length: 20 }, (_, idx) => {
                                                                const factor = idx / 19; // 0 to 1
                                                                const segmentColor = ColorUtils.interpolateColor(minColor, maxColor, factor);
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="legend-bar-segment"
                                                                        style={{ backgroundColor: segmentColor, flex: 1 }}
                                                                    ></div>
                                                                );
                                                            })}
                                                            <div className="legend-bar-labels">
                                                                <div className="legend-bar-label legend-bar-label-left">
                                                                    <span>{indicatorRanges[0].min.toLocaleString()}</span>
                                                                </div>
                                                                <div className="legend-bar-label legend-bar-label-right">
                                                                    <span>{indicatorRanges[indicatorRanges.length - 1].max.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Show Inseguridad section if active */}
                        {activeSections.inseguridad && (
                            <div className="indicator-section-container">
                                <div className="indicator-list-section-header">
                                    <h4 className="indicator-list-section-title">Inseguridad</h4>
                                    <a 
                                        className="close-section-link" 
                                        onClick={() => onSectionClose('inseguridad')}
                                        title="Cerrar sección"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Cerrar
                                    </a>
                                </div>
                                {crimeIndicators.map((indicator) => {
                                    let indicatorValue = 0;
                                    if (hoveredFeature && hoveredFeature.properties) {
                                        const v = hoveredFeature.properties[indicator.property];
                                        indicatorValue = typeof v === 'number' ? v : 0;
                                    } else if (intersectingFeatures && intersectingFeatures.length > 0) {
                                        indicatorValue = intersectingFeatures.reduce((sum, f) => {
                                            const v = f.properties[indicator.property];
                                            return sum + (typeof v === 'number' ? v : 0);
                                        }, 0);
                                    } else if (indicatorsData && indicatorsData.features && indicatorsData.features.length > 0) {
                                        // Fallback: show total from all available data when no specific features are selected
                                        indicatorValue = indicatorsData.features.reduce((sum, f) => {
                                            const v = f.properties[indicator.property];
                                            return sum + (typeof v === 'number' ? v : 0);
                                        }, 0);
                                    }
                                    const indicatorRanges = ColorUtils.getManualRanges(indicator.property);
                                    
                                    // Get the color brackets for gradient calculation
                                    const colorRange = ColorUtils.getColorRange(indicator.property);
                                    const minColor = colorRange.minColor;
                                    const maxColor = colorRange.maxColor;
                                    
                                    return (
                                        <div
                                            key={indicator.id}
                                            className={`indicator-list-item${selectedIndicator === indicator.property ? ' selected' : ''}`}
                                            onClick={() => handleIndicatorSelect(indicator)}
                                        >
                                            <div className="indicator-list-content">
                                                <span className="indicator-list-label">{indicator.name}</span>
                                                <span className="indicator-list-value">
                                                    {indicatorValue.toLocaleString()}
                                                </span>
                                            </div>
                                            {selectedIndicator === indicator.property && indicatorRanges.length > 0 && (
                                                <div className="indicator-bar-section indicator-bar-section-inline">
                                                    <div className="legend-bar-container">
                                                        <div className="legend-bar">
                                                            {Array.from({ length: 20 }, (_, idx) => {
                                                                const factor = idx / 19; // 0 to 1
                                                                const segmentColor = ColorUtils.interpolateColor(minColor, maxColor, factor);
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="legend-bar-segment"
                                                                        style={{ backgroundColor: segmentColor, flex: 1 }}
                                                                    ></div>
                                                                );
                                                            })}
                                                            <div className="legend-bar-labels">
                                                                <div className="legend-bar-label legend-bar-label-left">
                                                                    <span>{indicatorRanges[0].min.toLocaleString()}</span>
                                                                </div>
                                                                <div className="legend-bar-label legend-bar-label-right">
                                                                    <span>{indicatorRanges[indicatorRanges.length - 1].max.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="indicator-divider"></div>
                                <div className="year-selector">
                                    <span className="year-label">Año:</span>
                                    <div className="year-buttons-container">
                                        {availableYears.map((year) => (
                                            <button
                                                key={year}
                                                className={`year-link${selectedYearCrime === year ? ' active' : ''}`}
                                                onClick={() => handleYearSelect(year)}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Show Vivienda section if active */}
                        {activeSections.rentas_temporales && (
                            <div className="indicator-section-container">
                                <div className="indicator-list-section-header">
                                    <h4 className="indicator-list-section-title">Vivienda</h4>
                                    <a 
                                        className="close-section-link" 
                                        onClick={() => onSectionClose('rentas_temporales')}
                                        title="Cerrar sección"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Cerrar
                                    </a>
                                </div>
                                {/* Render Airbnb indicators organized by subsections */}
                                {Object.entries(airbnbIndicators).map(([sectionKey, indicators], sectionIndex) => (
                                    <div key={sectionKey}>
                                        {/* Section title */}
                                        {sectionIndex > 0 && (
                                            <div className="indicator-subsection-title">
                                                <h5 className="indicator-subsection-title-text">{airbnbSectionTitles[sectionKey]}</h5>
                                            </div>
                                        )}
                                        {/* Section indicators */}
                                        {indicators.map((indicator) => {
                                            let indicatorValue = 0;
                                            if (hoveredFeature && hoveredFeature.properties) {
                                                const v = hoveredFeature.properties[indicator.property];
                                                indicatorValue = typeof v === 'number' ? v : 0;
                                            } else if (intersectingFeatures && intersectingFeatures.length > 0) {
                                                indicatorValue = intersectingFeatures.reduce((sum, f) => {
                                                    const v = f.properties[indicator.property];
                                                    return sum + (typeof v === 'number' ? v : 0);
                                                }, 0);
                                            } else if (indicatorsData && indicatorsData.features && indicatorsData.features.length > 0) {
                                                // Fallback: show total from all available data when no specific features are selected
                                                indicatorValue = indicatorsData.features.reduce((sum, f) => {
                                                    const v = f.properties[indicator.property];
                                                    return sum + (typeof v === 'number' ? v : 0);
                                                }, 0);
                                            }
                                            const indicatorRanges = ColorUtils.getManualRanges(indicator.property);
                                            
                                            // Get the color brackets for gradient calculation
                                            const colorRange = ColorUtils.getColorRange(indicator.property);
                                            const minColor = colorRange.minColor;
                                            const maxColor = colorRange.maxColor;
                                            
                                            // Format value based on indicator type
                                            const formatValue = (value, property) => {
                                                // Check if it's a count indicator (not a price indicator)
                                                const countIndicators = [
                                                    'airbnb_listings',
                                                    'airbnb_listings_full_house',
                                                    'airbnb_listings_private_room',
                                                    'airbnb_listings_shared_room',
                                                    'airbnb_listings_entire_hotel'
                                                ];
                                                
                                                if (countIndicators.includes(property)) {
                                                    // For number of listings, just use regular formatting
                                                    return value.toLocaleString();
                                                } else {
                                                    // For price indicators, format as Mexican pesos with explicit MXN suffix
                                                    const formattedValue = new Intl.NumberFormat('es-MX', {
                                                        style: 'currency',
                                                        currency: 'MXN',
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 0
                                                    }).format(value);
                                                    // Ensure MXN suffix is present
                                                    return formattedValue.includes('MXN') ? formattedValue : `${formattedValue} MXN`;
                                                }
                                            };
                                            
                                            return (
                                                <div
                                                    key={indicator.id}
                                                    className={`indicator-list-item${selectedIndicator === indicator.property ? ' selected' : ''}`}
                                                    onClick={() => handleIndicatorSelect(indicator)}
                                                >
                                                    <div className="indicator-list-content">
                                                        <span className="indicator-list-label">{indicator.name}</span>
                                                        <div className="indicator-list-value-container">
                                                            <span className="indicator-list-value">
                                                                {formatValue(indicatorValue, indicator.property)}
                                                            </span>
                                                            {indicator.hint && (
                                                                <div className="info-icon-container" title={indicator.hint}>
                                                                    <svg width="14" height="14" viewBox="0 0 512 512" style={{ cursor: 'help' }}>
                                                                        <path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {selectedIndicator === indicator.property && indicatorRanges.length > 0 && (
                                                        <div className="indicator-bar-section indicator-bar-section-inline">
                                                            <div className="legend-bar-container">
                                                                <div className="legend-bar">
                                                                    {Array.from({ length: 20 }, (_, idx) => {
                                                                        const factor = idx / 19; // 0 to 1
                                                                        const segmentColor = ColorUtils.interpolateColor(minColor, maxColor, factor);
                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                className="legend-bar-segment"
                                                                                style={{ backgroundColor: segmentColor, flex: 1 }}
                                                                            ></div>
                                                                        );
                                                                    })}
                                                                    <div className="legend-bar-labels">
                                                                        <div className="legend-bar-label legend-bar-label-left">
                                                                            <span>{indicatorRanges[0].min.toLocaleString()}</span>
                                                                        </div>
                                                                        <div className="legend-bar-label legend-bar-label-right">
                                                                            <span>{indicatorRanges[indicatorRanges.length - 1].max.toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Show Movilidad section if active */}
                        {activeSections.movilidad && (
                            <div className="indicator-section-container">
                                <div className="indicator-list-section-header">
                                    <h4 className="indicator-list-section-title">Movilidad</h4>
                                    <a 
                                        className="close-section-link" 
                                        onClick={() => onSectionClose('movilidad')}
                                        title="Cerrar sección"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Cerrar
                                    </a>
                                </div>
                                {movilidadIndicators.map((indicator) => {
                                    let indicatorValue = 0;
                                    if (hoveredFeature && hoveredFeature.properties) {
                                        const v = hoveredFeature.properties[indicator.property];
                                        indicatorValue = typeof v === 'number' ? v : 0;
                                    } else if (intersectingFeatures && intersectingFeatures.length > 0) {
                                        indicatorValue = intersectingFeatures.reduce((sum, f) => {
                                            const v = f.properties[indicator.property];
                                            return sum + (typeof v === 'number' ? v : 0);
                                        }, 0);
                                    } else if (indicatorsData && indicatorsData.features && indicatorsData.features.length > 0) {
                                        // Fallback: show total from all available data when no specific features are selected
                                        indicatorValue = indicatorsData.features.reduce((sum, f) => {
                                            const v = f.properties[indicator.property];
                                            return sum + (typeof v === 'number' ? v : 0);
                                        }, 0);
                                    }
                                    const indicatorRanges = ColorUtils.getManualRanges(indicator.property);
                                    
                                    // Get the color brackets for gradient calculation
                                    const colorRange = ColorUtils.getColorRange(indicator.property);
                                    const minColor = colorRange.minColor;
                                    const maxColor = colorRange.maxColor;
                                    
                                    return (
                                        <div
                                            key={indicator.id}
                                            className={`indicator-list-item${selectedIndicator === indicator.property ? ' selected' : ''}`}
                                            onClick={() => handleIndicatorSelect(indicator)}
                                        >
                                            <div className="indicator-list-content">
                                                <span className="indicator-list-label">{indicator.name}</span>
                                                <span className="indicator-list-value">
                                                    {indicatorValue.toLocaleString()}
                                                </span>
                                            </div>
                                            {selectedIndicator === indicator.property && indicatorRanges.length > 0 && (
                                                <div className="indicator-bar-section indicator-bar-section-inline">
                                                    <div className="legend-bar-container">
                                                        <div className="legend-bar">
                                                            {Array.from({ length: 20 }, (_, idx) => {
                                                                const factor = idx / 19; // 0 to 1
                                                                const segmentColor = ColorUtils.interpolateColor(minColor, maxColor, factor);
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="legend-bar-segment"
                                                                        style={{ backgroundColor: segmentColor, flex: 1 }}
                                                                    ></div>
                                                                );
                                                            })}
                                                            <div className="legend-bar-labels">
                                                                <div className="legend-bar-label legend-bar-label-left">
                                                                    <span>{indicatorRanges[0].min.toLocaleString()}</span>
                                                                </div>
                                                                <div className="legend-bar-label legend-bar-label-right">
                                                                    <span>{indicatorRanges[indicatorRanges.length - 1].max.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// Make the component available globally
window.IndicatorsPanel = IndicatorsPanel;

// Make the helper function available globally
window.getIndicatorDisplayName = getIndicatorDisplayName; 