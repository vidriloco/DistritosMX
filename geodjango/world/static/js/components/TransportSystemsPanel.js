// Transport systems configuration
const transportSystems = {
    'metro': { 
        name: 'STC Metro', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('stc-metro') : '/static/images/transports/stc-metro-logo.png'
    },
    'metrobus': { 
        name: 'Metrobús', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('metrobus') : '/static/images/transports/metrobus-logo.png'
    },
    'trolebus': { 
        name: 'Trolebús', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('trolebus') : '/static/images/transports/trolebus-logo.png'
    },
    'cablebus': { 
        name: 'Cablebús', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('cablebus') : '/static/images/transports/cablebus-logo.png'
    },
    'ecobici': { 
        name: 'Ecobici', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('ecobici') : '/static/images/transports/ecobici-logo.png'
    },
    'rtp': { 
        name: 'Red de Transporte de Pasajeros', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('rtp') : '/static/images/transports/rtp-logo.png'
    },
    'concesionados': { 
        name: 'Transporte Concesionado', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('concesionados') : '/static/images/transports/concesionados-logo.png'
    },
    'tren-interurbano': { 
        name: 'Tren Interurbano', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('interurbano') : '/static/images/transports/interurbano-logo.png'
    },
    'tren-suburbano': { 
        name: 'Tren Suburbano', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('suburbano') : '/static/images/transports/suburbano-logo.png'
    },
    'mexibus': { 
        name: 'Mexibús', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('mexibus') : '/static/images/transports/mexibus-logo.png'
    },
    'mexicable': { 
        name: 'Mexicable', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('mexicable') : '/static/images/transports/mexicable-logo.png'
    },
    'tren-ligero': { 
        name: 'Tren Ligero', 
        selected: false,
        icon: window.UrlUtils ? window.UrlUtils.getTransportSystemLogoUrl('tren-ligero') : '/static/images/transports/tren-ligero-logo.png'
    }
};

