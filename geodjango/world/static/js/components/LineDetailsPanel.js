const LineDetailsPanel = React.forwardRef(({ selectedLine, transportSystems, onClose }, ref) => {
    const panelRef = React.useRef(null);
    const [stationIcons, setStationIcons] = React.useState({});
    const [currentStationMarker, setCurrentStationMarker] = React.useState(null);

    // Function to construct station icon URL
    const getStationIconUrl = (system, lineNumber, stationIdentifier) => {
        if (!stationIdentifier) return null;
        
        // Map system names to URL format
        const systemMap = {
            'metro': 'stc-metro',
            'metrobus': 'metrobus',
            'trolebus': 'trolebus',
            'cablebus': 'cablebus',
            'ecobici': 'ecobici',
            'concesionados': 'concesionados',
            'tren-interurbano': 'tren-interurbano',
            'tren-suburbano': 'tren-suburbano',
            'mexibus': 'mexibus',
            'mexicable': 'mexicable',
            'tren-ligero': 'tren-ligero',
            'rtp': 'rtp'
        };
        
        const urlSystem = systemMap[system] || system;
        return UrlUtils.getTransportStationImageUrl(urlSystem, lineNumber, stationIdentifier);
    };

    // Function to load station icon with error handling
    const loadStationIcon = React.useCallback((system, lineNumber, stationIdentifier) => {
        if (!stationIdentifier) return;
        
        const iconUrl = getStationIconUrl(system, lineNumber, stationIdentifier);
        if (!iconUrl) return;
        
        const img = new Image();
        img.onload = () => {
            setStationIcons(prev => ({
                ...prev,
                [stationIdentifier]: iconUrl
            }));
        };
        img.onerror = () => {
            // Keep the placeholder state (no icon loaded)
            setStationIcons(prev => ({
                ...prev,
                [stationIdentifier]: null
            }));
        };
        img.src = iconUrl;
    }, []);

    // Function to remove current station marker
    const removeStationMarker = React.useCallback(() => {
        if (currentStationMarker) {
            currentStationMarker.remove();
            setCurrentStationMarker(null);
        }
    }, [currentStationMarker]);

    // Function to create and add station marker
    const createStationMarker = React.useCallback((station, system, lineNumber) => {
        // Remove existing marker first
        removeStationMarker();

        if (!station.latitude || !station.longitude) {
            console.warn('Station coordinates missing:', station);
            return;
        }

        // Get the map instance
        let mapInstance = null;
        if (window.map && window.map.flyTo) {
            mapInstance = window.map;
        } else if (window.mapboxgl && window.mapboxgl.Map) {
            // Try to find map instance in different ways
            const mapElements = document.querySelectorAll('.mapboxgl-canvas');
            if (mapElements.length > 0) {
                // Look for map instance in global scope or try to get it from the canvas
                for (let key in window) {
                    if (window[key] && typeof window[key].addLayer === 'function') {
                        mapInstance = window[key];
                        break;
                    }
                }
            }
        }

        if (!mapInstance) {
            console.warn('Map instance not found');
            return;
        }

        // Ensure map is loaded before adding marker
        if (!mapInstance.isStyleLoaded()) {
            console.log('Map style not loaded, waiting...');
            mapInstance.once('style.load', () => {
                createStationMarker(station, system, lineNumber);
            });
            return;
        }

        console.log('Creating marker for station:', station.name, 'at coordinates:', station.latitude, station.longitude);

        // Create custom marker element with station icon
        const markerElement = document.createElement('div');
        markerElement.className = 'station-selected-marker';

        // Try to use station icon if available
        if (station.identifier) {
            const iconUrl = getStationIconUrl(system, lineNumber, station.identifier);
            if (iconUrl) {
                markerElement.style.backgroundImage = `url(${iconUrl})`;
                markerElement.style.backgroundSize = 'cover';
                markerElement.style.backgroundPosition = 'center';
            } else {
                // Fallback to colored circle
                markerElement.style.backgroundColor = '#007bff';
                markerElement.style.display = 'flex';
                markerElement.style.alignItems = 'center';
                markerElement.style.justifyContent = 'center';
                markerElement.style.color = 'white';
                markerElement.style.fontWeight = 'bold';
                markerElement.style.fontSize = '14px';
                markerElement.textContent = station.identifier.charAt(0);
            }
        } else {
            // Fallback to colored circle
            markerElement.style.backgroundColor = '#007bff';
            markerElement.style.display = 'flex';
            markerElement.style.alignItems = 'center';
            markerElement.style.justifyContent = 'center';
            markerElement.style.color = 'white';
            markerElement.style.fontWeight = 'bold';
            markerElement.style.fontSize = '14px';
            markerElement.textContent = '•';
        }

        // Create the marker with high z-index to ensure visibility
        const marker = new mapboxgl.Marker({
            element: markerElement
        })
        .setLngLat([parseFloat(station.longitude), parseFloat(station.latitude)])
        .addTo(mapInstance);

        // Force the marker to be visible by setting its z-index
        if (marker.getElement()) {
            marker.getElement().style.zIndex = '1';
            
            // Verify marker is visible
            setTimeout(() => {
                const markerElement = marker.getElement();
                if (markerElement) {
                    console.log('Marker element styles:', {
                        display: markerElement.style.display,
                        visibility: markerElement.style.visibility,
                        opacity: markerElement.style.opacity,
                        zIndex: markerElement.style.zIndex
                    });
                    
                    // Force visibility if needed
                    markerElement.style.display = 'block';
                    markerElement.style.visibility = 'visible';
                    markerElement.style.opacity = '1';
                    markerElement.style.zIndex = '1';
                }
            }, 50);
        }

        console.log('Marker created and added to map');
        setCurrentStationMarker(marker);
    }, [removeStationMarker]);

    // Function to center map on station and add marker
    const centerMapOnStation = React.useCallback((station) => {
        console.log('centerMapOnStation called for:', station);
        
        if (!station.latitude || !station.longitude) {
            console.warn('Station coordinates missing in centerMapOnStation:', station);
            return;
        }

        const { system, line } = selectedLine;
        const lineNumber = parseInt(line.line_number) || line.line_number;

        // Create marker first
        createStationMarker(station, system, lineNumber);

        // Add a small delay to ensure marker is created before flying
        setTimeout(() => {
            // Center map on station
            let mapInstance = null;
            if (window.map && window.map.flyTo) {
                mapInstance = window.map;
            } else if (window.mapboxgl && window.mapboxgl.Map) {
                // Try to find map instance
                for (let key in window) {
                    if (window[key] && typeof window[key].flyTo === 'function') {
                        mapInstance = window[key];
                        break;
                    }
                }
            }

            if (mapInstance) {
                console.log('Flying to station coordinates:', station.longitude, station.latitude);
                mapInstance.flyTo({
                    center: [parseFloat(station.longitude), parseFloat(station.latitude)],
                    zoom: 16,
                    duration: 1000
                });
            } else {
                console.warn('Map instance not found for flying to station');
            }
        }, 100); // Small delay to ensure marker is created
    }, [selectedLine, createStationMarker]);

    // Load station icons when selectedLine changes
    React.useEffect(() => {
        if (selectedLine && selectedLine.line.stations) {
            const { system, line } = selectedLine;
            const lineNumber = parseInt(line.line_number) || line.line_number;
            
            selectedLine.line.stations.forEach(station => {
                if (station.identifier) {
                    loadStationIcon(system, lineNumber, station.identifier);
                }
            });
        }
    }, [selectedLine, loadStationIcon]);

    // Cleanup marker when panel is closed
    React.useEffect(() => {
        return () => {
            removeStationMarker();
        };
    }, [removeStationMarker]);

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
        },
        removeMarker: removeStationMarker
    }));

    // Set global reference to this component's ref
    React.useEffect(() => {
        window.currentStationMarkerRef = ref;
        return () => {
            window.currentStationMarkerRef = null;
        };
    }, [ref]);

    if (!selectedLine) return null;

    const { system, line } = selectedLine;
    const systemInfo = transportSystems[system];
    const systemName = systemInfo ? systemInfo.name : system;
    const systemIcon = systemInfo ? systemInfo.icon : 'no-transports.png';
    const lineNumber = parseInt(line.line_number);
    const displayNumber = lineNumber && lineNumber !== 0 ? lineNumber : line.line_number;

    return (
        <div className="floating-actions-container" ref={panelRef}>
            <div className="floating-actions-header">
                <h3 className="floating-actions-title">Detalles de la Línea</h3>
                <button className="close-floating-actions-button" onClick={() => {
                    removeStationMarker();
                    onClose();
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div className="floating-actions-content">
                <div className="floating-actions-section">
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <img src={systemIcon} alt={system} className="line-system-icon" />
                        <h4 className="line-system-name">{systemName}</h4>
                    </div>
                    <div className="line-info">
                        <div className="line-number">Línea {displayNumber}</div>
                        <div className="line-route">{line.route}</div>
                    </div>
                    {line.stations && line.stations.length > 0 ? (
                        <div className="stations-section">
                            <h5 className="stations-title">Estaciones</h5>
                            <div className="stations-scrollable-list">
                                {line.stations.map((station, index) => {
                                    const hasIcon = station.identifier && stationIcons[station.identifier];
                                    return (
                                        <div key={station.id || index} className="station-item">
                                            {station.identifier ? (
                                                hasIcon ? (
                                                    <img 
                                                        src={stationIcons[station.identifier]} 
                                                        alt={station.name}
                                                        className="station-icon"
                                                        onClick={() => centerMapOnStation(station)}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : (
                                                    <div 
                                                        className="station-icon-placeholder"
                                                        onClick={() => centerMapOnStation(station)}
                                                    >
                                                        {station.identifier.charAt(0)}
                                                    </div>
                                                )
                                            ) : (
                                                <div 
                                                    className="station-icon-placeholder"
                                                    onClick={() => centerMapOnStation(station)}
                                                >
                                                    •
                                                </div>
                                            )}
                                            <span className="station-name">{station.name}</span>
                                            {station.identifier && (
                                                <span className="station-identifier">({station.identifier})</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="no-stations">No hay estaciones disponibles para esta línea</div>
                    )}
                </div>
            </div>
        </div>
    );
});

// Make the component available globally
window.LineDetailsPanel = LineDetailsPanel;

// Global function to remove station marker (can be called from anywhere)
window.removeStationMarker = () => {
    // This will be set by the LineDetailsPanel component
    if (window.currentStationMarkerRef && window.currentStationMarkerRef.current) {
        window.currentStationMarkerRef.current.removeMarker();
    }
};

// Add CSS styles for the station marker
const style = document.createElement('style');
style.textContent = `
    .station-selected-marker {
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        border: 3px solid #fff !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        cursor: pointer !important;
        z-index: 1 !important;
        position: relative !important;
        transition: all 0.3s ease !important;
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        pointer-events: auto !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
    }
    
    .station-selected-marker:hover {
        transform: scale(1.1) !important;
        box-shadow: 0 6px 16px rgba(0,0,0,0.5) !important;
    }
    

    
    /* Ensure marker container is visible but below UI */
    .mapboxgl-marker {
        z-index: 1 !important;
        pointer-events: auto !important;
    }
    
    .mapboxgl-marker .station-selected-marker {
        z-index: 1 !important;
    }
`;
document.head.appendChild(style);
