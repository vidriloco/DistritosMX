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

// Hover tooltip helpers. Lines served come as "[1]", "['1', 'A']" or empty, depending on the system's data.
function txLinesOf(p) {
    const lines = String(p.lines_serving || '').replace(/[\[\]'"\s]/g, '').split(',').filter(Boolean);
    return lines.length ? lines : [String(p.line_number)];
}
function txEsc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
// Dark text on light line colours (yellow, light green), white on the rest
function txInkOn(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return '#fff';
    const n = parseInt(m[1], 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.6 ? '#111' : '#fff';
}

function TransportSystemsPanel({ 
    onClose,
    map,
    onLineSelect,
    onStationSelect,
    onShowFloatingActions,
    onLayerPanelCollapse,
    lineDetailsPanelRef,
    onTransportDataChange,
    variant = 'panel'
}) {
    // State for visible systems
    const [visibleSystems, setVisibleSystems] = React.useState({});
    const [transportData, setTransportData] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(false);

    // Report the loaded lines upward as {system: [line]} so the search
    // dialog (LinesNavigator) can list and fit them.
    React.useEffect(() => {
        if (!onTransportDataChange) return;
        const lines = {};
        Object.entries(transportData).forEach(([system, geojson]) => {
            if (!geojson || !geojson.features) return;
            const stations = geojson.features.filter(f => f.properties && f.properties.type === 'station');
            lines[system] = geojson.features
                .filter(f => f.properties && f.properties.type === 'line' && f.geometry)
                .map(f => {
                    const g = f.geometry;
                    const paths = g.type === 'MultiLineString'
                        ? g.coordinates.map(c => ({ coordinates: c }))
                        : [{ coordinates: g.coordinates || [] }];
                    return {
                        id: f.properties.id,
                        line_number: f.properties.line_number,
                        route: f.properties.route,
                        name: f.properties.name,
                        color: f.properties.color,
                        paths,
                        stations: stations
                            .filter(s => (s.properties.lines_serving && s.properties.lines_serving.includes(f.properties.line_number))
                                || s.properties.line_number === f.properties.line_number)
                            .map(s => ({
                                id: s.properties.id,
                                name: s.properties.name,
                                identifier: s.properties.identifier,
                                latitude: s.geometry.coordinates[1],
                                longitude: s.geometry.coordinates[0]
                            }))
                    };
                });
        });
        onTransportDataChange(lines);
    }, [transportData]);
        
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

        // Hover tooltips: which line or station this is, with the station's icon and the system's logo
        const sys = transportSystems[system] || {};
        const lineColor = {};
        const stationCount = {};
        data.features.forEach((f) => {
            const p = f.properties;
            if (p.type === 'line') lineColor[String(p.line_number)] = p.color;
            if (p.type === 'station') txLinesOf(p).forEach((n) => { stationCount[n] = (stationCount[n] || 0) + 1; });
        });
        const logo = (cls) => sys.icon ? `<img class="${cls}" src="${txEsc(sys.icon)}" alt="" onerror="this.remove()">` : '';
        const badge = (n, fallback) => {
            const bg = lineColor[n] || fallback || '#555';
            return `<span class="tx-badge" style="background:${txEsc(bg)};color:${txInkOn(bg)}">${txEsc(n)}</span>`;
        };
        const systemName = (p) => txEsc(sys.name || p.humanized_system || system);

        const lineHtml = (p) => {
            const n = String(p.line_number);
            const count = stationCount[n];
            return `<div class="tx-tip">
                <div class="tx-sys">${logo('tx-logo')}<span>${systemName(p)}</span></div>
                <div class="tx-title">${badge(n, p.color)}<strong>Línea ${txEsc(n)}</strong></div>
                ${p.route ? `<div class="tx-route">${txEsc(p.route)}</div>` : ''}
                <div class="tx-meta">${count ? `${count} ${count === 1 ? 'estación' : 'estaciones'} · ` : ''}Clic para ver la línea</div>
            </div>`;
        };
        const stationHtml = (p) => {
            const lines = txLinesOf(p);
            const hasImage = p.image && p.image !== 'None';
            // A station without its own icon (or whose icon fails to load) shows the system's logo
            const icon = hasImage
                ? `<img class="tx-icon" src="${txEsc(p.image)}" alt="" onerror="this.onerror=null;${sys.icon ? `this.src='${txEsc(sys.icon)}'` : 'this.remove()'}">`
                : logo('tx-icon');
            return `<div class="tx-tip tx-station">
                ${icon}
                <div class="tx-body">
                    <strong class="tx-name">${txEsc(p.name)}</strong>
                    <div class="tx-sys">${logo('tx-logo')}<span>${systemName(p)}</span></div>
                    <div class="tx-lines">${lines.map((n) => badge(n, p.color)).join('')}</div>
                    ${lines.length === 1 && p.route ? `<div class="tx-route">${txEsc(p.route)}</div>` : ''}
                    <div class="tx-meta">Clic para ver detalles</div>
                </div>
            </div>`;
        };

        // One tooltip for the whole map, shared by every system; a station wins over the line under it
        if (!mapInstance.__txHover) {
            mapInstance.__txHover = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: '300px', className: 'tx-hover' });
        }
        const popup = mapInstance.__txHover;
        const canvas = mapInstance.getCanvas();
        const onLineMove = (e) => {
            if (mapInstance.__txOverStation || !e.features.length) return;
            canvas.style.cursor = 'pointer';
            popup.setLngLat(e.lngLat).setHTML(lineHtml(e.features[0].properties)).addTo(mapInstance);
        };
        const onLineLeave = () => {
            if (mapInstance.__txOverStation) return;
            canvas.style.cursor = '';
            popup.remove();
        };
        const onStationMove = (e) => {
            if (!e.features.length) return;
            const f = e.features[0];
            mapInstance.__txOverStation = true;
            canvas.style.cursor = 'pointer';
            popup.setLngLat(f.geometry.coordinates).setHTML(stationHtml(f.properties)).addTo(mapInstance);
        };
        const onStationLeave = () => {
            mapInstance.__txOverStation = false;
            canvas.style.cursor = '';
            popup.remove();
        };

        // Re-adding a system replaces its handlers instead of stacking a second set
        const handlers = mapInstance.__txHandlers || (mapInstance.__txHandlers = {});
        (handlers[system] || []).forEach((h) => mapInstance.off(h[0], h[1], h[2]));
        handlers[system] = [
            ['mousemove', layerName, onLineMove],
            ['mouseleave', layerName, onLineLeave],
            ['mousemove', stationsLayerName, onStationMove],
            ['mouseleave', stationsLayerName, onStationLeave]
        ];
        handlers[system].forEach((h) => mapInstance.on(h[0], h[1], h[2]));

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
        if (mapInstance.__txHover) {
            mapInstance.__txHover.remove();
            mapInstance.__txOverStation = false;
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

    if (variant === 'chips') {
        const shortNames = {
            'metro': 'Metro',
            'rtp': 'RTP',
            'concesionados': 'Concesionados',
            'tren-interurbano': 'Interurbano',
            'tren-suburbano': 'Suburbano'
        };
        return (
            <div className="xb-transport" role="group" aria-label="Sistemas de transporte">
                {Object.keys(transportSystems).map(system => (
                    <button
                        key={system}
                        type="button"
                        className={`xb-chip xb-chip-transport${visibleSystems[system] ? ' is-active' : ''}`}
                        onClick={() => toggleSystem(system)}
                        disabled={isLoading}
                        aria-pressed={!!visibleSystems[system]}
                        title={getSystemDisplayName(system)}
                    >
                        <img src={transportSystems[system].icon} alt="" aria-hidden="true" />
                        <span>{shortNames[system] || getSystemDisplayName(system)}</span>
                    </button>
                ))}
            </div>
        );
    }

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