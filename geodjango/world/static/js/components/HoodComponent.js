/**
 * Hood Component
 * Displays neighbourhood information card
 */
function HoodComponent({ selectedPolygon, onClose }) {
    const [showMoreInfo, setShowMoreInfo] = React.useState(false);
    const [airbnbMarkersVisible, setAirbnbMarkersVisible] = React.useState(false);
    
    // Cleanup layer when component unmounts or polygon changes
    // This hook MUST be called before any early returns to follow Rules of Hooks
    React.useEffect(() => {
        return () => {
            const map = window.map;
            if (map && map.isStyleLoaded()) {
                const sourceId = 'airbnb-listings-source';
                const layerId = 'airbnb-listings-layer';
                
                // Remove the layer and source
                if (map.getLayer(layerId)) {
                    map.removeLayer(layerId);
                }
                if (map.getSource(sourceId)) {
                    map.removeSource(sourceId);
                }
            }
            setAirbnbMarkersVisible(false);
        };
    }, [selectedPolygon]);
    
    if (!selectedPolygon || !selectedPolygon.properties) {
        return null;
    }
    
    const props = selectedPolygon.properties || {};
    const neighbourhoodName = props.neighbourhood_name || 'Colonia';
    const municipalityName = props.municipality_name || 'N/A';
    const municipalityCode = props.municipality_code || null;
    const population = props.population || null;
    const leisure = props.leisure || null;
    const provision = props.provision || null;
    const airbnbListings = props.airbnb_listings || null;
    const airbnbPriceAverage = props.airbnb_listings_price_average || null;
    
    // Safely get airbnb_listings_list - handle both array and undefined/null cases
    let airbnbListingsList = [];
    if (props.airbnb_listings_list !== undefined && props.airbnb_listings_list !== null) {
        if (Array.isArray(props.airbnb_listings_list)) {
            airbnbListingsList = props.airbnb_listings_list;
        } else if (typeof props.airbnb_listings_list === 'string') {
            // Handle case where it might be a JSON string
            try {
                const parsed = JSON.parse(props.airbnb_listings_list);
                if (Array.isArray(parsed)) {
                    airbnbListingsList = parsed;
                }
            } catch (e) {
                console.warn('Error parsing airbnb_listings_list as JSON:', e);
            }
        }
    }
    
    // Format number helper
    const formatNumber = (value) => {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        return value.toLocaleString('es-MX', { maximumFractionDigits: 0 });
    };
    
    // Format price helper
    const formatPrice = (value) => {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        return `$${value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
    };
    
    // Toggle Airbnb markers on map using a GeoJSON layer
    const toggleAirbnbMarkers = (e) => {
        if (e) {
            e.stopPropagation();
        }
        
        const map = window.map;
        if (!map || !map.isStyleLoaded()) {
            console.warn('Map not available or not loaded');
            return;
        }
        
        // Verify airbnbListingsList is valid
        if (!Array.isArray(airbnbListingsList) || airbnbListingsList.length === 0) {
            console.warn('airbnb_listings_list is not a valid array or is empty:', airbnbListingsList);
            return;
        }
        
        const sourceId = 'airbnb-listings-source';
        const layerId = 'airbnb-listings-layer';
        
        if (airbnbMarkersVisible) {
            // Remove the layer and source
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
            if (map.getSource(sourceId)) {
                map.removeSource(sourceId);
            }
            setAirbnbMarkersVisible(false);
        } else {
            // Create GeoJSON FeatureCollection from coordinates
            const features = [];
            airbnbListingsList.forEach((coord, index) => {
                try {
                    let lng, lat;
                    
                    // Handle string format: "longitude, latitude"
                    if (typeof coord === 'string') {
                        const parts = coord.split(',').map(s => s.trim());
                        if (parts.length === 2) {
                            lng = parseFloat(parts[0]);
                            lat = parseFloat(parts[1]);
                        } else {
                            console.warn('Invalid coordinate string format:', coord);
                            return;
                        }
                    } else if (Array.isArray(coord)) {
                        // Handle array format: [lng, lat]
                        if (coord.length >= 2) {
                            lng = parseFloat(coord[0]);
                            lat = parseFloat(coord[1]);
                        } else {
                            console.warn('Invalid coordinate array format:', coord);
                            return;
                        }
                    } else {
                        console.warn('Invalid coordinate format (not string or array):', coord);
                        return; // Skip invalid format
                    }
                    
                    // Validate parsed coordinates
                    if (isNaN(lng) || isNaN(lat) || lng === null || lat === null) {
                        console.warn('Invalid parsed coordinates:', { lng, lat, original: coord });
                        return;
                    }
                    
                    // Validate coordinate ranges (rough bounds for Mexico City)
                    if (lng < -100 || lng > -98 || lat < 19 || lat > 20) {
                        console.warn('Coordinates out of expected range:', { lng, lat });
                        // Still add it, but log a warning
                    }
                    
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [lng, lat]
                        },
                        properties: {
                            id: index
                        }
                    });
                } catch (e) {
                    console.warn('Error parsing Airbnb coordinate:', coord, e);
                }
            });
            
            if (features.length === 0) {
                console.warn('No valid features created from airbnb_listings_list');
                return;
            }
            
            const geoJsonData = {
                type: 'FeatureCollection',
                features: features
            };
            
            // Add source if it doesn't exist
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: geoJsonData
                });
            } else {
                // Update existing source
                map.getSource(sourceId).setData(geoJsonData);
            }
            
            // Add layer if it doesn't exist
            if (!map.getLayer(layerId)) {
                map.addLayer({
                    id: layerId,
                    type: 'circle',
                    source: sourceId,
                    paint: {
                        'circle-radius': 6,
                        'circle-color': '#ff385c',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff',
                        'circle-opacity': 0.9
                    }
                });
            }
            
            setAirbnbMarkersVisible(true);
        }
    };
    
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '5px',
            padding: '16px',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            fontFamily: "'Ruda', sans-serif"
        }}>
            {/* Close button */}
            {onClose && (
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        padding: 0,
                        fontSize: '18px',
                        color: '#666',
                        lineHeight: '1',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#f0f0f0';
                        e.target.style.color = '#333';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#666';
                    }}
                    title="Cerrar"
                >
                    ×
                </button>
            )}
            
            <div style={{
                padding: '0'
            }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px',
                    paddingRight: onClose ? '24px' : '0'
                }}>
                    {neighbourhoodName}
                </div>
                <div style={{
                    fontSize: '13px',
                    color: '#666',
                    marginBottom: '12px'
                }}>
                    {municipalityName}{municipalityCode ? ` - ${municipalityCode}` : ''}
                </div>
                
                {/* Divider */}
                <div style={{
                    height: '1px',
                    backgroundColor: '#e0e0e0',
                    margin: '12px 0'
                }}></div>
                
                {/* Más información section */}
                <div style={{
                    backgroundColor: showMoreInfo ? '#f5f5f5' : 'transparent',
                    borderRadius: '4px',
                    padding: showMoreInfo ? '3px' : '0',
                    transition: 'all 0.2s ease'
                }}>
                    <div
                        onClick={() => setShowMoreInfo(!showMoreInfo)}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '3px',
                            transition: 'all 0.2s ease',
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => {
                            if (!showMoreInfo) {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!showMoreInfo) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        <div style={{
                            fontSize: '13px',
                            color: '#666',
                            fontWeight: '500'
                        }}>
                            {showMoreInfo ? 'Menos información' : 'Más información'}
                        </div>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s ease',
                            transform: showMoreInfo ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 9L1 4L2.4 2.6L6 6.2L9.6 2.6L11 4L6 9Z" fill="#666"/>
                            </svg>
                        </div>
                    </div>
                    
                    {/* Expanded content */}
                    {showMoreInfo && (
                        <div style={{
                            marginTop: '8px',
                            paddingTop: '8px'
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '13px'
                            }}>
                                <tbody>
                                <tr style={{
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <td style={{
                                        padding: '8px 0',
                                        color: '#666',
                                        textAlign: 'left'
                                    }}>
                                        Entretenimiento
                                    </td>
                                    <td style={{
                                        padding: '8px 0',
                                        color: '#333',
                                        fontWeight: '600',
                                        textAlign: 'right'
                                    }}>
                                        {formatNumber(leisure)}
                                    </td>
                                </tr>
                                <tr style={{
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <td style={{
                                        padding: '8px 0',
                                        color: '#666',
                                        textAlign: 'left'
                                    }}>
                                        Comercio
                                    </td>
                                    <td style={{
                                        padding: '8px 0',
                                        color: '#333',
                                        fontWeight: '600',
                                        textAlign: 'right'
                                    }}>
                                        {formatNumber(provision)}
                                    </td>
                                </tr>
                                <tr 
                                    onClick={airbnbListingsList && airbnbListingsList.length > 0 ? toggleAirbnbMarkers : null}
                                    style={{
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: airbnbListingsList && airbnbListingsList.length > 0 ? 'pointer' : 'default',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (airbnbListingsList && airbnbListingsList.length > 0) {
                                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                    title={airbnbListingsList && airbnbListingsList.length > 0 ? (airbnbMarkersVisible ? 'Ocultar Airbnbs' : 'Mostrar Airbnbs') : ''}
                                >
                                    <td style={{
                                        padding: '8px 0',
                                        color: '#666',
                                        textAlign: 'left'
                                    }}>
                                        Airbnbs
                                    </td>
                                    <td style={{
                                        padding: '8px 0',
                                        color: '#333',
                                        fontWeight: '600',
                                        textAlign: 'right',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        gap: '8px'
                                    }}>
                                        <span>{formatNumber(airbnbListings)}</span>
                                        {airbnbListingsList && airbnbListingsList.length > 0 && (
                                            <div
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    {airbnbMarkersVisible ? (
                                                        // Eye off icon
                                                        <path d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.64 13.82L19.56 16.74C21.07 15.49 22.26 13.86 22.99 12C21.26 7.61 17 4.5 12 4.5C10.6 4.5 9.26 4.75 8 5.2L10.17 7.37C10.74 7.13 11.35 7 12 7ZM2 4.27L4.28 6.55L4.73 7C3.08 8.3 1.78 10 1 12C2.73 16.39 7 19.5 12 19.5C13.55 19.5 15.03 19.2 16.38 18.66L16.8 19.08L19.73 22L21 20.73L3.27 3L2 4.27ZM7.53 9.8L9.08 11.35C9.03 11.56 9 11.78 9 12C9 13.66 10.34 15 12 15C12.22 15 12.44 14.97 12.65 14.92L14.2 16.47C13.53 16.8 12.79 17 12 17C9.24 17 7 14.76 7 12C7 11.21 7.2 10.47 7.53 9.8ZM11.84 9.02L14.99 12.17L15.01 12.01C15.01 10.35 13.67 9.01 12.01 9.01L11.84 9.02Z" fill={airbnbMarkersVisible ? "#0080ff" : "#666"}/>
                                                    ) : (
                                                        // Eye on icon
                                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="#666"/>
                                                    )}
                                                </svg>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{
                                        padding: '8px 0',
                                        color: '#666',
                                        textAlign: 'left'
                                    }}>
                                        Precio promedio de Airbnbs
                                    </td>
                                    <td style={{
                                        padding: '8px 0',
                                        color: '#333',
                                        fontWeight: '600',
                                        textAlign: 'right'
                                    }}>
                                        {formatPrice(airbnbPriceAverage)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Make the component available globally
window.HoodComponent = HoodComponent;