function TransportSystemsPanel({ 
    onClose,
    map,
    onLineSelect,
    onStationSelect,
    onShowFloatingActions,
    onLayerPanelCollapse,
    lineDetailsPanelRef
}) {
    // State for visible systems
    const [visibleSystems, setVisibleSystems] = React.useState({});
    const [transportData, setTransportData] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(false);
        
    // Initialize visible systems based on transportSystems selected values
    React.useEffect(() => {
        const initialVisibleSystems = {};
        Object.entries(transportSystems).forEach(([system, info]) => {
            initialVisibleSystems[system] = info.selected;
        });
        setVisibleSystems(initialVisibleSystems);
    }, []);

    // Sync with map layers when component mounts
    React.useEffect(() => {
        // Small delay to ensure map is ready
        const timer = setTimeout(() => {
            syncWithMapLayers();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [syncWithMapLayers]);

    // Check for existing layers on map when component mounts or map changes
    React.useEffect(() => {
        if (!map || !map.current) return;

        const mapInstance = map.current;
        const currentVisibleSystems = { ...visibleSystems };

        // Check which systems have layers on the map
        Object.keys(transportSystems).forEach(system => {
            const layerName = `${system}-layer`;
            const sourceName = `${system}-source`;
            
            // Check if both layer and source exist
            const hasLayer = mapInstance.getLayer(layerName);
            const hasSource = mapInstance.getSource(sourceName);
            
            if (hasLayer && hasSource) {
                currentVisibleSystems[system] = true;
            } else {
                currentVisibleSystems[system] = false;
            }
        });

        // Only update if there are differences
        const hasChanges = Object.keys(currentVisibleSystems).some(
            system => currentVisibleSystems[system] !== visibleSystems[system]
        );

        if (hasChanges) {
            setVisibleSystems(currentVisibleSystems);
        }
    }, [map]);

    // Function to sync state with map layers
    const syncWithMapLayers = React.useCallback(() => {
        if (!map || !map.current) return;

        const mapInstance = map.current;
        const currentVisibleSystems = {};

        // Check which systems have layers on the map
        Object.keys(transportSystems).forEach(system => {
            const layerName = `${system}-layer`;
            const sourceName = `${system}-source`;
            
            // Check if both layer and source exist
            const hasLayer = mapInstance.getLayer(layerName);
            const hasSource = mapInstance.getSource(sourceName);
            
            currentVisibleSystems[system] = hasLayer && hasSource;
        });

        setVisibleSystems(currentVisibleSystems);
    }, [map]);

    // Simple function to fetch transport data for a system
    const fetchTransportData = async (system) => {
        if (!window.UrlUtils) {
            console.warn('UrlUtils not available');
            return null;
        }

        try {
            const url = window.UrlUtils.getTransportUrl(system);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching transport data for ${system}:`, error);
            return null;
        }
    };

        // Function to add transport layers to map
    const addTransportLayers = (system, data) => {
        if (!map || !map.current || !data || !data.features) return;

        const mapInstance = map.current;
        
        // Create source name for this system
        const sourceName = `${system}-source`;
        const layerName = `${system}-layer`;
        const stationsLayerName = `${system}-stations-layer`;

        // Remove existing layers and sources if they exist
        if (mapInstance.getLayer(layerName)) {
            mapInstance.removeLayer(layerName);
        }
        if (mapInstance.getLayer(stationsLayerName)) {
            mapInstance.removeLayer(stationsLayerName);
        }
        if (mapInstance.getSource(sourceName)) {
            mapInstance.removeSource(sourceName);
        }

        // Add source
        mapInstance.addSource(sourceName, {
            type: 'geojson',
            data: data
        });

        // Add lines layer
        mapInstance.addLayer({
            id: layerName,
            type: 'line',
            source: sourceName,
            filter: ['==', 'type', 'line'],
            paint: {
                'line-color': ['get', 'color'],
                'line-width': ['get', 'stroke']
            }
        });

        // Add stations layer
        mapInstance.addLayer({
            id: stationsLayerName,
            type: 'circle',
            source: sourceName,
            filter: ['==', 'type', 'station'],
            paint: {
                'circle-color': ['get', 'color'],
                'circle-radius': ['interpolate', ['linear'], ['zoom'],
                    10, 2,
                    14, 5,
                    18, 8
                ],
                'circle-stroke-color': 'white',
                'circle-stroke-width': 2
            }
        });

        // Add click handlers for lines
        mapInstance.on('click', layerName, (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                
                // Find all stations for this line
                const lineStations = data.features
                    .filter(f => f.properties.type === 'station')
                    .filter(s => {
                        // Check if station serves this line
                        if (s.properties.lines_serving && s.properties.lines_serving.includes(feature.properties.line_number)) {
                            return true;
                        }
                        // Fallback: check if station has the same line_number
                        if (s.properties.line_number === feature.properties.line_number) {
                            return true;
                        }
                        return false;
                    })
                    .map(station => ({
                        id: station.properties.id,
                        name: station.properties.name,
                        identifier: station.properties.identifier,
                        latitude: station.geometry.coordinates[1],
                        longitude: station.geometry.coordinates[0]
                    }));

                if (onLineSelect) {
                    onLineSelect({
                        system: system,
                        line: {
                            id: feature.properties.id,
                            line_number: feature.properties.line_number,
                            route: feature.properties.route,
                            name: feature.properties.name,
                            stations: lineStations
                        }
                    });
                }
            }
        });

        // Add click handlers for stations
        mapInstance.on('click', stationsLayerName, (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                if (onStationSelect) {
                    onStationSelect({
                        name: feature.properties.name,
                        system: system,
                        icon: transportSystems[system].icon,
                        line_number: feature.properties.line_number,
                        line_name: feature.properties.route
                    });
                }
            }
        });

        // Add hover effects
        mapInstance.on('mouseenter', layerName, () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
        });
        mapInstance.on('mouseleave', layerName, () => {
            mapInstance.getCanvas().style.cursor = '';
        });
        mapInstance.on('mouseenter', stationsLayerName, () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
        });
        mapInstance.on('mouseleave', stationsLayerName, () => {
            mapInstance.getCanvas().style.cursor = '';
        });

        // Update visible systems state to reflect the new layer
        setVisibleSystems(prev => ({
            ...prev,
            [system]: true
        }));
    };

        // Function to remove transport layers from map
    const removeTransportLayers = (system) => {
        if (!map || !map.current) return;

        const mapInstance = map.current;
        const layerName = `${system}-layer`;
        const stationsLayerName = `${system}-stations-layer`;
        const sourceName = `${system}-source`;

        // Remove layers
        if (mapInstance.getLayer(layerName)) {
            mapInstance.removeLayer(layerName);
        }
        if (mapInstance.getLayer(stationsLayerName)) {
            mapInstance.removeLayer(stationsLayerName);
        }
        // Remove source
        if (mapInstance.getSource(sourceName)) {
            mapInstance.removeSource(sourceName);
        }

        // Update visible systems state to reflect the removed layer
        setVisibleSystems(prev => ({
            ...prev,
            [system]: false
        }));
    };

        // Function to toggle system visibility
    const toggleSystem = async (system) => {
        const newVisibleSystems = { ...visibleSystems };
        newVisibleSystems[system] = !newVisibleSystems[system];
        setVisibleSystems(newVisibleSystems);

        if (newVisibleSystems[system]) {
            // Show system
            setIsLoading(true);
            const data = await fetchTransportData(system);
            if (data) {
                setTransportData(prev => ({ ...prev, [system]: data }));
                addTransportLayers(system, data);
            } else {
                // If data fetch failed, revert the state
                setVisibleSystems(prev => ({ ...prev, [system]: false }));
            }
            setIsLoading(false);
        } else {
            // Hide system
            removeTransportLayers(system);
            setTransportData(prev => {
                const newData = { ...prev };
                delete newData[system];
                return newData;
            });
        }
    };

    // Get system display name
    const getSystemDisplayName = (system) => {
        const systemInfo = transportSystems[system];
        return systemInfo ? systemInfo.name : system;
    };

    return (
        <div className="floating-actions-container">
            <div className="floating-actions-header">
                <button className="close-floating-actions-button" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <h3 className="floating-actions-title">Sistemas de Transporte</h3>
            </div>
            <div className="floating-actions-content">
                <div className="floating-actions-section">
                    <div className="floating-actions-buttons">
                        {Object.keys(transportSystems).map(system => (
                            <button 
                                key={system} 
                                className={`floating-action-button ${visibleSystems[system] ? 'active' : ''}`}
                                onClick={() => toggleSystem(system)}
                                disabled={isLoading}
                            >
                                <div className="floating-action-icon">
                                    <img src={transportSystems[system].icon} alt={system} className="system-icon" />
                                </div>
                                <span>{getSystemDisplayName(system)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Make the component available globally
window.TransportSystemsPanel = TransportSystemsPanel;
window.transportSystems = transportSystems; 