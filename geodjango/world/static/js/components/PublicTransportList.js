// PublicTransportList component - Generic transport system list with collapsible functionality
function PublicTransportList({ system, title }) {
    const [transportLayers, setTransportLayers] = React.useState([]);
    const [loadingTransport, setLoadingTransport] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(true);

    // Load transport data on component mount
    React.useEffect(() => {
        loadTransportData();
    }, [system]);

    // Load transport data from GeoJSON based on system
    const loadTransportData = async () => {
        setLoadingTransport(true);
        try {
            const systemUrls = {
                'metro': 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons/metro.geojson',
                'metrobus': 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons/metrobus.geojson',
                'tren-ligero': 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons/tren-ligero.geojson',
                'trolebus': 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons/trolebus.geojson'
            };

            const url = systemUrls[system];
            if (!url) {
                throw new Error(`Unsupported transport system: ${system}`);
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch transport data: ${response.status}`);
            }
            const geoJsonData = await response.json();
            
            console.log(`Raw ${system} GeoJSON data:`, geoJsonData);
            console.log(`Number of features:`, geoJsonData.features ? geoJsonData.features.length : 0);
            
            // Extract unique lines from the GeoJSON features
            const lines = new Map();
            if (geoJsonData.features && geoJsonData.features.length > 0) {
                geoJsonData.features.forEach((feature, index) => {
                    const properties = feature.properties;
                    console.log(`Feature ${index} properties:`, properties);
                    
                    // Check for various possible property names
                    const color = properties.color || properties.Color || properties.line_color || properties.lineColor;
                    const stroke = properties.stroke || properties.Stroke || properties.line_width || properties.lineWidth || properties.width;
                    const route = properties.route;
                    const lineNumber = properties.line_number || properties.lineNumber || properties.line_num || properties.lineNum;
                    const name = properties.name;
                    
                    if (color && stroke) {
                        // Create a unique key based on line number and route, not index
                        const uniqueKey = `${system}-${lineNumber}-${route || color}`;
                        
                        if (!lines.has(uniqueKey)) {
                            const lineName = name || `Línea ${lineNumber}: ${route}`;
                            lines.set(uniqueKey, {
                                id: uniqueKey,
                                name: lineName,
                                color: color,
                                stroke: parseFloat(stroke) || 2,
                                lineNumber: lineNumber,
                                system: system,
                                visible: false,
                                loading: false
                            });
                            console.log('Added unique line:', { id: uniqueKey, name: lineName, color, stroke, lineNumber, route });
                        } else {
                            console.log('Skipping duplicate line:', { lineNumber, route, color });
                        }
                    } else {
                        console.log('Skipping feature - missing color or stroke:', { color, stroke, properties });
                    }
                });
            }

            const transportLayersArray = Array.from(lines.values());
            setTransportLayers(transportLayersArray);
            console.log(`${system} data loaded:`, transportLayersArray);
            
            // If no lines were found, add a fallback entry for debugging
            if (transportLayersArray.length === 0) {
                console.warn(`No ${system} lines found. Adding fallback entry for debugging.`);
                setTransportLayers([{
                    id: `${system}-fallback`,
                    name: `${title} (Fallback)`,
                    color: '#FF0000',
                    stroke: 3,
                    lineNumber: 1,
                    system: system,
                    visible: false,
                    loading: false
                }]);
            }
        } catch (error) {
            console.error(`Error loading ${system} data:`, error);
            
            // Add fallback transport layers for testing
            console.warn(`Using fallback ${system} data due to fetch error`);
            setTransportLayers([
                {
                    id: `${system}-line-1`,
                    name: `${title} Línea 1`,
                    color: '#FF0000',
                    stroke: 3,
                    lineNumber: 1,
                    system: system,
                    visible: false,
                    loading: false
                },
                {
                    id: `${system}-line-2`,
                    name: `${title} Línea 2`,
                    color: '#0000FF',
                    stroke: 3,
                    lineNumber: 2,
                    system: system,
                    visible: false,
                    loading: false
                }
            ]);
            
            // Don't show alert for CORS/fetch errors, just log them
            if (error.message.includes('Failed to fetch')) {
                console.warn('This might be a CORS issue. Using fallback data.');
            } else {
                alert(`Error loading ${system} data: ${error.message}`);
            }
        } finally {
            setLoadingTransport(false);
        }
    };

    // Handle transport layer toggle
    const handleTransportLayerToggle = async (layerId) => {
        const layer = transportLayers.find(l => l.id === layerId);
        if (!layer) return;

        const mapInstance = window.map;
        if (!mapInstance) {
            console.error('Map instance not available');
            return;
        }

        if (layer.visible) {
            // Hide layer
            try {
                // Remove event listeners
                mapInstance.off('click', `${layerId}-stations`);
                mapInstance.off('mouseenter', `${layerId}-stations`);
                mapInstance.off('mouseleave', `${layerId}-stations`);
                
                // Remove layers
                if (mapInstance.getLayer(`${layerId}-fill`)) {
                    mapInstance.removeLayer(`${layerId}-fill`);
                }
                if (mapInstance.getLayer(`${layerId}-stroke`)) {
                    mapInstance.removeLayer(`${layerId}-stroke`);
                }
                if (mapInstance.getLayer(`${layerId}-stations`)) {
                    mapInstance.removeLayer(`${layerId}-stations`);
                }
                if (mapInstance.getSource(layerId)) {
                    mapInstance.removeSource(layerId);
                }
            } catch (error) {
                console.warn('Error removing transport layer:', error);
            }

            // Update state
            setTransportLayers(prev => prev.map(l => 
                l.id === layerId ? { ...l, visible: false, loading: false } : l
            ));
        } else {
            // Show layer - we need to fetch the data and filter by line
            setTransportLayers(prev => prev.map(l => 
                l.id === layerId ? { ...l, loading: true } : l
            ));

            try {
                // For fallback layers, create dummy data
                if (layer.id.includes('-fallback') || layer.id.includes('-line-')) {
                    const dummyData = {
                        type: 'FeatureCollection',
                        features: [
                            // Line geometry
                            {
                                type: 'Feature',
                                properties: {
                                    name: layer.name,
                                    color: layer.color,
                                    stroke: layer.stroke,
                                    type: 'line'
                                },
                                geometry: {
                                    type: 'LineString',
                                    coordinates: [
                                        [-99.1, 19.4],
                                        [-99.0, 19.4],
                                        [-99.0, 19.3],
                                        [-99.1, 19.3],
                                        [-99.1, 19.4]
                                    ]
                                }
                            },
                            // Station points
                            {
                                type: 'Feature',
                                properties: {
                                    name: 'Estación Central',
                                    type: 'station',
                                    line: layer.name
                                },
                                geometry: {
                                    type: 'Point',
                                    coordinates: [-99.05, 19.35]
                                }
                            },
                            {
                                type: 'Feature',
                                properties: {
                                    name: 'Estación Norte',
                                    type: 'station',
                                    line: layer.name
                                },
                                geometry: {
                                    type: 'Point',
                                    coordinates: [-99.0, 19.4]
                                }
                            }
                        ]
                    };

                    // Add source
                    if (mapInstance.getSource(layerId)) {
                        mapInstance.removeSource(layerId);
                    }

                    mapInstance.addSource(layerId, {
                        type: 'geojson',
                        data: dummyData
                    });

                    // Add stroke layer for lines
                    mapInstance.addLayer({
                        id: `${layerId}-stroke`,
                        type: 'line',
                        source: layerId,
                        filter: ['==', ['get', 'type'], 'line'],
                        paint: {
                            'line-color': layer.color,
                            'line-width': layer.stroke,
                            'line-opacity': 0.8
                        }
                    });

                    // Add station points layer
                    mapInstance.addLayer({
                        id: `${layerId}-stations`,
                        type: 'circle',
                        source: layerId,
                        filter: ['==', ['get', 'type'], 'station'],
                        paint: {
                            'circle-color': layer.color,
                            'circle-radius': 6,
                            'circle-opacity': 0.8,
                            'circle-stroke-color': '#ffffff',
                            'circle-stroke-width': 2
                        }
                    });

                    // Add click event for stations
                    mapInstance.on('click', `${layerId}-stations`, (e) => {
                        const features = e.features;
                        if (features.length > 0) {
                            const feature = features[0];
                            const stationName = feature.properties.name;
                            const lineName = feature.properties.line;
                            
                            // Create popup
                            new mapboxgl.Popup()
                                .setLngLat(e.lngLat)
                                .setHTML(`
                                    <div class="metro-station-tooltip">
                                        <h3>${stationName}</h3>
                                        <p>${lineName}</p>
                                    </div>
                                `)
                                .addTo(mapInstance);
                        }
                    });

                    // Change cursor on hover
                    mapInstance.on('mouseenter', `${layerId}-stations`, () => {
                        mapInstance.getCanvas().style.cursor = 'pointer';
                    });

                    mapInstance.on('mouseleave', `${layerId}-stations`, () => {
                        mapInstance.getCanvas().style.cursor = '';
                    });

                    // Update state
                    setTransportLayers(prev => prev.map(l => 
                        l.id === layerId ? { ...l, visible: true, loading: false } : l
                    ));

                    console.log(`Fallback transport layer ${layer.name} loaded successfully`);
                    return;
                }

                // Fetch the full transport data
                const systemUrls = {
                    'metro': 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons/metro.geojson',
                    'metrobus': 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons/metrobus.geojson',
                    'tren-ligero': 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons/tren-ligero.geojson',
                    'trolebus': 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons/trolebus.geojson'
                };

                const response = await fetch(systemUrls[layer.system]);
                if (!response.ok) {
                    throw new Error(`Failed to fetch transport data: ${response.status}`);
                }
                const geoJsonData = await response.json();

                // Filter features for this specific line (both lines and stations)
                const filteredFeatures = geoJsonData.features.filter(feature => {
                    const properties = feature.properties;
                    const color = properties.color || properties.Color || properties.line_color || properties.lineColor;
                    const stroke = properties.stroke || properties.Stroke || properties.line_width || properties.lineWidth || properties.width;
                    const lineNumber = properties.line_number || properties.lineNumber || properties.line_num || properties.lineNum;
                    const route = properties.route;
                    
                    // Create the same unique key as used in deduplication
                    const featureKey = `${layer.system}-${lineNumber}-${route || color}`;
                    
                    // Match by the unique key we used for deduplication
                    return properties && featureKey === layer.id;
                });

                const filteredData = {
                    type: 'FeatureCollection',
                    features: filteredFeatures
                };

                // Add source
                if (mapInstance.getSource(layerId)) {
                    mapInstance.removeSource(layerId);
                }

                mapInstance.addSource(layerId, {
                    type: 'geojson',
                    data: filteredData
                });

                // Add stroke layer for lines (if any line features exist)
                const hasLineFeatures = filteredFeatures.some(f => f.properties.type === 'line');
                if (hasLineFeatures) {
                    mapInstance.addLayer({
                        id: `${layerId}-stroke`,
                        type: 'line',
                        source: layerId,
                        filter: ['==', ['get', 'type'], 'line'],
                        paint: {
                            'line-color': layer.color,
                            'line-width': layer.stroke,
                            'line-opacity': 0.8
                        }
                    });
                }

                // Add station points layer
                mapInstance.addLayer({
                    id: `${layerId}-stations`,
                    type: 'circle',
                    source: layerId,
                    filter: ['==', ['get', 'type'], 'station'],
                    paint: {
                        'circle-color': layer.color,
                        'circle-radius': 6,
                        'circle-opacity': 0.8,
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-width': 2
                    }
                });

                // Add click event for stations
                mapInstance.on('click', `${layerId}-stations`, (e) => {
                    const features = e.features;
                    if (features.length > 0) {
                        const feature = features[0];
                        const stationName = feature.properties.name || 'Estación';
                        const lineName = layer.name;
                        const identifier = feature.properties.identifier || '';
                        const route = feature.properties.route || '';
                        
                        // Create popup
                        new mapboxgl.Popup()
                            .setLngLat(e.lngLat)
                            .setHTML(`
                                <div class="metro-station-tooltip">
                                    <h3>${stationName}</h3>
                                    <p>${lineName}</p>
                                    ${identifier ? `<p class="station-id">${identifier}</p>` : ''}
                                    ${route ? `<p class="station-route">${route}</p>` : ''}
                                </div>
                            `)
                            .addTo(mapInstance);
                    }
                });

                // Change cursor on hover
                mapInstance.on('mouseenter', `${layerId}-stations`, () => {
                    mapInstance.getCanvas().style.cursor = 'pointer';
                });

                mapInstance.on('mouseleave', `${layerId}-stations`, () => {
                    mapInstance.getCanvas().style.cursor = '';
                });

                // Update state
                setTransportLayers(prev => prev.map(l => 
                    l.id === layerId ? { ...l, visible: true, loading: false } : l
                ));

                console.log(`Transport layer ${layer.name} loaded successfully`);

            } catch (error) {
                console.error('Error loading transport layer:', error);
                alert(`Error loading transport layer: ${error.message}`);
                
                // Reset loading state
                setTransportLayers(prev => prev.map(l => 
                    l.id === layerId ? { ...l, loading: false } : l
                ));
            }
        }
    };

    // Toggle collapse state
    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return React.createElement('div', {
        className: 'public-transport-list'
    }, [
        // Header with title and chevron
        React.createElement('div', {
            key: 'transport-header',
            className: 'transport-section-header',
            onClick: toggleCollapse
        }, [
            React.createElement('div', {
                key: 'header-content',
                className: 'transport-header-content'
            }, [
                React.createElement('h4', {
                    key: 'transport-title',
                    className: 'transport-title'
                }, title),
                React.createElement('span', {
                    key: 'transport-count',
                    className: 'transport-count'
                }, `(${transportLayers.length})`)
            ]),
            React.createElement('div', {
                key: 'chevron',
                className: `transport-chevron ${isCollapsed ? 'collapsed' : 'expanded'}`
            }, React.createElement('svg', {
                width: '16',
                height: '16',
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: '2',
                style: {
                    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.2s ease'
                }
            }, React.createElement('polyline', {
                points: '6,9 12,15 18,9'
            })))
        ]),
        
        // Collapsible content
        !isCollapsed && React.createElement('div', {
            key: 'transport-content',
            className: 'transport-content'
        }, [
            React.createElement('div', {
                key: 'transport-list',
                className: 'transport-list'
            }, loadingTransport ? 
                React.createElement('div', {
                    key: 'transport-loading',
                    className: 'transport-loading'
                }, `Cargando líneas de ${title.toLowerCase()}...`) :
                transportLayers.map(layer => 
                    React.createElement('div', {
                        key: layer.id,
                        className: `transport-item ${layer.visible ? 'active' : ''} ${layer.loading ? 'loading' : ''}`
                    }, [
                        React.createElement('label', {
                            key: 'transport-checkbox',
                            className: 'transport-checkbox'
                        }, [
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: layer.visible,
                                onChange: () => handleTransportLayerToggle(layer.id),
                                disabled: layer.loading
                            }),
                            React.createElement('span', {
                                className: 'checkmark',
                                style: { borderColor: layer.color }
                            })
                        ]),
                        React.createElement('div', {
                            key: 'transport-info',
                            className: 'transport-info'
                        }, [
                            React.createElement('div', {
                                key: 'transport-name',
                                className: 'transport-name',
                                style: { color: layer.color }
                            }, layer.name),
                            layer.loading && React.createElement('div', {
                                key: 'transport-loading',
                                className: 'transport-loading'
                            }, 'Cargando...')
                        ])
                    ])
                )
            )
        ])
    ]);
}

// Export for use in other components
window.PublicTransportList = PublicTransportList;
