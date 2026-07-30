// InterestPolygonsComponent - Handles fetching, toggling, and displaying attraction polygons
function InterestPolygonsComponent({ shouldShowTooltip = true }) {
    const [visible, setVisible] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const url = 'https://distritosmexico.s3.us-east-2.amazonaws.com/contextual-data/polygons.geojson';
    
    // Store event handler references for cleanup
    const eventHandlersRef = React.useRef({
        click: null,
        mouseenter: null,
        mouseleave: null
    });

    // Handle layer toggle
    const handleToggle = async () => {
        const mapInstance = window.map;
        if (!mapInstance) {
            console.error('Map instance not available');
            return;
        }

        if (visible) {
            // Hide layer
            try {
                // Remove event listeners only if layer exists
                if (mapInstance.getLayer('attraction-polygons-fill')) {
                    if (eventHandlersRef.current.click) {
                        try {
                            mapInstance.off('click', 'attraction-polygons-fill', eventHandlersRef.current.click);
                        } catch (e) {
                            console.warn('Error removing click handler:', e);
                        }
                        eventHandlersRef.current.click = null;
                    }
                    if (eventHandlersRef.current.mouseenter) {
                        try {
                            mapInstance.off('mouseenter', 'attraction-polygons-fill', eventHandlersRef.current.mouseenter);
                        } catch (e) {
                            console.warn('Error removing mouseenter handler:', e);
                        }
                        eventHandlersRef.current.mouseenter = null;
                    }
                    if (eventHandlersRef.current.mouseleave) {
                        try {
                            mapInstance.off('mouseleave', 'attraction-polygons-fill', eventHandlersRef.current.mouseleave);
                        } catch (e) {
                            console.warn('Error removing mouseleave handler:', e);
                        }
                        eventHandlersRef.current.mouseleave = null;
                    }
                    
                    mapInstance.removeLayer('attraction-polygons-fill');
                }
                if (mapInstance.getLayer('attraction-polygons-stroke')) {
                    mapInstance.removeLayer('attraction-polygons-stroke');
                }
                if (mapInstance.getSource('attraction-polygons')) {
                    mapInstance.removeSource('attraction-polygons');
                }
            } catch (error) {
                console.warn('Error removing layer:', error);
            }

            setVisible(false);
            setLoading(false);
        } else {
            // Show layer
            setLoading(true);

            try {
                // Fetch GeoJSON data
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch layer data: ${response.status}`);
                }
                const geoJsonData = await response.json();

                // Filter features to only include those with TURISTICO property
                let filteredFeatures = [];
                if (geoJsonData && geoJsonData.features && Array.isArray(geoJsonData.features)) {
                    filteredFeatures = geoJsonData.features.filter(feature => {
                        // Include features that have TURISTICO property
                        return feature.properties && feature.properties.TURISTICO;
                    });
                }

                // Create filtered FeatureCollection
                const filteredGeoJsonData = {
                    type: 'FeatureCollection',
                    features: filteredFeatures
                };

                console.log(`Filtered ${filteredFeatures.length} attraction polygons from ${geoJsonData.features ? geoJsonData.features.length : 0} total features`);

                // Add source
                if (mapInstance.getSource('attraction-polygons')) {
                    mapInstance.removeSource('attraction-polygons');
                }

                mapInstance.addSource('attraction-polygons', {
                    type: 'geojson',
                    data: filteredGeoJsonData
                });

                // Add fill layer
                mapInstance.addLayer({
                    id: 'attraction-polygons-fill',
                    type: 'fill',
                    source: 'attraction-polygons',
                    paint: {
                        'fill-color': '#FF6B6B',
                        'fill-opacity': shouldShowTooltip ? 0.3 : 0.05
                    }
                });

                // Add stroke layer
                mapInstance.addLayer({
                    id: 'attraction-polygons-stroke',
                    type: 'line',
                    source: 'attraction-polygons',
                    paint: {
                        'line-color': '#FF6B6B',
                        'line-width': 2,
                        'line-opacity': 0.8
                    }
                });

                // Helper function to format property value
                const formatProperty = (value) => {
                    if (value === null || value === undefined) return 'N/A';
                    return String(value);
                };

                // Add click event for polygons
                const clickHandler = (e) => {
                    const features = e.features;
                    if (features.length > 0) {
                        const feature = features[0];
                        const properties = feature.properties || {};
                        
                        // Extract relevant properties
                        const nombre = formatProperty(properties.NOM_ASEN);
                        const tipo = formatProperty(properties.TIPO);
                        const turistico = formatProperty(properties.TURISTICO);
                        const cvegeo = formatProperty(properties.CVEGEO);
                        const cp = formatProperty(properties.CP);
                        const institucion = formatProperty(properties.INSTITUCIO);
                        const fechaAct = formatProperty(properties.FECHA_ACT);
                        const shapeArea = properties.Shape_Area ? parseFloat(properties.Shape_Area).toFixed(2) : 'N/A';
                        const shapeLeng = properties.Shape_Leng ? parseFloat(properties.Shape_Leng).toFixed(2) : 'N/A';
                        
                        // Create popup HTML
                        const popupHTML = `
                            <div class="attraction-polygon-tooltip" style="padding: 12px; min-width: 250px; max-width: 350px;">
                                <h3 style="margin: 0 0 12px 0; color: #333; font-size: 16px; font-weight: 600; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                    ${nombre}
                                </h3>
                                <div style="font-size: 14px; line-height: 1.6;">
                                    ${tipo ? `<p style="margin: 6px 0;"><strong>Tipo:</strong> ${tipo}</p>` : ''}
                                    ${turistico ? `<p style="margin: 6px 0;"><strong>Turístico:</strong> ${turistico}</p>` : ''}
                                    ${cvegeo ? `<p style="margin: 6px 0;"><strong>CVEGEO:</strong> ${cvegeo}</p>` : ''}
                                    ${cp ? `<p style="margin: 6px 0;"><strong>Código Postal:</strong> ${cp}</p>` : ''}
                                    ${institucion ? `<p style="margin: 6px 0;"><strong>Institución:</strong> ${institucion}</p>` : ''}
                                    ${fechaAct ? `<p style="margin: 6px 0;"><strong>Fecha Actualización:</strong> ${fechaAct}</p>` : ''}
                                    ${shapeArea !== 'N/A' ? `<p style="margin: 6px 0; font-size: 12px; color: #666;"><strong>Área:</strong> ${shapeArea} m²</p>` : ''}
                                    ${shapeLeng !== 'N/A' ? `<p style="margin: 6px 0; font-size: 12px; color: #666;"><strong>Longitud:</strong> ${shapeLeng} m</p>` : ''}
                                </div>
                            </div>
                        `;
                        
                        // Create and show popup
                        new mapboxgl.Popup()
                            .setLngLat(e.lngLat)
                            .setHTML(popupHTML)
                            .addTo(mapInstance);
                    }
                };
                
                // Add mouseenter event to change cursor
                const mouseenterHandler = () => {
                    mapInstance.getCanvas().style.cursor = 'pointer';
                };
                
                // Add mouseleave event to reset cursor
                const mouseleaveHandler = () => {
                    mapInstance.getCanvas().style.cursor = '';
                };
                
                // Register event handlers
                // Only register click handler if tooltips are enabled
                if (shouldShowTooltip) {
                    mapInstance.on('click', 'attraction-polygons-fill', clickHandler);
                    eventHandlersRef.current.click = clickHandler;
                } else {
                    eventHandlersRef.current.click = null;
                }
                mapInstance.on('mouseenter', 'attraction-polygons-fill', mouseenterHandler);
                mapInstance.on('mouseleave', 'attraction-polygons-fill', mouseleaveHandler);
                
                // Store handlers for cleanup
                eventHandlersRef.current.mouseenter = mouseenterHandler;
                eventHandlersRef.current.mouseleave = mouseleaveHandler;

                setVisible(true);
                setLoading(false);

                console.log('Attraction polygons layer loaded successfully');

            } catch (error) {
                console.error('Error loading layer:', error);
                alert(`Error loading layer: ${error.message}`);
                
                setLoading(false);
            }
        }
    };

    return React.createElement('div', {
        className: `layer-item ${visible ? 'active' : ''} ${loading ? 'loading' : ''}`
    }, [
        React.createElement('label', {
            key: 'layer-checkbox',
            className: 'layer-checkbox'
        }, [
            React.createElement('input', {
                type: 'checkbox',
                checked: visible,
                onChange: handleToggle,
                disabled: loading
            }),
            React.createElement('span', {
                className: 'checkmark'
            })
        ]),
        React.createElement('div', {
            key: 'layer-info',
            className: 'layer-info'
        }, [
            React.createElement('div', {
                key: 'layer-name',
                className: 'layer-name'
            }, 'Polígonos de interés'),
            loading && React.createElement('div', {
                key: 'layer-loading',
                className: 'layer-loading'
            }, 'Cargando...')
        ])
    ]);
}

// Export for use in other components
window.InterestPolygonsComponent = InterestPolygonsComponent;
