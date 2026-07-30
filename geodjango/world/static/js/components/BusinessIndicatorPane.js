// BusinessIndicatorPane component - Displays additional business indicators in a collapsible panel
function BusinessIndicatorPane({ isVisible, onClose, coordinates, radius, onLoadingComplete, onLoadingStart }) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [activeSection, setActiveSection] = React.useState('poblacion');
    const [indicatorsData, setIndicatorsData] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [hasDrawnGeozones, setHasDrawnGeozones] = React.useState(false);
    const [activeMarkers, setActiveMarkers] = React.useState(null);
    const [showCatchLeadPanel, setShowCatchLeadPanel] = React.useState(false);

    // Fetch indicators data when component becomes visible and has coordinates
    React.useEffect(() => {
        if (isVisible && coordinates && radius && !indicatorsData && !isLoading) {
            fetchIndicatorsData();
        }
    }, [isVisible, coordinates, radius]);

    // Cleanup map layers when component unmounts or becomes invisible
    React.useEffect(() => {
        return () => {
            cleanupGeozoneLayers();
            cleanupMarkerLayers();
        };
    }, []);

    // Cleanup when component becomes invisible
    React.useEffect(() => {
        if (!isVisible) {
            cleanupGeozoneLayers();
            cleanupMarkerLayers();
            setHasDrawnGeozones(false);
            setActiveMarkers(null);
        }
    }, [isVisible]);

    const cleanupGeozoneLayers = () => {
        if (!window.map) return;

        try {
            // Remove geozone layers if they exist
            if (window.map.getLayer('geozone-polygons-layer')) {
                window.map.removeLayer('geozone-polygons-layer');
            }
            if (window.map.getSource('geozone-polygons-source')) {
                window.map.removeSource('geozone-polygons-source');
            }
            
        } catch (error) {
            console.warn('⚠️ BusinessIndicatorPane: Error cleaning up geozone layers:', error);
        }
    };

    const cleanupMarkerLayers = () => {
        if (!window.map) return;

        try {
            // Remove marker layers if they exist
            if (window.map.getLayer('indicator-markers-layer')) {
                window.map.removeLayer('indicator-markers-layer');
            }
            if (window.map.getSource('indicator-markers-source')) {
                window.map.removeSource('indicator-markers-source');
            }
            
        } catch (error) {
            console.warn('⚠️ BusinessIndicatorPane: Error cleaning up marker layers:', error);
        }
    };

    const drawGeozonesOnMap = (geozones) => {
        if (!window.map || !geozones || geozones.length === 0) {
            return;
        }

        try {
            // Clean up existing layers first
            cleanupGeozoneLayers();
            
            // Create GeoJSON features for geozone polygons
            const features = geozones.map((zone, index) => ({
                type: 'Feature',
                geometry: zone.geometry,
                properties: {
                    id: zone.id || index,
                    population: zone.population || 0,
                    housing: zone.housing || 0,
                    education: zone.education || 0,
                    health: zone.health || 0,
                    leisure: zone.leisure || 0,
                    companies: zone.companies || 0,
                    jobs: zone.jobs || 0,
                    thefts_2024: zone.thefts_2024 || 0,
                    sexual_assault_2024: zone.sexual_assault_2024 || 0,
                    house_thefts_2024: zone.house_thefts_2024 || 0,
                    business_thefts_2024: zone.business_thefts_2024 || 0
                }
            }));

            const geojson = {
                type: 'FeatureCollection',
                features: features
            };

            // Add geozone polygons source
            window.map.addSource('geozone-polygons-source', {
                type: 'geojson',
                data: geojson
            });

            // Add geozone polygons layer
            window.map.addLayer({
                id: 'geozone-polygons-layer',
                type: 'fill',
                source: 'geozone-polygons-source',
                paint: {
                    'fill-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'population'],
                        0, 'rgba(59, 130, 246, 0.1)',
                        1000, 'rgba(59, 130, 246, 0.2)',
                        5000, 'rgba(59, 130, 246, 0.3)',
                        10000, 'rgba(59, 130, 246, 0.4)',
                        20000, 'rgba(59, 130, 246, 0.5)'
                    ],
                    'fill-opacity': 0.6,
                    'fill-outline-color': 'rgba(59, 130, 246, 0.8)'
                }
            });

            // Add hover effect
            window.map.on('mouseenter', 'geozone-polygons-layer', () => {
                window.map.getCanvas().style.cursor = 'pointer';
            });

            window.map.on('mouseleave', 'geozone-polygons-layer', () => {
                window.map.getCanvas().style.cursor = '';
            });

            // Click event removed - no popup will be shown

            console.log('🗺️ BusinessIndicatorPane: Drew', features.length, 'geozone polygons on map');
            setHasDrawnGeozones(true);
            
        } catch (error) {
            console.error('❌ BusinessIndicatorPane: Error drawing geozones on map:', error);
        }
    };

    const drawMarkersOnMap = (coordinates, collectionType) => {
        if (!window.map || !coordinates || coordinates.length === 0) {
            return;
        }

        try {
            // Clean up existing marker layers first
            cleanupMarkerLayers();
            
            // Create GeoJSON features for markers
            const features = coordinates.map((coord, index) => {
                // Parse coordinate string (format: "longitude, latitude" or "longitude, latitude, additional_data")
                const parts = coord.split(', ');
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                
                if (isNaN(lng) || isNaN(lat)) {
                    console.warn('Invalid coordinates:', coord);
                    return null;
                }
                
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    properties: {
                        id: index,
                        collectionType: collectionType,
                        // Include additional data if available (for jobs)
                        additionalData: parts.length > 2 ? parts[2] : null
                    }
                };
            }).filter(feature => feature !== null);

            const geojson = {
                type: 'FeatureCollection',
                features: features
            };

            // Add markers source
            window.map.addSource('indicator-markers-source', {
                type: 'geojson',
                data: geojson
            });

            // Add markers layer with circular styling
            window.map.addLayer({
                id: 'indicator-markers-layer',
                type: 'circle',
                source: 'indicator-markers-source',
                paint: {
                    'circle-color': '#000000',
                    'circle-radius': 3,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff'
                }
            });

            // Add hover effect
            window.map.on('mouseenter', 'indicator-markers-layer', () => {
                window.map.getCanvas().style.cursor = 'pointer';
            });

            window.map.on('mouseleave', 'indicator-markers-layer', () => {
                window.map.getCanvas().style.cursor = '';
            });

            console.log('🗺️ BusinessIndicatorPane: Drew', features.length, 'markers on map for', collectionType);
            setActiveMarkers(collectionType);
            
        } catch (error) {
            console.error('❌ BusinessIndicatorPane: Error drawing markers on map:', error);
        }
    };

    const handleIndicatorClick = (indicator) => {
        if (!indicator.collection || !indicatorsData) {
            return;
        }

        // If clicking the same indicator, toggle it off
        if (activeMarkers === indicator.collection) {
            cleanupMarkerLayers();
            setActiveMarkers(null);
            return;
        }

        // Collect all coordinates from all geozones for this collection
        const allCoordinates = [];
        
        // Get the raw geozones data from the API response
        // We need to access the original geozones data that was fetched
        if (window.lastGeozonesData) {
            console.log('🔍 BusinessIndicatorPane: Found geozones data:', window.lastGeozonesData.length, 'zones');
            window.lastGeozonesData.forEach((zone, zoneIndex) => {
                const collectionData = zone[indicator.collection];
                console.log(`🔍 BusinessIndicatorPane: Zone ${zoneIndex}, collection ${indicator.collection}:`, collectionData);
                if (collectionData && Array.isArray(collectionData)) {
                    allCoordinates.push(...collectionData);
                }
            });
        }
        
        if (allCoordinates.length > 0) {
            drawMarkersOnMap(allCoordinates, indicator.collection);
        } else {
            alert(`No hay ${indicator.description} en esta área`);
        }
    };

    const fetchIndicatorsData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Notify parent component that loading has started
            if (onLoadingStart) {
                onLoadingStart();
            }
            
            const response = await fetch('/api/business/indicators', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coordinates: coordinates,
                    radius: radius
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                
                // Store the raw geozones data globally for marker functionality
                window.lastGeozonesData = result.data.geozones;
                
                // Process the geozones data to create indicators
                const processedData = processGeozonesData(result.data.geozones);
                setIndicatorsData(processedData);
                
                // Draw geozones on map
                if (!hasDrawnGeozones) {
                    drawGeozonesOnMap(result.data.geozones);
                }
                
                // Notify parent component that loading has completed
                if (onLoadingComplete) {
                    onLoadingComplete();
                }
            } else {
                throw new Error(result.message || 'Failed to fetch indicators data');
            }
            
        } catch (error) {
            setError(error.message);
            
            // Notify parent component that loading has completed (even on error)
            if (onLoadingComplete) {
                onLoadingComplete();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const processGeozonesData = (geozones) => {
        if (!geozones || geozones.length === 0) {
            return {
                poblacion: {
                    title: "Población",
                    indicators: [
                        { label: "Total", value: "0", description: "Habitantes totales" },
                        { label: "Mujeres", value: "0", description: "Población femenina" },
                        { label: "Hombres", value: "0", description: "Población masculina" },
                        { label: "Edad Prom.", value: "0", description: "Edad promedio" }
                    ]
                },
                seguridad: {
                    title: "Seguridad",
                    indicators: [
                        { label: "Índice", value: "0", description: "Índice de seguridad" },
                        { label: "Incidentes", value: "0", description: "Últimos 30 días" },
                        { label: "Policías", value: "0", description: "Agentes activos" },
                        { label: "Cámaras", value: "0", description: "Cámaras de vigilancia" }
                    ]
                },
                vivienda: {
                    title: "Vivienda",
                    indicators: [
                        { label: "Total", value: "0", description: "Viviendas totales" },
                        { label: "Ocupadas", value: "0", description: "Viviendas ocupadas" },
                        { label: "Vacías", value: "0", description: "Viviendas vacías" },
                        { label: "Promedio", value: "0", description: "Habitantes por vivienda" }
                    ]
                }
            };
        }

        // Aggregate data from all geozones
        let totalPopulation = 0;
        let totalPopulationMen = 0;
        let totalPopulationWomen = 0;
        let totalHousing = 0;
        let totalHousingWithAutomotor = 0;
        let totalHousingWithNoAutomotor = 0;
        let totalHousingWithBicycle = 0;
        let totalThefts = 0;
        let totalShopThefts = 0;
        let totalPopulationDisability = 0;
        let totalSexualAssault = 0;
        let totalHousingWithInternet = 0;
        let totalHousingWithoutInternet = 0;

        let totalMetroStations = 0;
        let totalMetrobusStations = 0;
        let totalRtpStations = 0;
        let totalCablebusStations = 0;

        geozones.forEach(zone => {
            totalPopulation += zone.population || 0;
            totalPopulationMen += zone.population_men || 0;
            totalPopulationWomen += zone.population_women || 0;
            totalPopulationDisability += zone.population_with_disability || 0;
            totalHousing += zone.housing_with_pay_tv || 0;
            totalHousingWithAutomotor += zone.housing_with_automotor || 0; // Using as empty housing proxy
            totalHousingWithNoAutomotor += zone.housing_no_automotor || 0;
            totalHousingWithBicycle += zone.housing_with_bicycle || 0;
            totalShopThefts += zone.business_thefts_2022 || 0;
            totalSexualAssault += zone.sexual_assault_2022 || 0;
            totalThefts += zone.thefts_2022 || 0;
            totalHousingWithInternet += zone.housing_with_internet || 0;
            totalHousingWithoutInternet += zone.housing_without_internet || 0;
            totalMetroStations += zone.metro_stations || 0;
            totalMetrobusStations += zone.metrobus_stations || 0;
            totalRtpStations += zone.rtp_stations || 0;
            totalCablebusStations += zone.cablebus_stations || 0;
        });

        // Calculate averages and derived metrics
        const totalIncidents = totalThefts + totalSexualAssault + totalShopThefts;

        return {
            poblacion: {
                title: "Población",
                indicators: [
                    { label: "➕", value: totalPopulation.toLocaleString(), description: "Habitantes totales" },
                    { label: "🙋🏽‍♀️", value: totalPopulationWomen.toLocaleString(), description: "Población femenina" },
                    { label: "👨🏻", value: totalPopulationMen.toLocaleString(), description: "Población masculina" },
                    { label: "🩼", value: totalPopulationDisability.toLocaleString(), description: "Discapacitados" }
                ]
            },
            seguridad: {
                title: "Seguridad (2022)",
                indicators: [
                    { label: "➕", value: totalIncidents.toString(), description: "Incidentes totales" },
                    { label: "🔫", value: totalThefts.toString(), description: "Robos", collection: "thefts_2022_list" },
                    { label: "🔪", value: totalSexualAssault.toString(), description: "Violencia Sexual", collection: "sexual_assault_2022_list" },
                    { label: "💰", value: totalShopThefts.toString(), description: "Robos a negocios", collection: "business_thefts_2022_list" }
                ]
            },
            vivienda: {
                title: "Vivienda",
                indicators: [
                    { label: "📺", value: totalHousing.toLocaleString(), description: "Viviendas con TV por cable" },
                    { label: "🛜", value: totalHousingWithInternet.toLocaleString() + " / " + totalHousingWithoutInternet.toLocaleString(), description: "Viviendas con / sin internet" },
                    { label: "🚗", value: "" + totalHousingWithAutomotor.toLocaleString() + " / " + totalHousingWithNoAutomotor.toLocaleString(), description: "Viviendas con / sin auto" },
                    { label: "🚲", value: totalHousingWithBicycle.toLocaleString(), description: "Viviendas con bicicleta" },
                ]
            },
            mobility: {
                title: "Movilidad",
                indicators: [
                    { label: "🚇", value: totalMetroStations.toLocaleString(), description: "Estaciones de Metro", collection: "metro_stations_list" },
                    { label: "🚌", value: totalMetrobusStations.toLocaleString(), description: "Estaciones de Metrobús", collection: "metrobus_stations_list" },
                    { label: "🚕", value: totalRtpStations.toLocaleString(), description: "Estaciones de RTP", collection: "rtp_stations_list" },
                    { label: "🚗", value: totalCablebusStations.toLocaleString(), description: "Estaciones de Cablebús", collection: "cablebus_stations_list" }
                ]
            }
        };
    };

    const handleToggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const handleSectionChange = (sectionKey) => {
        setActiveSection(sectionKey);
    };

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    const handleGeneratePDFReport = () => {
        // Track PDF generation click event
        if (window.analyticsService) {
            window.analyticsService.track('USER_CLICK_PDF_GENERATION', {
                coordinates: coordinates,
                radius: radius,
                action: 'open_catch_lead_panel',
                component: 'business_indicator_pane'
            });
        }
        
        setShowCatchLeadPanel(true);
    };

    const handleCloseCatchLeadPanel = () => {
        setShowCatchLeadPanel(false);
    };

    // CatchLeadPanel Component - now imported from separate file

    if (!isVisible) {
        return null;
    }

    // Show loading state
    if (isLoading) {
        return (
            <div className="business-indicator-pane">
                <div className="indicator-header">
                    <h3 className="indicator-title">Otros indicadores</h3>
                    <div className="indicator-controls">
                        <button 
                            className="indicator-close-btn"
                            onClick={handleClose}
                            type="button"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6 6 18"/>
                                <path d="m6 6 12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="indicator-content">
                    <div className="indicator-loading">
                        <svg className="address-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" opacity="0.3"/>
                            <path d="M12 2a10 10 0 0 1 10 10" opacity="1"/>
                        </svg>
                        <span>Cargando indicadores...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="business-indicator-pane">
                <div className="indicator-header">
                    <h3 className="indicator-title">Otros indicadores</h3>
                    <div className="indicator-controls">
                        <button 
                            className="indicator-close-btn"
                            onClick={handleClose}
                            type="button"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6 6 18"/>
                                <path d="m6 6 12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="indicator-content">
                    <div className="indicator-error">
                        <span>Error al cargar indicadores: {error}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Show data when available
    if (!indicatorsData) {
        return null;
    }

    const activeSectionData = indicatorsData[activeSection];

    return (
        <React.Fragment>
            <div className="business-indicator-pane">
                <div className="indicator-header">
                    <h3 className="indicator-title">Otros indicadores</h3>
                    <div className="indicator-controls">
                        <button 
                            className="indicator-toggle-btn"
                            onClick={handleToggleCollapse}
                            type="button"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {isCollapsed ? (
                                    <path d="m18 15-6-6-6 6"/>
                                ) : (
                                    <path d="m6 9 6 6 6-6"/>
                                )}
                            </svg>
                        </button>
                        <button 
                            className="indicator-close-btn"
                            onClick={handleClose}
                            type="button"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6 6 18"/>
                                <path d="m6 6 12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="indicator-content">
                        {/* Section Selector/Tabs */}
                        <div className="indicator-section-selector">
                            {Object.entries(indicatorsData).map(([sectionKey, sectionData]) => (
                                <button
                                    key={sectionKey}
                                    className={`section-tab ${activeSection === sectionKey ? 'section-tab-active' : ''}`}
                                    onClick={() => handleSectionChange(sectionKey)}
                                    type="button"
                                >
                                    {sectionData.title}
                                </button>
                            ))}
                        </div>
                        
                        {/* Active Section Content */}
                        <div className="indicator-section-content">
                            <div className="indicator-grid">
                                {activeSectionData.indicators.map((indicator, index) => (
                                    <div 
                                        key={index} 
                                        className={`indicator-card ${indicator.collection ? 'indicator-card-clickable' : ''} ${activeMarkers === indicator.collection ? 'indicator-card-active' : ''}`}
                                        onClick={() => handleIndicatorClick(indicator)}
                                    >
                                        <div className="indicator-label">{indicator.label}</div>
                                        <div className="indicator-number">{indicator.value}</div>
                                        <div className="indicator-description">{indicator.description}</div>
                                        {indicator.collection && (
                                            <div className="indicator-hint">
                                                {activeMarkers === indicator.collection ? 'Click para ocultar' : '📍 Click para mostrar'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Generate PDF Report Button */}
                        <div className="indicator-pdf-section">
                            <button 
                                className="indicator-pdf-btn"
                                onClick={handleGeneratePDFReport}
                                type="button"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10,9 9,9 8,9"/>
                                </svg>
                                Generar reporte
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* CatchLeadPanel */}
            {showCatchLeadPanel && (
                <CatchLeadPanel onClose={handleCloseCatchLeadPanel} />
            )}
        </React.Fragment>
    );
}

// Make the component available globally
window.BusinessIndicatorPane = BusinessIndicatorPane;
