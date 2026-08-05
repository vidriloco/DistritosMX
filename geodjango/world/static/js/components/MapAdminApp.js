// Constants for indicator names
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
    'airbnb_listings_entire_hotel_price_average': 'Precio promedio habitaciones de hotel',
    // Movilidad indicators
    'ecobici_stations': 'Estaciones Ecobici',
    'cablebus_stations': 'Estaciones Cablebús',
    'metro_stations': 'Estaciones Metro',
    'metrobus_stations': 'Estaciones Metrobús',
    'rtp_stations': 'Estaciones RTP',
    'concesionados_stations': 'Estaciones Concesionados',
    'tren_interurbano_stations': 'Estaciones Tren Interurbano',
    'tren_suburbano_stations': 'Estaciones Tren Suburbano',
    'mexibus_stations': 'Estaciones Mexibús',
    'mexicable_stations': 'Estaciones Mexicable',
    'tren_ligero_stations': 'Estaciones Tren Ligero'
};

// Helper function to get indicator display name
const getIndicatorDisplayName = (indicatorProperty) => {
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

/**
 * Get min and max values from a GeoJSON collection for a specific property
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {string} propertyName - Name of the property to extract values from
 * @returns {Object} Object with min and max values {min: number, max: number}
 */
const getPropertyRange = (geojson, propertyName) => {
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        return { min: 0, max: 0 };
    }
    
    const values = geojson.features
        .map(feature => {
            const value = feature.properties && feature.properties[propertyName];
            return value !== null && value !== undefined && !isNaN(value) ? Number(value) : null;
        })
        .filter(val => val !== null);
    
    if (values.length === 0) {
        return { min: 0, max: 0 };
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { min, max };
};

/**
 * Get min and max values from tourist_visitors_info field for a specific time period
 * Extracts values from all days and all features for the given time period and month
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {string} timePeriod - Time period: "m" (morning), "a" (afternoon), "e" (evening), or "d" (daily)
 * @param {string} monthKey - Month key in format "YYYY-MM" (e.g., "2024-11")
 * @returns {Object} Object with min and max values {min: number, max: number}
 */
const getTouristVisitorsRange = (geojson, timePeriod, monthKey = '2024-11') => {
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        return { min: 0, max: 0 };
    }
    
    // Validate time period
    const validTimePeriods = ['m', 'a', 'e', 'd'];
    if (!validTimePeriods.includes(timePeriod)) {
        console.warn(`Invalid time period: ${timePeriod}. Must be one of: ${validTimePeriods.join(', ')}`);
        return { min: 0, max: 0 };
    }
    
    const values = [];
    
    // Iterate through all features
    geojson.features.forEach(feature => {
        const properties = feature.properties;
        if (!properties || !properties.tourist_visitors_info) {
            return; // Skip if no tourist_visitors_info data
        }
        
        const touristInfo = properties.tourist_visitors_info;
        
        // Check if touristInfo is an object (JSON field)
        if (typeof touristInfo !== 'object' || touristInfo === null) {
            return; // Skip if not a valid object
        }
        
        // Get the month data
        const monthData = touristInfo[monthKey];
        if (!monthData || typeof monthData !== 'object') {
            return; // Skip if month data doesn't exist
        }
        
        // Get days object
        const days = monthData.days;
        if (!days || typeof days !== 'object') {
            return; // Skip if days data doesn't exist
        }
        
        // Iterate through all days
        for (const dayKey in days) {
            if (days.hasOwnProperty(dayKey)) {
                const dayData = days[dayKey];
                
                if (dayData && typeof dayData === 'object') {
                    // Extract value for the specified time period
                    if (dayData[timePeriod] !== null && dayData[timePeriod] !== undefined) {
                        const value = Number(dayData[timePeriod]);
                        if (!isNaN(value)) {
                            values.push(value);
                        }
                    }
                }
            }
        }
    });
    
    if (values.length === 0) {
        console.warn(`No valid values found for time period "${timePeriod}" in tourist_visitors_info[${monthKey}]`);
        return { min: 0, max: 0 };
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { min, max };
};

/**
 * Extract a specific value from tourist_visitors_info for a given day and time period
 * @param {Object} properties - Feature properties object
 * @param {string} day - Day number as string with leading zero ("01" to "30")
 * @param {string} timePeriod - Time period: "m" (morning), "a" (afternoon), "e" (evening), or "d" (daily)
 * @param {string} monthKey - Month key in format "YYYY-MM" (e.g., "2024-11", default: "2024-11")
 * @returns {number|null} The value for the specified day and time period, or null if not found
 */
const getTouristVisitorsValue = (properties, day, timePeriod, monthKey = '2024-11') => {
    if (!properties || !properties.tourist_visitors_info) {
        return null;
    }
    
    let touristInfo = properties.tourist_visitors_info;
    
    // Handle case where it might be a JSON string
    if (typeof touristInfo === 'string') {
        try {
            touristInfo = JSON.parse(touristInfo);
        } catch (e) {
            console.error('Error parsing tourist_visitors_info:', e);
            return null;
        }
    }
    
    // Validate time period
    const validTimePeriods = ['m', 'a', 'e', 'd'];
    if (!validTimePeriods.includes(timePeriod)) {
        return null;
    }
    
    // Validate day format (should be "01" to "31")
    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        return null;
    }
    
    if (typeof touristInfo !== 'object' || touristInfo === null) {
        return null;
    }
    
    // Get month data
    const monthData = touristInfo[monthKey];
    if (!monthData || typeof monthData !== 'object') {
        return null;
    }
    
    // Get days object
    const days = monthData.days;
    if (!days || typeof days !== 'object') {
        return null;
    }
    
    const dayKey = dayNum.toString().padStart(2, '0'); // Ensure format "01", "02", etc.
    
    if (days[dayKey] && typeof days[dayKey] === 'object') {
        const dayData = days[dayKey];
        if (dayData[timePeriod] !== null && dayData[timePeriod] !== undefined) {
            const value = Number(dayData[timePeriod]);
            return !isNaN(value) ? value : null;
        }
    }
    
    return null;
};

/**
 * Get color for a value based on a 5-range heatmap partition
 * @param {number} value - The numeric value to get color for
 * @param {number} rangeTop - Maximum value in the range
 * @param {number} rangeBottom - Minimum value in the range
 * @returns {string} Hex color code
 */
/**
 * Get heatmap color based on value and time period
 * @param {number} value - The value to color
 * @param {number} rangeTop - Maximum value in range
 * @param {number} rangeBottom - Minimum value in range
 * @param {string} timePeriod - Time period: 'm' (morning), 'a' (afternoon), 'e' (evening/night)
 * @returns {string} Hex color
 */
const getHeatmapColor = (value, rangeTop, rangeBottom, timePeriod = 'm') => {
    // Handle edge cases - return lightest color for zero, null, undefined, or NaN values
    if (value === null || value === undefined || isNaN(value) || value === 0) {
        // Return the lightest color for the selected time period
        const lightestColors = {
            'm': '#e3f2fd', // Light blue for morning
            'a': '#fff9c4', // Light yellow for afternoon
            'e': '#f3e5f5'  // Light purple for evening/night
        };
        return lightestColors[timePeriod] || '#e3f2fd'; // Default to light blue
    }
    
    if (rangeTop === rangeBottom) {
        // Default color based on time period if no range
        const defaultColors = {
            'm': '#4a90e2', // Blue for morning
            'a': '#ff9800', // Orange for afternoon
            'e': '#7b1fa2'  // Purple for evening/night
        };
        return defaultColors[timePeriod] || '#4a90e2';
    }
    
    // Normalize value to 0-1 range
    const normalized = (value - rangeBottom) / (rangeTop - rangeBottom);
    
    // Clamp to 0-1
    const clamped = Math.max(0, Math.min(1, normalized));
    
    // Color schemes for different time periods
    let color;
    
    if (timePeriod === 'm') {
        // Morning: Light blue to cyan to bright blue (dawn/sunrise theme)
        if (clamped < 0.33) {
            const t = clamped / 0.33;
            color = interpolateColor('#e3f2fd', '#81d4fa', t); // Light blue to light cyan
        } else if (clamped < 0.66) {
            const t = (clamped - 0.33) / 0.33;
            color = interpolateColor('#81d4fa', '#29b6f6', t); // Light cyan to cyan
        } else {
            const t = (clamped - 0.66) / 0.34;
            color = interpolateColor('#29b6f6', '#0277bd', t); // Cyan to deep blue
        }
    } else if (timePeriod === 'a') {
        // Afternoon: Light yellow to orange to deep orange (midday/sunset theme)
        if (clamped < 0.33) {
            const t = clamped / 0.33;
            color = interpolateColor('#fff9c4', '#ffeb3b', t); // Light yellow to yellow
        } else if (clamped < 0.66) {
            const t = (clamped - 0.33) / 0.33;
            color = interpolateColor('#ffeb3b', '#ff9800', t); // Yellow to orange
        } else {
            const t = (clamped - 0.66) / 0.34;
            color = interpolateColor('#ff9800', '#e65100', t); // Orange to deep orange
        }
    } else if (timePeriod === 'e') {
        // Evening/Night: Light purple to purple to deep purple (twilight/night theme)
        if (clamped < 0.33) {
            const t = clamped / 0.33;
            color = interpolateColor('#f3e5f5', '#ce93d8', t); // Light purple to purple
        } else if (clamped < 0.66) {
            const t = (clamped - 0.33) / 0.33;
            color = interpolateColor('#ce93d8', '#ba68c8', t); // Purple to medium purple
        } else {
            const t = (clamped - 0.66) / 0.34;
            color = interpolateColor('#ba68c8', '#6a1b9a', t); // Medium purple to deep purple
        }
    } else {
        // Fallback to original colors
        if (clamped < 0.33) {
            const t = clamped / 0.33;
            color = interpolateColor('#e3f2fd', '#90caf9', t);
        } else if (clamped < 0.66) {
            const t = (clamped - 0.33) / 0.33;
            color = interpolateColor('#90caf9', '#ffd54f', t);
        } else {
            const t = (clamped - 0.66) / 0.34;
            color = interpolateColor('#ffd54f', '#e53935', t);
        }
    }
    
    return color;
};

/**
 * Interpolate between two hex colors
 * @param {string} color1 - Start color (hex)
 * @param {string} color2 - End color (hex)
 * @param {number} t - Interpolation factor (0-1)
 * @returns {string} Interpolated hex color
 */
const interpolateColor = (color1, color2, t) => {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `#${[r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
};

// Helper function to generate popup content
const generatePopupContent = (agebInfo, selectedIndicator, address = null, geographicUnit = 'ageb') => {
    // Get the appropriate message based on geographic unit type
    const getUnitMessage = (unit) => {
        switch(unit) {
            case 'neighbourhood':
                return 'Selecciona una capa para ver detalles de esta colonia.';
            case 'municipality':
                return 'Selecciona una capa para ver detalles de este municipio.';
            case 'ageb':
            default:
                return 'Selecciona una capa para ver detalles de este AGEB.';
        }
    };

    // Get the appropriate address based on geographic unit type
    const getAddress = (unit, properties, geocodedAddress) => {
        if (unit === 'neighbourhood') {
            // For neighbourhood, compose address from neighbourhood_name and municipality_name properties
            const neighbourhoodName = properties.neighbourhood_name || '';
            const municipalityName = properties.municipality_name || '';
            
            if (neighbourhoodName && municipalityName) {
                return `${neighbourhoodName}, ${municipalityName}`;
            } else if (neighbourhoodName) {
                return neighbourhoodName;
            } else if (municipalityName) {
                return municipalityName;
            } else {
                return geocodedAddress || 'Dirección no disponible';
            }
        } else {
            // For other units (ageb, municipality), use the geocoded address
            return geocodedAddress;
        }
    };

    let popupContent = `
        <div class="theme-aware-popup">
            <strong>${getUnitMessage(geographicUnit)}</strong><br>
        </div>
    `;

    if (selectedIndicator) {
        const indicatorValue = agebInfo[selectedIndicator] || 0;
        const indicatorName = getIndicatorDisplayName(selectedIndicator);

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
            } else if (property.includes('airbnb_listings') && (property.includes('price') || property.includes('average'))) {
                // For price indicators, format as Mexican pesos with explicit MXN suffix
                const formattedValue = new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value);
                // Ensure MXN suffix is present
                return formattedValue.includes('MXN') ? formattedValue : `${formattedValue} MXN`;
            } else {
                // For other indicators, use regular formatting
                return value.toLocaleString();
            }
        };

        // Get the appropriate address for this geographic unit
        const displayAddress = getAddress(geographicUnit, agebInfo, address);

        popupContent = `
            <div class="theme-aware-popup">
                <div class="popup-value" style="font-size: 2em; font-weight: bold; margin-bottom: 4px;">
                    ${formatValue(indicatorValue, selectedIndicator)}
                </div>
                <div class="popup-label" style="margin-bottom: 8px;">
                    ${indicatorName}
                </div>
                ${displayAddress ? `
                    <hr class="popup-divider" style="margin: 8px 0; border: none; border-top: 1px solid var(--color-border-light);">
                    <div class="popup-address" style="font-size: 0.9em;">
                        ${displayAddress}
                    </div>
                    <div class="popup-unit-type" style="font-size: 0.7em; font-weight: bold; text-transform: uppercase; margin-top: 4px;">
                        ${geographicUnit === 'neighbourhood' ? 'COLONIA / BARRIO' : 'AGEB'}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    return popupContent;
};

function MapAdminApp({ onHelpClick, hideVerticalPanel = false, hideLoadingModal = false, hideTopNavigation = false, mapStyle = 'mapbox://styles/mapbox/light-v11' }) {
    const mapContainer = React.useRef(null);
    const map = React.useRef(null);
    const deckglRef = React.useRef(null);
    const [selectedStation, setSelectedStation] = React.useState(null);
    const [indicatorsVisible, setIndicatorsVisible] = React.useState(false);
    const [transportSystemsVisible, setTransportSystemsVisible] = React.useState(false);
    const [selectedRadius, setSelectedRadius] = React.useState(300);
    const currentRadiusRef = React.useRef(300);
    const [intersectingFeatures, setIntersectingFeatures] = React.useState([]);
    const [hoveredFeature, setHoveredFeature] = React.useState(null);
    const [selectedIndicator, setSelectedIndicator] = React.useState(null);
    const selectedIndicatorRef = React.useRef(null);
    const circleMarkerRef = React.useRef(null);
    const [markerCoordinates, setMarkerCoordinates] = React.useState(null);
    const popupRef = React.useRef(null);
    const [isMobile, setIsMobile] = React.useState(false);

    // Handle mobile detection
    React.useEffect(() => {
        const mediaQuery = window.matchMedia("only screen and (max-width: 767px)");
        const handleMediaChange = (e) => setIsMobile(e.matches);
        
        // Set initial value
        setIsMobile(mediaQuery.matches);
        
        // Add listener for changes
        if (mediaQuery.addListener) {
            mediaQuery.addListener(handleMediaChange);
        } else {
            mediaQuery.addEventListener('change', handleMediaChange);
        }
        
        // Cleanup
        return () => {
            if (mediaQuery.removeListener) {
                mediaQuery.removeListener(handleMediaChange);
            } else {
                mediaQuery.removeEventListener('change', handleMediaChange);
            }
        };
    }, []);
    
    // State for crime year selection
    const [selectedYearCrime, setSelectedYearCrime] = React.useState(2022);
    
    // Theme state
    const [currentTheme, setCurrentTheme] = React.useState('default');
    const [availableThemes, setAvailableThemes] = React.useState([]);
    
    // Check if we're on the negocios route to prevent loading indicators data
    const isNegociosRoute = window.location.pathname === '/negocios' || window.location.pathname === '/negocios/stats' || window.location.pathname === '/negocios/review';
    
    // Use the custom hook for territory data
    const { indicatorsData, indicatorsLoading, indicatorsError, downloadProgress, fetchIndicatorsData } = useTerritoryData(!isNegociosRoute);
    
    // Initialize theme system
    React.useEffect(() => {
        if (window.ThemeManager) {
            setCurrentTheme(window.ThemeManager.getCurrentTheme());
            setAvailableThemes(window.ThemeManager.getAvailableThemes());
            
            // Listen for theme changes
            const handleThemeChange = (event) => {
                setCurrentTheme(event.detail.theme);
            };
            
            window.addEventListener('themeChanged', handleThemeChange);
            
            return () => {
                window.removeEventListener('themeChanged', handleThemeChange);
            };
        }
    }, []);
    
    // Theme change handler
    const handleThemeChange = (themeName) => {
        if (window.ThemeManager) {
            window.ThemeManager.applyTheme(themeName);
        }
    };
    
    // State for floating actions component
    const [showFloatingActions, setShowFloatingActions] = React.useState(false);
    const [geocodedAddress, setGeocodedAddress] = React.useState('');
    const [isGeocoding, setIsGeocoding] = React.useState(false);
    
    // State for scope analysis
    const [scopeAnalysis, setScopeAnalysis] = React.useState(null);
    
    // State for selected geozone (AGEB, neighborhood, municipality)
    const [selectedGeozone, setSelectedGeozone] = React.useState(null);
    
    // State to track when we're clearing indicator due to section closure
    const [isClearingDueToSectionClose, setIsClearingDueToSectionClose] = React.useState(false);
    
    // Single marker reference
    const tappedMarkerRef = React.useRef(null);
    
    // Reference to LineDetailsPanel to access marker removal
    const lineDetailsPanelRef = React.useRef(null);
    
    // Reference to GeozoneDetailsPanel
    const geozoneDetailsPanelRef = React.useRef(null);
    
    // Keep ref in sync with state
    React.useEffect(() => {
        selectedIndicatorRef.current = selectedIndicator;
    }, [selectedIndicator]);
    
    // URL handling functions
    const updateURL = (geozoneId = null) => {
        const url = new URL(window.location);
        if (geozoneId) {
            url.searchParams.set('geozone', geozoneId);
        } else {
            url.searchParams.delete('geozone');
        }
        window.history.pushState({}, '', url);
    };
    
    const getGeozoneFromURL = () => {
        const url = new URL(window.location);
        return url.searchParams.get('geozone');
    };
    
    const handleGeozoneSelect = (geozone) => {

        setSelectedGeozone(geozone);
        updateURL(geozone.id || geozone.properties.cvegeo || geozone.properties.cve_ageb);
        
        // Hide all other panels
        setIndicatorsVisible(false);
        setTransportSystemsVisible(false);
        setSelectedLine(null);
        setSelectedStation(null);
        setShowFloatingActions(false);
        setScopeAnalysis(null);
        
        // Remove all analysis layers except AGEBs if they already exist
        removeAllAnalysisLayersExceptAgebs();
        
        // Display the appropriate layer based on geozone type
        if (geozone.type === 'ageb' && indicatorsData && indicatorsData.features) {
            const agebsLayerExists = map.current.getLayer('agebs-layer');
            
            // Only add AGEBs layer if it doesn't already exist
            if (!agebsLayerExists) {
                addAgebsToMap(indicatorsData, 'ageb');
                // Wait longer for the layers to be fully added
                setTimeout(() => {
                    highlightSelectedGeozone(geozone);
                }, 500);
            } else {
                // If AGEBs layer already exists, just update the source data
                const agebsSource = map.current.getSource('agebs-source');
                if (agebsSource) {
                    // Add unique IDs to features if they don't have them
                    const processedData = {
                        ...indicatorsData,
                        features: indicatorsData.features.map((feature, index) => ({
                            ...feature,
                            id: feature.id || `ageb-${index}`
                        }))
                    };
                    agebsSource.setData(processedData);
                }
                // Highlight immediately since layers already exist
                highlightSelectedGeozone(geozone);
            }
        }
        
        // Center map on the geozone using turf.center for better accuracy
        if (map.current && geozone.geometry) {
            try {
                // Use turf.center to get the centroid of the feature
                const centerPoint = turf.center(geozone);
                const center = centerPoint.geometry.coordinates;
                
                // Fly to the center with appropriate zoom
                map.current.flyTo({
                    center: center,
                    zoom: 15,
                    duration: 1000
                });
                
            } catch (error) {
                // Fallback to bounds if centroid fails
                try {
                    const bounds = new mapboxgl.LngLatBounds();
                    if (geozone.geometry.type === 'Polygon') {
                        geozone.geometry.coordinates[0].forEach(coord => {
                            bounds.extend(coord);
                        });
                    } else if (geozone.geometry.type === 'MultiPolygon') {
                        geozone.geometry.coordinates.forEach(polygon => {
                            polygon[0].forEach(coord => {
                                bounds.extend(coord);
                            });
                        });
                    }
                    
                    map.current.fitBounds(bounds, {
                        padding: { top: 50, bottom: 50, left: 50, right: 50 },
                        duration: 1000
                    });
                } catch (boundsError) {
                    console.error('Error using bounds fallback:', boundsError);
                }
            }
        }
    };
    
    const handleGeozoneClose = () => {
        setSelectedGeozone(null);
        updateURL(); // Remove geozone from URL
        
        // Show default panels
        setIndicatorsVisible(false);
        setTransportSystemsVisible(false);
        setSelectedLine(null);
        setSelectedStation(null);
        setShowFloatingActions(false);
        setScopeAnalysis(null);
        
        // Remove all analysis layers including the selected geozone highlight
        removeAllAnalysisLayers();
        
        // Remove the selected geozone highlight specifically
        if (map.current && map.current.getLayer('selected-geozone-highlight')) {
            map.current.removeLayer('selected-geozone-highlight');
        }
        if (map.current && map.current.getSource('selected-geozone-highlight')) {
            map.current.removeSource('selected-geozone-highlight');
        }
    };
    
    // Handle browser back/forward buttons
    React.useEffect(() => {
        const handlePopState = () => {
            const geozoneId = getGeozoneFromURL();
            if (!geozoneId) {
                handleGeozoneClose();
            } else {
                // Find the geozone in the indicators data
                if (indicatorsData && indicatorsData.features) {
                    const geozone = indicatorsData.features.find(feature => 
                        feature.id === geozoneId || 
                        feature.properties.cvegeo === geozoneId ||
                        feature.properties.cve_ageb === geozoneId
                    );
                    if (geozone) {
                        // Add type property to identify as AGEB
                        const geozoneWithType = {
                            ...geozone,
                            type: 'ageb'
                        };
                        // Add a small delay to ensure map is ready
                        setTimeout(() => {
                            handleGeozoneSelect(geozoneWithType);
                        }, 200);
                    }
                }
            }
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [indicatorsData]);
    
    // Initialize geozone from URL on component mount
    React.useEffect(() => {
        const geozoneId = getGeozoneFromURL();
        if (geozoneId && indicatorsData && indicatorsData.features) {
            const geozone = indicatorsData.features.find(feature => 
                feature.id === geozoneId || 
                feature.properties.cvegeo === geozoneId ||
                feature.properties.cve_ageb === geozoneId
            );
            if (geozone) {
                // Add type property to identify as AGEB
                const geozoneWithType = {
                    ...geozone,
                    type: 'ageb'
                };
                // Add a small delay to ensure map is ready
                setTimeout(() => {
                    handleGeozoneSelect(geozoneWithType);
                }, 200);
            }
        }
    }, [indicatorsData]);
    
    // Handle indicators panel visibility changes
    React.useEffect(() => {
        if (!indicatorsVisible) {
            setSelectedIndicator(null);
            // Remove intersecting polygons layer when indicators panel is dismissed
            if (map.current && map.current.getLayer('intersecting-polygons-layer')) {
                map.current.removeLayer('intersecting-polygons-layer');
            }
            if (map.current && map.current.getSource('intersecting-polygons-source')) {
                map.current.removeSource('intersecting-polygons-source');
            }
            // Clear intersecting features state
            setIntersectingFeatures([]);
        }
    }, [indicatorsVisible]);
    
    // Update intersecting polygons when selectedIndicator changes
    React.useEffect(() => {
        if (indicatorsVisible && selectedIndicator && map.current && !isClearingDueToSectionClose) {
            // Use marker coordinates if they exist, otherwise use map center
            const position = markerCoordinates || [map.current.getCenter().lng, map.current.getCenter().lat];
            const circle = turf.circle(position, currentRadiusRef.current, {
                steps: 64,
                units: 'meters'
            });

            drawIntersectingPolygons(circle);
        }
        
        // Reset the clearing flag after handling the change
        if (isClearingDueToSectionClose) {
            setIsClearingDueToSectionClose(false);
        }
    }, [selectedIndicator, indicatorsVisible, markerCoordinates, isClearingDueToSectionClose]);
        
    const [showSearchDialog, setShowSearchDialog] = React.useState(false);
    const [selectedLine, setSelectedLine] = React.useState(null);
    const [isLayerPanelCollapsed, setIsLayerPanelCollapsed] = React.useState(false);
    const [isochronasVisible, setIsochronasVisible] = React.useState(false);
    const [selectedNeighbourhood, setSelectedNeighbourhood] = React.useState(null);
    const neighbourhoodsDataRef = React.useRef(null); // Store GeoJSON data for dynamic updates
    const [selectedDay, setSelectedDay] = React.useState('01');
    const [selectedTimePeriod, setSelectedTimePeriod] = React.useState('m'); // Default to 'm' (mañana)
    const [selectedMonth, setSelectedMonth] = React.useState('2024-11'); // Current month in format 'YYYY-MM'
    const hoverPopupRef = React.useRef(null); // Ref for hover popup to ensure proper cleanup
    const selectedDayRef = React.useRef('01');
    const selectedTimePeriodRef = React.useRef('m');
    const selectedMonthRef = React.useRef('2024-11');
    const [neighbourhoodsLoading, setNeighbourhoodsLoading] = React.useState(false);
    
    // Initialize global loading state
    React.useEffect(() => {
        window.neighbourhoodsLoading = false;
    }, []);
    
    // Expose refs globally for access from closures
    React.useEffect(() => {
        window.selectedDayRef = selectedDayRef;
        window.selectedTimePeriodRef = selectedTimePeriodRef;
        window.selectedMonthRef = selectedMonthRef;
        return () => {
            delete window.selectedDayRef;
            delete window.selectedTimePeriodRef;
            delete window.selectedMonthRef;
        };
    }, []);
    
    // Listen for day, time period, and month changes
    React.useEffect(() => {
        const handleDayChange = (event) => {
            // Handle both old format (string) and new format (object with day and month)
            let newDay, newMonth;
            if (typeof event.detail === 'object' && event.detail !== null) {
                newDay = event.detail.day;
                newMonth = event.detail.month;
            } else {
                // Old format: just a day string
                newDay = event.detail;
                newMonth = selectedMonthRef.current;
            }
            
            setSelectedDay(newDay);
            selectedDayRef.current = newDay;
            
            // Update month if provided
            if (newMonth && newMonth !== selectedMonthRef.current) {
                setSelectedMonth(newMonth);
                selectedMonthRef.current = newMonth;
            }
            
            if (window.updateTouristMapColors) {
                window.updateTouristMapColors(newDay, selectedTimePeriodRef.current, selectedMonthRef.current);
            }
        };
        
        const handleTimePeriodChange = (event) => {
            const newTimePeriod = event.detail;
            setSelectedTimePeriod(newTimePeriod);
            selectedTimePeriodRef.current = newTimePeriod;
            if (window.updateTouristMapColors) {
                window.updateTouristMapColors(selectedDayRef.current, newTimePeriod, selectedMonthRef.current);
            }
        };
        
        const handleMonthChange = (event) => {
            const newMonth = event.detail;
            setSelectedMonth(newMonth);
            selectedMonthRef.current = newMonth;
            // Update map colors with new month
            if (window.updateTouristMapColors) {
                window.updateTouristMapColors(selectedDayRef.current, selectedTimePeriodRef.current, newMonth);
            }
        };
        
        const handleVisualizationStyleChange = (event) => {
            const newStyle = event.detail; // 'heatmap' or 'torres'
            if (window.switchVisualizationStyle) {
                window.switchVisualizationStyle(newStyle);
            } else {
                console.warn('MapAdminApp: switchVisualizationStyle function not available');
            }
        };
        
        window.addEventListener('touristDayChanged', handleDayChange);
        window.addEventListener('touristTimePeriodChanged', handleTimePeriodChange);
        window.addEventListener('touristMonthChanged', handleMonthChange);
        window.addEventListener('touristVisualizationStyleChanged', handleVisualizationStyleChange);
        
        return () => {
            window.removeEventListener('touristDayChanged', handleDayChange);
            window.removeEventListener('touristTimePeriodChanged', handleTimePeriodChange);
            window.removeEventListener('touristMonthChanged', handleMonthChange);
            window.removeEventListener('touristVisualizationStyleChanged', handleVisualizationStyleChange);
        };
    }, []);
    
    // Update refs when state changes
    React.useEffect(() => {
        selectedDayRef.current = selectedDay;
    }, [selectedDay]);
    
    React.useEffect(() => {
        selectedTimePeriodRef.current = selectedTimePeriod;
    }, [selectedTimePeriod]);
    
    React.useEffect(() => {
        selectedMonthRef.current = selectedMonth;
    }, [selectedMonth]);

    React.useEffect(() => {
        if (!mapContainer.current) return;

        mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';
        
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: mapStyle,
            center: [-99.1332, 19.4326],
            zoom: 11
        });

        // Expose map instance globally for other components to access
        window.map = map.current;
        
        // Initialize deck.gl overlay for better 3D performance
        // We'll initialize it after the map is fully loaded and when we have data

        return () => {
            if (map.current) {
                map.current.remove();
            }
            // Cleanup marker
            if (tappedMarkerRef.current) {
                tappedMarkerRef.current.remove();
                tappedMarkerRef.current = null;
            }
        };
    }, []);

    // Load neighbourhood data for turistas CDMX route
    React.useEffect(() => {
        const currentPath = window.location.pathname;
        const isTuristasRoute = currentPath === '/proyectos/mapas/turistas-cdmx-2024-2025';
        
        if (!isTuristasRoute) return;
        
        const loadNeighbourhoods = () => {
            if (!map.current) return;
            
            // Check if map is loaded
            if (!map.current.isStyleLoaded()) {
                map.current.once('load', loadNeighbourhoods);
                return;
            }
            
            // Remove existing neighbourhood layers if they exist
            if (map.current && map.current.getLayer('neighbourhoods-fill')) {
                map.current.removeLayer('neighbourhoods-fill');
            }
            if (map.current && map.current.getLayer('neighbourhoods-outline')) {
                map.current.removeLayer('neighbourhoods-outline');
            }
            if (map.current && map.current.getSource('neighbourhoods')) {
                map.current.removeSource('neighbourhoods');
            }
            
            // Fetch neighbourhood GeoJSON
            //fetch('/api/neighborhoods/all')
            setNeighbourhoodsLoading(true);
            window.neighbourhoodsLoading = true;
            fetch('https://distritosmexico.s3.us-east-2.amazonaws.com/projects/centrico/hoods.geojson')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data || !data.features || data.features.length === 0) {
                        return;
                    }
                    
                    // Store the data for dynamic updates
                    neighbourhoodsDataRef.current = data;
                    
                    // Function to update map colors based on selected day, time period, and month
                    const updateMapColors = (day, timePeriod, monthKey = '2024-11') => {
                        if (!neighbourhoodsDataRef.current || !map.current) return;
                        
                        const data = neighbourhoodsDataRef.current;
                        
                        // Get values for the selected day and time period
                        const values = data.features
                            .map(feature => {
                                return getTouristVisitorsValue(feature.properties, day, timePeriod, monthKey);
                            })
                            .filter(val => val !== null && val !== undefined && !isNaN(val))
                            .map(val => Number(val));
                        
                        const range = values.length > 0 
                            ? { min: Math.min(...values), max: Math.max(...values) }
                            : { min: 0, max: 0 };
                        
                        // Update color property for each feature
                        data.features.forEach(feature => {
                            const value = getTouristVisitorsValue(feature.properties, day, timePeriod, monthKey);
                            const color = getHeatmapColor(value, range.max, range.min, timePeriod);
                            feature.properties._heatmapColor = color;
                            feature.properties._heatmapValue = value !== null && value !== undefined ? value : null;
                            // Mark if feature has data for opacity control (exclude zero and undefined/null values)
                            feature.properties._hasData = value !== null && value !== undefined && !isNaN(value) && value > 0;
                        });
                        
                        // Update Mapbox source data
                        const source = map.current.getSource('neighbourhoods');
                        if (source) {
                            source.setData(data);
                        }
                        
                        // Update Mapbox barras layer if it exists (for barras visualization)
                        const barrasSource = map.current.getSource('neighbourhoods-barras-source');
                        const barrasLayer = map.current.getLayer('neighbourhoods-barras-extrusion');
                        if (barrasSource && barrasLayer && window.currentVisualizationStyle === 'barras') {
                            // Recalculate circular features with updated data
                            const centroidCache = window.neighbourhoodCentroidCache || new Map();
                            const circularFeatures = data.features
                                .filter(f => f.properties._hasData)
                                .map((feature, idx) => {
                                    const featureId = feature.id || feature.properties.id || idx;
                                    let centroid = centroidCache.get(featureId);
                                    
                                    if (!centroid) {
                                        try {
                                            if (window.turf && window.turf.center) {
                                                const centerPoint = window.turf.center(feature);
                                                centroid = centerPoint.geometry.coordinates;
                                                centroidCache.set(featureId, centroid);
                                            } else {
                                                const coords = feature.geometry.coordinates;
                                                let allCoords = [];
                                                if (feature.geometry.type === 'Polygon') {
                                                    allCoords = coords[0];
                                                } else if (feature.geometry.type === 'MultiPolygon') {
                                                    coords.forEach(polygon => {
                                                        allCoords = allCoords.concat(polygon[0]);
                                                    });
                                                }
                                                let sumLng = 0, sumLat = 0;
                                                allCoords.forEach(coord => {
                                                    sumLng += coord[0];
                                                    sumLat += coord[1];
                                                });
                                                centroid = [sumLng / allCoords.length, sumLat / allCoords.length];
                                                centroidCache.set(featureId, centroid);
                                            }
                                        } catch (error) {
                                            return null;
                                        }
                                    }
                                    
                                    const radiusInMeters = 150;
                                    let circle;
                                    
                                    if (window.turf && window.turf.circle) {
                                        const circleFeature = window.turf.circle(centroid, radiusInMeters, {
                                            steps: 16,
                                            units: 'meters'
                                        });
                                        circle = circleFeature.geometry.coordinates[0];
                                    } else {
                                        const circleCoords = [];
                                        const steps = 16;
                                        const radiusInDegrees = radiusInMeters / 111320;
                                        for (let i = 0; i <= steps; i++) {
                                            const angle = (i / steps) * 2 * Math.PI;
                                            const latOffset = radiusInDegrees * Math.sin(angle);
                                            const lngOffset = radiusInDegrees * Math.cos(angle) / Math.cos(centroid[1] * Math.PI / 180);
                                            circleCoords.push([
                                                centroid[0] + lngOffset,
                                                centroid[1] + latOffset
                                            ]);
                                        }
                                        circle = circleCoords;
                                    }
                                    
                                    return {
                                        type: 'Feature',
                                        geometry: {
                                            type: 'Polygon',
                                            coordinates: [circle]
                                        },
                                        properties: feature.properties
                                    };
                                })
                                .filter(f => f !== null);
                            
                            // Update source data
                            barrasSource.setData({
                                type: 'FeatureCollection',
                                features: circularFeatures
                            });
                            
                            // Update height based on new values
                            const values = circularFeatures
                                .map(f => f.properties._heatmapValue)
                                .filter(v => v !== null && v !== undefined && !isNaN(v))
                                .map(v => Number(v));
                            
                            const maxValue = values.length > 0 ? Math.max(...values) : 1;
                            const maxHeight = 3000;
                            
                            map.current.setPaintProperty('neighbourhoods-barras-extrusion', 'fill-extrusion-height', [
                                'case',
                                ['==', ['get', '_hasData'], true],
                                [
                                    'interpolate',
                                    ['linear'],
                                    ['get', '_heatmapValue'],
                                    0, 0,
                                    maxValue, maxHeight
                                ],
                                0
                            ]);
                            
                            // Update colors
                            map.current.setPaintProperty('neighbourhoods-barras-extrusion', 'fill-extrusion-color', [
                                'case',
                                ['has', '_heatmapColor'],
                                ['get', '_heatmapColor'],
                                'rgba(0,0,0,0)'
                            ]);
                                }
                        
                        // Update Mapbox extrusion layer if it exists (for elevaciones)
                        const extrusionLayer = map.current.getLayer('neighbourhoods-extrusion');
                        if (extrusionLayer) {
                            const maxValue = range.max > 0 ? range.max : 1;
                            const maxHeight = 1500;
                            
                            map.current.setPaintProperty('neighbourhoods-extrusion', 'fill-extrusion-height', [
                                'case',
                                ['==', ['get', '_hasData'], true],
                                [
                                    'interpolate',
                                    ['linear'],
                                    ['get', '_heatmapValue'],
                                    0, 0,
                                    maxValue, maxHeight
                                ],
                                0
                            ]);
                        }
                    };
                    
                    // Initial color update with default day ('01') and time period ('m' for mañana)
                    updateMapColors('01', 'm');
                    
                    // Store data globally for deck.gl
                    window.neighbourhoodsGeoJSON = data;
                    
                    // Helper function to convert hex/rgb color to RGB array
                    const colorToRGB = (color) => {
                        if (!color) return [0, 0, 0, 0];
                        if (typeof color === 'string' && color.startsWith('#')) {
                            const hex = color.replace('#', '');
                            return [
                                parseInt(hex.substr(0, 2), 16),
                                parseInt(hex.substr(2, 2), 16),
                                parseInt(hex.substr(4, 2), 16),
                                128 // 50% opacity
                            ];
                        } else if (typeof color === 'string' && color.startsWith('rgb')) {
                            const matches = color.match(/\d+/g);
                            if (matches && matches.length >= 3) {
                                return [
                                    parseInt(matches[0]),
                                    parseInt(matches[1]),
                                    parseInt(matches[2]),
                                    128
                                ];
                            }
                        }
                        return [0, 0, 0, 0];
                    };
                    
                    // Expose update function globally for other components
                    window.updateTouristMapColors = updateMapColors;
                    window.colorToRGB = colorToRGB;
                    
                    // Cache centroids for all polygons to optimize barras visualization
                    const centroidCache = new Map();
                    const calculateAndCacheCentroids = () => {
                        if (!data || !data.features) return;
                        
                        data.features.forEach((feature, idx) => {
                            const featureId = feature.id || feature.properties.id || idx;
                            
                            // Skip if already cached
                            if (centroidCache.has(featureId)) return;
                            
                            try {
                                let centroid;
                                if (window.turf && window.turf.center) {
                                    const centerPoint = window.turf.center(feature);
                                    centroid = centerPoint.geometry.coordinates;
                                } else {
                                    // Fallback: simple centroid calculation
                                    const coords = feature.geometry.coordinates;
                                    let allCoords = [];
                                    
                                    if (feature.geometry.type === 'Polygon') {
                                        allCoords = coords[0];
                                    } else if (feature.geometry.type === 'MultiPolygon') {
                                        coords.forEach(polygon => {
                                            allCoords = allCoords.concat(polygon[0]);
                                        });
                                    }
                                    
                                    let sumLng = 0, sumLat = 0;
                                    allCoords.forEach(coord => {
                                        sumLng += coord[0];
                                        sumLat += coord[1];
                                    });
                                    centroid = [sumLng / allCoords.length, sumLat / allCoords.length];
                                }
                                
                                centroidCache.set(featureId, centroid);
                            } catch (error) {
                                console.warn('Error calculating centroid for feature:', featureId, error);
                            }
                        });
                    };
                    
                    // Calculate and cache centroids on initial load
                    calculateAndCacheCentroids();
                    
                    // Expose centroid cache globally for use in barras visualization
                    window.neighbourhoodCentroidCache = centroidCache;
                    
                    // Function to create deck.gl layers based on visualization style
                    const createDeckGLLayers = (style, day, timePeriod, monthKey = '2024-11') => {
                        if (!deckglRef.current || !window.deck) {
                            console.warn('deck.gl not available - deckglRef:', !!deckglRef.current, 'window.deck:', !!window.deck);
                            return [];
                        }
                        
                        const data = neighbourhoodsDataRef.current;
                        if (!data || !data.features) {
                            console.warn('No neighbourhood data available for deck.gl layers');
                            return [];
                        }
                        
                        const layers = [];
                        
                        if (style === 'heatmap') {
                            // Create PolygonLayer for heatmap (flat polygons)
                            const polygonData = data.features.filter(f => f.properties._hasData);
                            
                            const polygonLayer = new window.deck.PolygonLayer({
                                id: 'neighbourhoods-heatmap',
                                data: polygonData,
                                pickable: true,
                                stroked: true,
                                filled: true,
                                wireframe: false,
                                lineWidthMinPixels: 1.5,
                                getPolygon: d => d.geometry.coordinates,
                                getFillColor: d => {
                                    const color = d.properties._heatmapColor || 'transparent';
                                    return window.colorToRGB ? window.colorToRGB(color) : [0, 0, 0, 0];
                                },
                                getLineColor: [255, 165, 0, 204], // Orange outline
                                getLineWidth: 1.5,
                                opacity: 0.5,
                                onHover: (info) => {
                                    if (info.object) {
                                        map.current.getCanvas().style.cursor = 'pointer';
                                        // Show hover tooltip
                                        const props = info.object.properties;
                                        const tooltipContent = createTooltipContent(props);
                                        if (hoverPopupRef.current) {
                                            hoverPopupRef.current.remove();
                                        }
                                        hoverPopupRef.current = new mapboxgl.Popup({
                                            closeButton: false,
                                            closeOnClick: false,
                                            anchor: 'bottom',
                                            offset: 10
                                        })
                                            .setLngLat([info.coordinate[0], info.coordinate[1]])
                                            .setHTML(tooltipContent)
                                            .addTo(map.current);
                                    } else {
                                        map.current.getCanvas().style.cursor = '';
                                        if (hoverPopupRef.current) {
                                            hoverPopupRef.current.remove();
                                            hoverPopupRef.current = null;
                                        }
                                    }
                                },
                                onClick: (info) => {
                                    if (info.object) {
                                        handleNeighbourhoodClick({
                                            features: [info.object],
                                            lngLat: { lng: info.coordinate[0], lat: info.coordinate[1] }
                                        });
                                    }
                                }
                            });
                            
                            layers.push(polygonLayer);
                            
                        } else if (style === 'elevaciones') {
                            // Create extruded PolygonLayer for elevaciones
                            const polygonData = data.features.filter(f => f.properties._hasData);
                            const values = polygonData
                                .map(f => f.properties._heatmapValue)
                                .filter(v => v !== null && v !== undefined && !isNaN(v))
                                .map(v => Number(v));
                            const maxValue = values.length > 0 ? Math.max(...values) : 1;
                            const maxHeight = 1500;
                            
                            const extrudedLayer = new window.deck.PolygonLayer({
                                id: 'neighbourhoods-elevaciones',
                                data: polygonData,
                                pickable: true,
                                stroked: true,
                                filled: true,
                                extruded: true,
                                wireframe: false,
                                lineWidthMinPixels: 1.5,
                                getPolygon: d => d.geometry.coordinates,
                                getFillColor: d => {
                                    const color = d.properties._heatmapColor || 'transparent';
                                    return window.colorToRGB ? window.colorToRGB(color) : [0, 0, 0, 0];
                                },
                                getLineColor: [255, 165, 0, 204],
                                getElevation: d => {
                                    const value = d.properties._heatmapValue || 0;
                                    return (value / maxValue) * maxHeight;
                                },
                                getLineWidth: 1.5,
                                elevationScale: 1,
                                opacity: 0.8,
                                onHover: (info) => {
                                    if (info.object) {
                                        map.current.getCanvas().style.cursor = 'pointer';
                                        const props = info.object.properties;
                                        const tooltipContent = createTooltipContent(props);
                                        if (hoverPopupRef.current) {
                                            hoverPopupRef.current.remove();
                                        }
                                        hoverPopupRef.current = new mapboxgl.Popup({
                                            closeButton: false,
                                            closeOnClick: false,
                                            anchor: 'bottom',
                                            offset: 10
                                        })
                                            .setLngLat([info.coordinate[0], info.coordinate[1]])
                                            .setHTML(tooltipContent)
                                            .addTo(map.current);
                                    } else {
                                        map.current.getCanvas().style.cursor = '';
                                        if (hoverPopupRef.current) {
                                            hoverPopupRef.current.remove();
                                            hoverPopupRef.current = null;
                                        }
                                    }
                                },
                                onClick: (info) => {
                                    if (info.object) {
                                        handleNeighbourhoodClick({
                                            features: [info.object],
                                            lngLat: { lng: info.coordinate[0], lat: info.coordinate[1] }
                                        });
                                    }
                                }
                            });
                            
                            layers.push(extrudedLayer);
                            
                        } else if (style === 'barras') {
                            // Create ColumnLayer for barras (cylinders at centroids)
                            const centroidCache = window.neighbourhoodCentroidCache || new Map();
                            const columnData = data.features
                                .filter(f => f.properties._hasData)
                                .map((feature, idx) => {
                                    const featureId = feature.id || feature.properties.id || idx;
                                    let centroid = centroidCache.get(featureId);
                                    
                                    if (!centroid) {
                                        try {
                                            if (window.turf && window.turf.center) {
                                                const centerPoint = window.turf.center(feature);
                                                centroid = centerPoint.geometry.coordinates;
                                                centroidCache.set(featureId, centroid);
                                            } else {
                                                const coords = feature.geometry.coordinates;
                                                let allCoords = [];
                                                if (feature.geometry.type === 'Polygon') {
                                                    allCoords = coords[0];
                                                } else if (feature.geometry.type === 'MultiPolygon') {
                                                    coords.forEach(polygon => {
                                                        allCoords = allCoords.concat(polygon[0]);
                                                    });
                                                }
                                                let sumLng = 0, sumLat = 0;
                                                allCoords.forEach(coord => {
                                                    sumLng += coord[0];
                                                    sumLat += coord[1];
                                                });
                                                centroid = [sumLng / allCoords.length, sumLat / allCoords.length];
                                                centroidCache.set(featureId, centroid);
                                            }
                                        } catch (error) {
                                            console.warn('Error calculating centroid:', error);
                                            return null;
                                        }
                                    }
                                    
                                    const value = feature.properties._heatmapValue || 0;
                                    const color = feature.properties._heatmapColor || '#000000';
                                    
                                    return {
                                        position: centroid,
                                        elevation: value,
                                        color: window.colorToRGB ? window.colorToRGB(color) : [0, 0, 0, 200],
                                        radius: 150,
                                        properties: feature.properties,
                                        feature: feature
                                    };
                                })
                                .filter(d => d !== null);
                            
                            if (columnData.length === 0) {
                                console.warn('No column data for barras visualization');
                                return [];
                            }
                            
                            const maxValue = Math.max(...columnData.map(d => d.elevation), 1);
                            const maxHeight = 3000;
                            
                            const columnLayer = new window.deck.ColumnLayer({
                                id: 'neighbourhoods-barras',
                                data: columnData,
                                diskResolution: 12,
                                radius: 150, // radius in meters
                                extruded: true,
                                getPosition: d => d.position,
                                getElevation: d => {
                                    const elevation = (d.elevation / maxValue) * maxHeight;
                                    return Math.max(elevation, 10); // Minimum 10 meters so cylinders are visible
                                },
                                getFillColor: d => d.color,
                                getLineColor: [0, 0, 0, 0],
                                elevationScale: 1,
                                pickable: true,
                                radiusUnits: 'meters',
                                onHover: (info) => {
                                    if (info.object) {
                                        map.current.getCanvas().style.cursor = 'pointer';
                                        const props = info.object.properties;
                                        const tooltipContent = createTooltipContent(props);
                                        if (hoverPopupRef.current) {
                                            hoverPopupRef.current.remove();
                                        }
                                        hoverPopupRef.current = new mapboxgl.Popup({
                                            closeButton: false,
                                            closeOnClick: false,
                                            anchor: 'bottom',
                                            offset: 10
                                        })
                                            .setLngLat([info.coordinate[0], info.coordinate[1]])
                                            .setHTML(tooltipContent)
                                            .addTo(map.current);
                                    } else {
                                        map.current.getCanvas().style.cursor = '';
                                        if (hoverPopupRef.current) {
                                            hoverPopupRef.current.remove();
                                            hoverPopupRef.current = null;
                                        }
                                    }
                                },
                                onClick: (info) => {
                                    if (info.object && info.object.feature) {
                                        handleNeighbourhoodClick({
                                            features: [info.object.feature],
                                            lngLat: { lng: info.coordinate[0], lat: info.coordinate[1] }
                                        });
                                    }
                                }
                            });
                            
                            layers.push(columnLayer);
                            window.barrasColumnData = columnData;
                        }
                        
                        return layers;
                    };
                    
                    // Function to switch between heatmap, elevaciones, and barras visualization
                    const switchVisualizationStyle = (style) => {
                        if (!map.current) {
                            console.warn('switchVisualizationStyle: map.current is not available');
                            return;
                        }
                        
                        // Get current day, time period, and month
                        const currentDay = (window.selectedDayRef && window.selectedDayRef.current) || '01';
                        const currentTimePeriod = (window.selectedTimePeriodRef && window.selectedTimePeriodRef.current) || 'm';
                        const currentMonth = (window.selectedMonthRef && window.selectedMonthRef.current) || '2024-11';
                        
                        if (style === 'heatmap') {
                            // Reset to 2D view for heatmap
                            map.current.easeTo({
                                pitch: 0,
                                bearing: 0,
                                duration: 1000
                            });
                            
                            // Hide extrusion layer if it exists
                            const extrusionLayer = map.current.getLayer('neighbourhoods-extrusion');
                            if (extrusionLayer) {
                                map.current.setLayoutProperty('neighbourhoods-extrusion', 'visibility', 'none');
                            }
                            
                            // Hide and remove barras layer if it exists
                            const barrasLayer = map.current.getLayer('neighbourhoods-barras-extrusion');
                            if (barrasLayer) {
                                map.current.setLayoutProperty('neighbourhoods-barras-extrusion', 'visibility', 'none');
                                // Remove event handlers
                                map.current.off('mouseenter', 'neighbourhoods-barras-extrusion');
                                map.current.off('mousemove', 'neighbourhoods-barras-extrusion');
                                map.current.off('mouseleave', 'neighbourhoods-barras-extrusion');
                                map.current.off('click', 'neighbourhoods-barras-extrusion');
                            }
                            
                            // Remove barras source
                            const barrasSource = map.current.getSource('neighbourhoods-barras-source');
                            if (barrasSource) {
                                map.current.removeSource('neighbourhoods-barras-source');
                            }
                            
                            // Remove deck.gl layers if they exist
                            if (deckglRef.current) {
                                deckglRef.current.setProps({ layers: [] });
                            }
                            
                            // Show fill layer
                            const fillLayer = map.current.getLayer('neighbourhoods-fill');
                            if (fillLayer) {
                                map.current.setLayoutProperty('neighbourhoods-fill', 'visibility', 'visible');
                            }
                            
                            window.currentVisualizationStyle = 'heatmap';
                            
                        } else if (style === 'elevaciones') {
                            // Enable 3D view with pitch for better visibility of extruded bars
                            map.current.easeTo({
                                pitch: 45,
                                bearing: 0,
                                duration: 1000
                            });
                            
                            // Hide fill layer
                            const fillLayer = map.current.getLayer('neighbourhoods-fill');
                            if (fillLayer) {
                                map.current.setLayoutProperty('neighbourhoods-fill', 'visibility', 'none');
                            }
                            
                            // Hide and remove barras layer if it exists
                            const barrasLayer = map.current.getLayer('neighbourhoods-barras-extrusion');
                            if (barrasLayer) {
                                map.current.setLayoutProperty('neighbourhoods-barras-extrusion', 'visibility', 'none');
                                // Remove event handlers
                                map.current.off('mouseenter', 'neighbourhoods-barras-extrusion');
                                map.current.off('mousemove', 'neighbourhoods-barras-extrusion');
                                map.current.off('mouseleave', 'neighbourhoods-barras-extrusion');
                                map.current.off('click', 'neighbourhoods-barras-extrusion');
                            }
                            
                            // Remove barras source
                            const barrasSource = map.current.getSource('neighbourhoods-barras-source');
                            if (barrasSource) {
                                map.current.removeSource('neighbourhoods-barras-source');
                            }
                            
                            // Remove deck.gl layers if they exist
                            if (deckglRef.current) {
                                deckglRef.current.setProps({ layers: [] });
                            }
                            
                            // Add or show extrusion layer
                            const extrusionLayer = map.current.getLayer('neighbourhoods-extrusion');
                            const source = map.current.getSource('neighbourhoods');
                            
                            if (!source) {
                                console.error('Cannot add extrusion layer: source "neighbourhoods" not found');
                                return;
                            }
                            
                            if (!extrusionLayer) {
                                // Calculate max height from current data
                                const data = neighbourhoodsDataRef.current;
                                if (data && data.features) {
                                    const values = data.features
                                        .map(f => f.properties._heatmapValue)
                                        .filter(v => v !== null && v !== undefined && !isNaN(v))
                                        .map(v => Number(v));
                                    
                                    const maxValue = values.length > 0 ? Math.max(...values) : 1;
                                    const maxHeight = 1500;
                                    
                                    try {
                                        map.current.addLayer({
                                            'id': 'neighbourhoods-extrusion',
                                            'type': 'fill-extrusion',
                                            'source': 'neighbourhoods',
                                            'paint': {
                                                'fill-extrusion-color': [
                                                    'case',
                                                    ['has', '_heatmapColor'],
                                                    ['get', '_heatmapColor'],
                                                    'rgba(0,0,0,0)'
                                                ],
                                                'fill-extrusion-height': [
                                                    'case',
                                                    ['==', ['get', '_hasData'], true],
                                                    [
                                                        'interpolate',
                                                        ['linear'],
                                                        ['get', '_heatmapValue'],
                                                        0, 0,
                                                        maxValue, maxHeight
                                                    ],
                                                    0
                                                ],
                                                'fill-extrusion-base': 0,
                                                'fill-extrusion-opacity': 0.8
                                            }
                                        }, 'neighbourhoods-outline');
                                        
                                        // Add hover handlers for extrusion layer
                                        if (window.addExtrusionHoverHandlers) {
                                            window.addExtrusionHoverHandlers();
                                        }
                                    } catch (error) {
                                        console.error('Error adding extrusion layer:', error);
                                    }
                                }
                            } else {
                                map.current.setLayoutProperty('neighbourhoods-extrusion', 'visibility', 'visible');
                            }
                            
                            window.currentVisualizationStyle = 'elevaciones';
                            
                        } else if (style === 'barras') {
                            // Enable 3D view with pitch for better visibility of extruded cylinders
                            map.current.easeTo({
                                pitch: 45,
                                bearing: 0,
                                duration: 1000
                            });
                            
                            // Hide fill and extrusion layers
                            const fillLayer = map.current.getLayer('neighbourhoods-fill');
                            if (fillLayer) {
                                map.current.setLayoutProperty('neighbourhoods-fill', 'visibility', 'none');
                            }
                            const extrusionLayer = map.current.getLayer('neighbourhoods-extrusion');
                            if (extrusionLayer) {
                                map.current.setLayoutProperty('neighbourhoods-extrusion', 'visibility', 'none');
                            }
                            
                            // Remove deck.gl layers if they exist
                            if (deckglRef.current) {
                                deckglRef.current.setProps({ layers: [] });
                            }
                            
                            // Use Mapbox fill-extrusion for barras (circular polygons at centroids)
                            const barrasLayer = map.current.getLayer('neighbourhoods-barras-extrusion');
                            const barrasSource = map.current.getSource('neighbourhoods-barras-source');
                            
                            if (!barrasLayer || !barrasSource) {
                                // Create circular polygons at centroids
                                const data = neighbourhoodsDataRef.current;
                                const centroidCache = window.neighbourhoodCentroidCache || new Map();
                                
                                if (data && data.features) {
                                    const circularFeatures = data.features
                                        .filter(f => f.properties._hasData)
                                        .map((feature, idx) => {
                                            const featureId = feature.id || feature.properties.id || idx;
                                            
                                            // Get centroid from cache
                                            let centroid = centroidCache.get(featureId);
                                            
                                            if (!centroid) {
                                                try {
                                                    if (window.turf && window.turf.center) {
                                                        const centerPoint = window.turf.center(feature);
                                                        centroid = centerPoint.geometry.coordinates;
                                                        centroidCache.set(featureId, centroid);
                                                    } else {
                                                        const coords = feature.geometry.coordinates;
                                                        let allCoords = [];
                                                        if (feature.geometry.type === 'Polygon') {
                                                            allCoords = coords[0];
                                                        } else if (feature.geometry.type === 'MultiPolygon') {
                                                            coords.forEach(polygon => {
                                                                allCoords = allCoords.concat(polygon[0]);
                                                            });
                                                        }
                                                        let sumLng = 0, sumLat = 0;
                                                        allCoords.forEach(coord => {
                                                            sumLng += coord[0];
                                                            sumLat += coord[1];
                                                        });
                                                        centroid = [sumLng / allCoords.length, sumLat / allCoords.length];
                                                        centroidCache.set(featureId, centroid);
                                                    }
                                                } catch (error) {
                                                    console.warn('Error calculating centroid:', error);
                                                    return null;
                                                }
                                            }
                                            
                                            // Create circle around centroid using turf.circle
                                            let circle;
                                            const radiusInMeters = 150;
                                            
                                            if (window.turf && window.turf.circle) {
                                                const circleFeature = window.turf.circle(centroid, radiusInMeters, {
                                                    steps: 16,
                                                    units: 'meters'
                                                });
                                                circle = circleFeature.geometry.coordinates[0];
                                            } else {
                                                // Fallback: manual circle
                                                const circleCoords = [];
                                                const steps = 16;
                                                const radiusInDegrees = radiusInMeters / 111320;
                                                
                                                for (let i = 0; i <= steps; i++) {
                                                    const angle = (i / steps) * 2 * Math.PI;
                                                    const latOffset = radiusInDegrees * Math.sin(angle);
                                                    const lngOffset = radiusInDegrees * Math.cos(angle) / Math.cos(centroid[1] * Math.PI / 180);
                                                    circleCoords.push([
                                                        centroid[0] + lngOffset,
                                                        centroid[1] + latOffset
                                                    ]);
                                                }
                                                circle = circleCoords;
                                            }
                                            
                                            return {
                                                type: 'Feature',
                                                geometry: {
                                                    type: 'Polygon',
                                                    coordinates: [circle]
                                                },
                                                properties: feature.properties
                                            };
                                        })
                                        .filter(f => f !== null);
                                    
                                    const circularData = {
                                        type: 'FeatureCollection',
                                        features: circularFeatures
                                    };
                                    
                                    // Add source
                                    if (!barrasSource) {
                                        map.current.addSource('neighbourhoods-barras-source', {
                                            type: 'geojson',
                                            data: circularData
                                        });
                                    } else {
                                        barrasSource.setData(circularData);
                                    }
                                    
                                    // Calculate max height
                                    const values = circularFeatures
                                        .map(f => f.properties._heatmapValue)
                                        .filter(v => v !== null && v !== undefined && !isNaN(v))
                                        .map(v => Number(v));
                                    
                                    const maxValue = values.length > 0 ? Math.max(...values) : 1;
                                    const maxHeight = 3000;
                                    
                                    // Add layer
                                    if (!barrasLayer) {
                                        map.current.addLayer({
                                            'id': 'neighbourhoods-barras-extrusion',
                                            'type': 'fill-extrusion',
                                            'source': 'neighbourhoods-barras-source',
                                            'minzoom': 10,
                                            'paint': {
                                                'fill-extrusion-color': [
                                                    'case',
                                                    ['has', '_heatmapColor'],
                                                    ['get', '_heatmapColor'],
                                                    'rgba(0,0,0,0)'
                                                ],
                                                'fill-extrusion-height': [
                                                    'case',
                                                    ['==', ['get', '_hasData'], true],
                                                    [
                                                        'interpolate',
                                                        ['linear'],
                                                        ['get', '_heatmapValue'],
                                                        0, 0,
                                                        maxValue, maxHeight
                                                    ],
                                                    0
                                                ],
                                                'fill-extrusion-base': 0,
                                                'fill-extrusion-opacity': 0.8
                                            }
                                        }, 'neighbourhoods-outline');
                                        
                                        // Add hover handlers
                                        map.current.on('mouseenter', 'neighbourhoods-barras-extrusion', mouseenterHandler);
                                        map.current.on('mousemove', 'neighbourhoods-barras-extrusion', mousemoveHandler);
                                        map.current.on('mouseleave', 'neighbourhoods-barras-extrusion', mouseleaveHandler);
                                        map.current.on('click', 'neighbourhoods-barras-extrusion', handleNeighbourhoodClick);
                                    }
                                }
                            } else {
                                map.current.setLayoutProperty('neighbourhoods-barras-extrusion', 'visibility', 'visible');
                            }
                            
                            window.currentVisualizationStyle = 'barras';
                        }
                    };
                    
                    // Expose switch function globally
                    window.switchVisualizationStyle = switchVisualizationStyle;
                    
                    // Expose function to get range for a specific day and time period
                    window.getTouristRange = (day, timePeriod, monthKey = '2024-11') => {
                        if (!neighbourhoodsDataRef.current) {
                            return { min: 0, max: 0 };
                        }
                        const data = neighbourhoodsDataRef.current;
                        const values = data.features
                            .map(feature => {
                                return getTouristVisitorsValue(feature.properties, day, timePeriod, monthKey);
                            })
                            .filter(val => val !== null && val !== undefined && !isNaN(val))
                            .map(val => Number(val));
                        return values.length > 0 
                            ? { min: Math.min(...values), max: Math.max(...values) }
                            : { min: 0, max: 0 };
                    };
                    
                    // Expose function to get range across all days for a time period
                    window.getTouristRangeAllDays = (timePeriod) => {
                        if (!neighbourhoodsDataRef.current) {
                            return { min: 0, max: 0 };
                        }
                        
                        // Validate timePeriod parameter
                        const validTimePeriods = ['m', 'a', 'e', 'd'];
                        if (!validTimePeriods.includes(timePeriod)) {
                            console.warn(`Invalid timePeriod passed to getTouristRangeAllDays: "${timePeriod}". Using 'm' as default.`);
                            timePeriod = 'm';
                        }
                        
                        // Get current month from ref, default to '2024-11'
                        const monthKey = (window.selectedMonthRef && window.selectedMonthRef.current) || '2024-11';
                        const data = neighbourhoodsDataRef.current;
                        const allValues = [];
                        
                        // Iterate through all features
                        data.features.forEach(feature => {
                            const props = feature.properties;
                            if (!props || !props.tourist_visitors_info) {
                                return;
                            }
                            
                            let touristInfo = props.tourist_visitors_info;
                            if (typeof touristInfo === 'string') {
                                try {
                                    touristInfo = JSON.parse(touristInfo);
                                } catch (e) {
                                    return;
                                }
                            }
                            
                            if (!touristInfo || typeof touristInfo !== 'object' || touristInfo === null) {
                                return;
                            }
                            
                            const monthData = touristInfo[monthKey];
                            if (!monthData || typeof monthData !== 'object' || monthData === null) {
                                return;
                            }
                            
                            const days = monthData.days;
                            if (!days || typeof days !== 'object' || days === null) {
                                return;
                            }
                            
                            // Get all values for this time period across all days
                            Object.keys(days).forEach(dayKey => {
                                const dayData = days[dayKey];
                                if (dayData && typeof dayData === 'object') {
                                    // Explicitly check for the timePeriod key (not 'd')
                                    if (dayData[timePeriod] !== null && dayData[timePeriod] !== undefined) {
                                        const value = Number(dayData[timePeriod]);
                                        if (!isNaN(value)) {
                                            allValues.push(value);
                                        }
                                    }
                                }
                            });
                        });
                        
                        // Calculate min and max
                        let result;
                        if (allValues.length === 0) {
                            result = { min: 0, max: 0 };
                        } else {
                            // For max, use the maximum of all values
                            const max = Math.max(...allValues);
                            
                            // For min, use the minimum value that is greater than zero
                            const nonZeroValues = allValues.filter(val => val > 0);
                            const min = nonZeroValues.length > 0 
                                ? Math.min(...nonZeroValues) 
                                : 0; // Fallback to 0 if all values are zero
                            
                            result = { min, max };
                        }
                        
                        return result;
                    };
                    
                    // Add GeoJSON source for Mapbox layers
                    if (!map.current.getSource('neighbourhoods')) {
                        map.current.addSource('neighbourhoods', {
                            'type': 'geojson',
                            'data': data
                        });
                    } else {
                        const source = map.current.getSource('neighbourhoods');
                        source.setData(data);
                    }
                    
                    // Add fill layer with data-driven color
                    if (!map.current.getLayer('neighbourhoods-fill')) {
                        map.current.addLayer({
                            'id': 'neighbourhoods-fill',
                            'type': 'fill',
                            'source': 'neighbourhoods',
                            'paint': {
                                'fill-color': [
                                    'case',
                                    ['has', '_heatmapColor'],
                                    ['get', '_heatmapColor'],
                                    'transparent'
                                ],
                                'fill-opacity': [
                                    'case',
                                    ['has', '_heatmapColor'],
                                    0.5,
                                    0
                                ]
                            }
                        });
                    }
                    
                    // Add outline layer
                    if (!map.current.getLayer('neighbourhoods-outline')) {
                        map.current.addLayer({
                            'id': 'neighbourhoods-outline',
                            'type': 'line',
                            'source': 'neighbourhoods',
                            'paint': {
                                'line-color': '#FFA500',
                                'line-width': 1.5,
                                'line-opacity': 0.8
                            }
                        });
                    }
                    
                    // Add hover source
                    if (!map.current.getSource('neighbourhoods-hover-source')) {
                        map.current.addSource('neighbourhoods-hover-source', {
                            type: 'geojson',
                            data: {
                                type: 'FeatureCollection',
                                features: []
                            }
                        });
                    }
                    
                    // Add hover layer
                    if (!map.current.getLayer('neighbourhoods-hover-layer')) {
                        map.current.addLayer({
                            'id': 'neighbourhoods-hover-layer',
                            'type': 'fill',
                            'source': 'neighbourhoods-hover-source',
                            'paint': {
                                'fill-color': '#000000',
                                'fill-opacity': 0.2,
                                'fill-outline-color': 'transparent'
                            }
                        }, 'neighbourhoods-outline');
                    }
                    
                    // Expose createDeckGLLayers globally for updates (for barras only)
                    window.createDeckGLLayers = createDeckGLLayers;
                    
                    // Set default visualization style
                    window.currentVisualizationStyle = 'heatmap';
                    
                    // Fit map to bounds of all features
                    const bounds = new mapboxgl.LngLatBounds();
                    data.features.forEach(feature => {
                        if (feature.geometry && feature.geometry.coordinates) {
                            if (feature.geometry.type === 'Polygon') {
                                feature.geometry.coordinates[0].forEach(coord => {
                                    bounds.extend(coord);
                                });
                            } else if (feature.geometry.type === 'MultiPolygon') {
                                feature.geometry.coordinates.forEach(polygon => {
                                    polygon[0].forEach(coord => {
                                        bounds.extend(coord);
                                    });
                                });
                            }
                        }
                    });
                    
                    if (!bounds.isEmpty()) {
                        map.current.fitBounds(bounds, {
                            padding: 50,
                            maxZoom: 12
                        });
                    }
                    
                    // Add click event to show popup and set selected neighbourhood (works for both fill and extrusion)
                    const handleNeighbourhoodClick = (e) => {
                        const clickedFeature = e.features[0];
                        const props = clickedFeature.properties;
                        
                        // Get the full feature from the source to ensure we have all properties
                        const source = map.current.getSource('neighbourhoods');
                        let fullFeature = clickedFeature;
                        
                        if (source && source._data && source._data.features) {
                            // Find the full feature by ID
                            const featureId = clickedFeature.id || props.id;
                            const foundFeature = source._data.features.find(f => 
                                (f.id === featureId) || 
                                (f.properties && (f.properties.id === featureId || f.properties.id === props.id))
                            );
                            if (foundFeature) {
                                fullFeature = foundFeature;
                            }
                        }
                        
                        // Set selected neighbourhood for the tourist viewer panel
                        setSelectedNeighbourhood(fullFeature);
                        // Also expose globally for other components
                        window.selectedNeighbourhood = fullFeature;
                        // Trigger custom event for components listening
                        window.dispatchEvent(new CustomEvent('neighbourhoodSelected', { detail: fullFeature }));
                        
                        // No popup on click - only hover tooltip is shown
                    };
                    
                    // Add click handlers for both fill and extrusion layers
                    map.current.on('click', 'neighbourhoods-fill', handleNeighbourhoodClick);
                    
                    // Helper function to remove hover popup
                    const removeHoverPopup = () => {
                        if (hoverPopupRef.current) {
                            try {
                                hoverPopupRef.current.remove();
                            } catch (e) {
                                // Popup might already be removed
                            }
                            hoverPopupRef.current = null;
                        }
                    };
                    
                    // Helper function to create tooltip content
                    // This function needs to access the current day
                    // We'll create it as a closure that can access the refs
                    const createTooltipContent = (() => {
                        // Return a function that accesses refs from closure
                        return (props) => {
                            // Get current selected day and month from refs
                            const currentDay = (window.selectedDayRef && window.selectedDayRef.current) || '01';
                            const monthKey = (window.selectedMonthRef && window.selectedMonthRef.current) || '2024-11';
                            
                            // Get values for all three time periods
                            const morningValue = getTouristVisitorsValue(props, currentDay, 'm', monthKey);
                            const afternoonValue = getTouristVisitorsValue(props, currentDay, 'a', monthKey);
                            const eveningValue = getTouristVisitorsValue(props, currentDay, 'e', monthKey);
                            
                            // Format helper function
                            const formatValue = (value) => {
                                return value !== null && value !== undefined 
                                    ? value.toLocaleString('es-MX', { maximumFractionDigits: 0 })
                                    : 'N/A';
                            };
                            
                            return `
                                <div style="padding: 10px;">
                                    <div style="font-weight: bold; font-size: 14px; color: #333; margin-bottom: 4px;">
                                        ${props.neighbourhood_name || 'Colonia'}
                                    </div>
                                    <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                                        ${props.municipality_name || 'N/A'}
                                    </div>
                                    
                                    <!-- Divider -->
                                    <div style="height: 1px; background-color: #e0e0e0; margin: 8px 0;"></div>
                                    
                                    <!-- Pings table -->
                                    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                                        <tbody>
                                            <tr>
                                                <td style="padding: 4px 8px 4px 0; font-size: 12px; color: #666; text-align: left;">
                                                    Pings (Mañana):
                                                </td>
                                                <td style="padding: 4px 0; font-size: 12px; color: #333; font-weight: 600; text-align: right;">
                                                    ${formatValue(morningValue)}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 4px 8px 4px 0; font-size: 12px; color: #666; text-align: left;">
                                                    Pings (Tarde):
                                                </td>
                                                <td style="padding: 4px 0; font-size: 12px; color: #333; font-weight: 600; text-align: right;">
                                                    ${formatValue(afternoonValue)}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 4px 8px 4px 0; font-size: 12px; color: #666; text-align: left;">
                                                    Pings (Noche):
                                                </td>
                                                <td style="padding: 4px 0; font-size: 12px; color: #333; font-weight: 600; text-align: right;">
                                                    ${formatValue(eveningValue)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            `;
                        };
                    })();
                    
                    // Hover tooltip to show neighbourhood name, municipality, and pings
                    const mouseenterHandler = (e) => {
                        map.current.getCanvas().style.cursor = 'pointer';
                        
                        const feature = e.features[0];
                        const props = feature.properties;
                        
                        // Add hovered feature to hover layer to darken it
                        const hoverSource = map.current.getSource('neighbourhoods-hover-source');
                        if (hoverSource) {
                            hoverSource.setData({
                                type: 'FeatureCollection',
                                features: [feature]
                            });
                        }
                        
                        // Remove existing hover popup if any
                        removeHoverPopup();
                        
                        // Create tooltip content with neighbourhood name, municipality, and pings
                        const tooltipContent = createTooltipContent(props);
                        
                        // Create and show popup
                        hoverPopupRef.current = new mapboxgl.Popup({
                            closeButton: false,
                            closeOnClick: false,
                            anchor: 'bottom',
                            offset: 10
                        })
                            .setLngLat(e.lngLat)
                            .setHTML(tooltipContent)
                            .addTo(map.current);
                    };
                    
                    // Update popup position and content on mousemove (when moving between polygons)
                    const mousemoveHandler = (e) => {
                        if (e.features && e.features.length > 0) {
                            const feature = e.features[0];
                            const props = feature.properties;
                            
                            // Update hover layer with current feature
                            const hoverSource = map.current.getSource('neighbourhoods-hover-source');
                            if (hoverSource) {
                                hoverSource.setData({
                                    type: 'FeatureCollection',
                                    features: [feature]
                                });
                            }
                            
                            // Update both position and content
                            if (hoverPopupRef.current) {
                                const tooltipContent = createTooltipContent(props);
                                hoverPopupRef.current
                                    .setLngLat(e.lngLat)
                                    .setHTML(tooltipContent);
                            }
                        }
                    };
                    
                    const mouseleaveHandler = () => {
                        map.current.getCanvas().style.cursor = '';
                        removeHoverPopup();
                        
                        // Clear hover layer
                        const hoverSource = map.current.getSource('neighbourhoods-hover-source');
                        if (hoverSource) {
                            hoverSource.setData({
                                type: 'FeatureCollection',
                                features: []
                            });
                        }
                    };
                    
                    // Clean up popup on map move/zoom to prevent stuck popups
                    const cleanupOnMapMove = () => {
                        removeHoverPopup();
                        
                        // Clear hover layer
                        const hoverSource = map.current.getSource('neighbourhoods-hover-source');
                        if (hoverSource) {
                            hoverSource.setData({
                                type: 'FeatureCollection',
                                features: []
                            });
                        }
                    };
                    
                    // Add hover handlers for fill layer
                    map.current.on('mouseenter', 'neighbourhoods-fill', mouseenterHandler);
                    map.current.on('mousemove', 'neighbourhoods-fill', mousemoveHandler);
                    map.current.on('mouseleave', 'neighbourhoods-fill', mouseleaveHandler);
                    map.current.on('click', 'neighbourhoods-fill', handleNeighbourhoodClick);
                    
                    // Add hover handlers for extrusion layer (will be added when elevaciones is selected)
                    const addExtrusionHoverHandlers = () => {
                        if (map.current.getLayer('neighbourhoods-extrusion')) {
                            map.current.on('mouseenter', 'neighbourhoods-extrusion', mouseenterHandler);
                            map.current.on('mousemove', 'neighbourhoods-extrusion', mousemoveHandler);
                            map.current.on('mouseleave', 'neighbourhoods-extrusion', mouseleaveHandler);
                            map.current.on('click', 'neighbourhoods-extrusion', handleNeighbourhoodClick);
                        }
                    };
                    window.addExtrusionHoverHandlers = addExtrusionHoverHandlers;
                    
                    map.current.on('move', cleanupOnMapMove);
                    map.current.on('zoom', cleanupOnMapMove);
                    
                    // Store handlers for cleanup
                    map.current._neighbourhoodHoverHandlers = {
                        mouseenter: mouseenterHandler,
                        mousemove: mousemoveHandler,
                        mouseleave: mouseleaveHandler,
                        move: cleanupOnMapMove,
                        zoom: cleanupOnMapMove,
                        removeHoverPopup: removeHoverPopup
                    };
                    
                    setNeighbourhoodsLoading(false);
                    window.neighbourhoodsLoading = false;
                })
                .catch(error => {
                    console.error('Error loading neighbourhoods:', error);
                    setNeighbourhoodsLoading(false);
                    window.neighbourhoodsLoading = false;
                });
        };
        
        // Wait for map to be ready
        if (map.current && map.current.isStyleLoaded()) {
            loadNeighbourhoods();
        } else if (map.current) {
            map.current.once('load', loadNeighbourhoods);
        }
        
        // Cleanup function
        return () => {
            // map.current.style is undefined once the map itself has been
            // removed (the map-init effect's cleanup runs first on unmount)
            if (map.current && map.current.style) {
                // Remove hover popup
                if (hoverPopupRef.current) {
                    try {
                        hoverPopupRef.current.remove();
                    } catch (e) {
                        // Popup might already be removed
                    }
                    hoverPopupRef.current = null;
                }
                
                // Remove event listeners
                map.current.off('click', 'neighbourhoods-fill');
                
                // Remove hover handlers if they exist
                if (map.current._neighbourhoodHoverHandlers) {
                    const handlers = map.current._neighbourhoodHoverHandlers;
                    map.current.off('mouseenter', 'neighbourhoods-fill', handlers.mouseenter);
                    map.current.off('mousemove', 'neighbourhoods-fill', handlers.mousemove);
                    map.current.off('mouseleave', 'neighbourhoods-fill', handlers.mouseleave);
                    map.current.off('move', handlers.move);
                    map.current.off('zoom', handlers.zoom);
                    delete map.current._neighbourhoodHoverHandlers;
                } else {
                    // Fallback: remove without specific handlers
                    map.current.off('mouseenter', 'neighbourhoods-fill');
                    map.current.off('mousemove', 'neighbourhoods-fill');
                    map.current.off('mouseleave', 'neighbourhoods-fill');
                }
                
                // Remove layers and source
                if (map.current.getLayer('neighbourhoods-hover-layer')) {
                    map.current.removeLayer('neighbourhoods-hover-layer');
                }
                if (map.current.getLayer('neighbourhoods-fill')) {
                    map.current.removeLayer('neighbourhoods-fill');
                }
                if (map.current.getLayer('neighbourhoods-outline')) {
                    map.current.removeLayer('neighbourhoods-outline');
                }
                if (map.current.getSource('neighbourhoods-hover-source')) {
                    map.current.removeSource('neighbourhoods-hover-source');
                }
                if (map.current.getSource('neighbourhoods')) {
                    map.current.removeSource('neighbourhoods');
                }
            }
        };
    }, []);

    // Despojo points for the despojos-viviendas route.
    // Two layers over one source: a faint ghost of the whole decade for
    // context, and a solid layer filtered to the year the player is on.
    React.useEffect(() => {
        const isDespojosRoute = window.location.pathname === '/proyectos/mapas/despojos-viviendas';
        if (!isDespojosRoute) return;

        const GHOST_LAYER = 'despojos-ghost';
        const ACTIVE_LAYER = 'despojos-active';
        const SOURCE = 'despojos-source';

        let popup = null;
        let cancelled = false;
        // The year the map is currently on. The player can emit one before the
        // GeoJSON has landed, so it is remembered here and applied as soon as
        // the layer exists — and read back by the choropleth and the tooltips.
        let currentYear = null;
        // Every carpeta, kept for the "cerca de mí" search: the whole decade is
        // already in the browser, so a radius query never touches the server.
        let despojoFeatures = [];

        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        const formatDespojoDate = (dateStr, timeStr) => {
            if (!dateStr) return 'Fecha no registrada';
            const [year, month, day] = dateStr.split('-').map(Number);
            const monthName = monthNames[month - 1];
            if (!monthName) return `${dateStr} ${timeStr || ''}`.trim();
            return `${day} de ${monthName} de ${year}${timeStr ? ` · ${timeStr} h` : ''}`;
        };

        const DESPOJO_ICONS = {
            case: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.6V21h13V9.6"/><path d="M10 21v-6h4v6"/></svg>',
            date: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
            place: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s7-6.4 7-11.5a7 7 0 1 0-14 0c0 5.1 7 11.5 7 11.5Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
            street: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3"/><path d="M8.5 21v-6.5a3.5 3.5 0 0 1 7 0V21"/><path d="M3 21h18"/></svg>'
        };

        // The FGJ export publishes coordinates but no address, so the street is
        // resolved on demand when a point is opened. One lookup per location,
        // memoised: the same carpeta can be reopened many times while scrubbing.
        const addressCache = new Map();

        const reverseGeocode = (lng, lat) => {
            const key = `${lng},${lat}`;
            if (addressCache.has(key)) return Promise.resolve(addressCache.get(key));

            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
                `?access_token=${mapboxgl.accessToken}&types=address,neighborhood&language=es&limit=1`;

            return fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    const hit = data.features && data.features[0];
                    if (!hit) {
                        addressCache.set(key, null);
                        return null;
                    }
                    // place_name trails city, state and country on every result;
                    // street plus colonia is what actually locates a point.
                    const street = [hit.text_es || hit.text, hit.address].filter(Boolean).join(' ');
                    const context = hit.context || [];
                    const fromContext = (prefix) => {
                        const item = context.find(c => c.id.startsWith(prefix));
                        return item ? (item.text_es || item.text) : null;
                    };
                    const colonia = fromContext('neighborhood') || fromContext('locality');
                    const label = [street, colonia].filter(Boolean).join(', ')
                        || hit.place_name_es || hit.place_name || null;
                    addressCache.set(key, label);
                    return label;
                })
                .catch(error => {
                    // A failed lookup is not cached: it is usually a transient
                    // network hiccup and the next click should try again.
                    console.warn('Reverse geocoding failed for despojo point:', error);
                    return null;
                });
        };

        // Street View opens in Google's own tab rather than on this page: the
        // Maps Platform terms forbid showing its imagery beside a non-Google
        // map, and their panorama UI carries the capture-history control, which
        // is the comparison a reader wants anyway. No key, no quota.
        const streetViewUrl = (lng, lat) =>
            'https://www.google.com/maps/@?api=1&map_action=pano' +
            `&viewpoint=${lat.toFixed(6)},${lng.toFixed(6)}&pitch=0`;

        const despojoPopupHTML = (props, coordinates) => `
            <div class="despojo-popup-card">
                <div class="despojo-popup-head">
                    <span class="despojo-popup-icon" aria-hidden="true">${DESPOJO_ICONS.case}</span>
                    <div>
                        <div class="despojo-popup-title">Despojo</div>
                        <div class="despojo-popup-kicker">Carpeta de investigación · FGJ</div>
                    </div>
                </div>
                <div class="despojo-popup-rows">
                    <div class="despojo-popup-row">
                        <span class="despojo-popup-rowicon" aria-hidden="true">${DESPOJO_ICONS.date}</span>
                        <span>${formatDespojoDate(props.date, props.time)}</span>
                    </div>
                    <div class="despojo-popup-row">
                        <span class="despojo-popup-rowicon" aria-hidden="true">${DESPOJO_ICONS.place}</span>
                        <span class="despojo-popup-address is-loading">Buscando dirección…</span>
                    </div>
                </div>
                <a class="despojo-popup-street"
                   href="${streetViewUrl(coordinates[0], coordinates[1])}"
                   target="_blank" rel="noopener noreferrer">
                    ${DESPOJO_ICONS.street}
                    Ver la calle en Street View
                    <span class="despojo-popup-street-out" aria-hidden="true">↗</span>
                </a>
                <div class="despojo-popup-foot">Ubicación aproximada del hecho</div>
            </div>
        `;

        const applyYear = (year) => {
            currentYear = year;
            if (!map.current || !map.current.getLayer(ACTIVE_LAYER)) return;
            if (year === null || year === undefined || year === 'all') {
                map.current.setFilter(ACTIVE_LAYER, null);
            } else {
                map.current.setFilter(ACTIVE_LAYER, ['==', ['get', 'year'], Number(year)]);
            }
        };

        // ---- alcaldía choropleth ----------------------------------------
        // The second reading of the same year: carpetas grouped into the 16
        // alcaldías. Polygons are a static dissolve of the AGEB layer (see the
        // despojos_build_boroughs command); the counts come from the same
        // endpoint the panel reads, so both agree on the class breaks.
        const BOROUGH_SOURCE = 'despojos-boroughs-source';
        const BOROUGH_FILL = 'despojos-boroughs-fill';
        const BOROUGH_LINE = 'despojos-boroughs-line';
        const BOROUGH_PICKED = 'despojos-boroughs-picked';
        const BOROUGH_LABEL = 'despojos-boroughs-label';
        const RAMP = window.DESPOJO_RAMP || ['#ffefef', '#eeb9b8', '#d58586', '#b85257', '#98122b'];
        const RAMP_EMPTY = window.DESPOJO_RAMP_EMPTY || '#dfe1dc';

        let boroughData = null;
        let boroughView = 'points';
        let boroughMeasure = 'absolute';
        let boroughSelected = null;
        let boroughPopup = null;

        const boroughValue = (year, code) => {
            if (!boroughData) return 0;
            const count = ((boroughData.byYear || {})[year] || {})[code] || 0;
            if (boroughMeasure !== 'rate') return count;
            const borough = (boroughData.boroughs || []).find(b => b.code === code);
            return borough && borough.population ? (count / borough.population) * 100000 : 0;
        };

        // Which class of the ramp a borough lands in, or -1 for a year with no
        // carpetas at all — that one gets the neutral, off the ramp.
        const boroughClass = (year, code) => {
            const count = ((boroughData.byYear || {})[year] || {})[code] || 0;
            if (!count) return -1;
            const breaks = ((boroughData.breaks || {})[boroughMeasure]) || [];
            const value = boroughValue(year, code);
            for (let i = 0; i < breaks.length; i++) {
                if (value <= breaks[i]) return i;
            }
            return breaks.length;
        };

        const boroughColor = (year, code) => {
            const index = boroughClass(year, code);
            return index === -1 ? RAMP_EMPTY : RAMP[index];
        };

        // The number printed on the polygon, in whichever measure is painted.
        // Same rounding as the panel's ranking, so the map and the list never
        // disagree about what a borough is worth.
        const boroughLabel = (year, code) => {
            const value = boroughValue(year, code);
            return boroughMeasure === 'rate'
                ? value.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                : Math.round(value).toLocaleString('es-MX');
        };

        const paintBoroughs = () => {
            if (!map.current || !boroughData || !map.current.getLayer(BOROUGH_FILL)) return;
            const year = currentYear;
            // One match expression per repaint rather than feature-state: sixteen
            // features is nothing, and this keeps the colour rule inspectable.
            const expression = ['match', ['get', 'cve_mun']];
            (boroughData.boroughs || []).forEach(borough => {
                expression.push(borough.code, boroughColor(year, borough.code));
            });
            expression.push(RAMP_EMPTY);
            map.current.setPaintProperty(BOROUGH_FILL, 'fill-color', expression);

            if (!map.current.getLayer(BOROUGH_LABEL)) return;
            // The number is worth nothing if it cannot be read off its own fill,
            // and the fill runs from near-white to the seal. So the type flips
            // with the class: ink over the pale end, white over the dark one,
            // each with the opposite as a halo.
            const text = ['match', ['get', 'cve_mun']];
            const color = ['match', ['get', 'cve_mun']];
            const halo = ['match', ['get', 'cve_mun']];
            (boroughData.boroughs || []).forEach(borough => {
                const onDark = boroughClass(year, borough.code) >= 3;
                text.push(borough.code, boroughLabel(year, borough.code));
                color.push(borough.code, onDark ? '#ffffff' : '#1a2027');
                halo.push(borough.code, onDark ? 'rgba(74,6,18,.5)' : 'rgba(255,255,255,.92)');
            });
            // A polygon the matrix has never heard of says nothing rather than
            // printing a zero it cannot stand behind.
            text.push('');
            color.push('#1a2027');
            halo.push('rgba(255,255,255,.92)');
            map.current.setLayoutProperty(BOROUGH_LABEL, 'text-field', text);
            map.current.setPaintProperty(BOROUGH_LABEL, 'text-color', color);
            map.current.setPaintProperty(BOROUGH_LABEL, 'text-halo-color', halo);
        };

        const applyBoroughView = () => {
            if (!map.current) return;
            const showing = boroughView === 'boroughs';
            [BOROUGH_FILL, BOROUGH_LINE, BOROUGH_PICKED, BOROUGH_LABEL].forEach(id => {
                if (map.current.getLayer(id)) {
                    map.current.setLayoutProperty(id, 'visibility', showing ? 'visible' : 'none');
                }
            });
            // The points and the polygons load from two independent fetches, so
            // whichever lands second sits on top. The numbers have to outrank
            // both of them, and asking for that here costs nothing and does not
            // depend on who won the race.
            if (showing && map.current.getLayer(BOROUGH_LABEL)) {
                map.current.moveLayer(BOROUGH_LABEL);
            }
            // The points stay underneath instead of being removed: they give the
            // fill texture, they remind the reader the source data is punctual,
            // and coming back to them is instant.
            if (map.current.getLayer(ACTIVE_LAYER)) {
                // Faint enough to read as texture over the fill, not as a second
                // layer of data competing with it.
                map.current.setPaintProperty(ACTIVE_LAYER, 'circle-opacity', showing ? 0.12 : 0.85);
                map.current.setPaintProperty(ACTIVE_LAYER, 'circle-stroke-width', showing ? 0 : 1);
            }
            if (map.current.getLayer(GHOST_LAYER)) {
                map.current.setPaintProperty(GHOST_LAYER, 'circle-opacity', showing ? 0.04 : 0.18);
            }
            if (!showing && boroughPopup) { boroughPopup.remove(); boroughPopup = null; }
        };

        const applyBoroughSelection = () => {
            if (!map.current || !map.current.getLayer(BOROUGH_PICKED)) return;
            map.current.setFilter(BOROUGH_PICKED, ['==', ['get', 'cve_mun'], boroughSelected || '—']);
        };

        // ---- "cerca de mí": a point, a radius, a set of years ------------
        const NEAR_SOURCE = 'despojos-near-source';
        const NEAR_FILL = 'despojos-near-fill';
        const NEAR_LINE = 'despojos-near-line';

        let nearState = { active: false, point: null, radius: 500, years: [], origin: null };
        let nearMarker = null;
        let nearFrame = null;

        // Equirectangular approximation. Over a couple of kilometres at this
        // latitude it is within a metre of the great-circle distance, and it
        // runs over 34,000 features on every drag frame without breaking a sweat.
        const metresBetween = (lng1, lat1, lng2, lat2) => {
            const rad = Math.PI / 180;
            const x = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * rad);
            const y = lat2 - lat1;
            return Math.sqrt(x * x + y * y) * 6371000 * rad;
        };

        const nearCircle = () => {
            if (!nearState.point || !window.turf) return null;
            return turf.circle(
                [nearState.point.lng, nearState.point.lat],
                nearState.radius / 1000,
                { steps: 64, units: 'kilometers' }
            );
        };

        const computeNearResults = () => {
            if (!nearState.point) return;
            const { lng, lat } = nearState.point;
            const years = nearState.years || [];
            const byYear = {};
            const inside = [];

            despojoFeatures.forEach(feature => {
                const [flng, flat] = feature.geometry.coordinates;
                const distance = metresBetween(lng, lat, flng, flat);
                if (distance > nearState.radius) return;
                const year = feature.properties.year;
                byYear[year] = (byYear[year] || 0) + 1;
                // The year filter narrows the count and the list, but not the
                // per-year tally: it is what tells the reader what turning a
                // year back on would add.
                if (years.length && years.indexOf(year) === -1) return;
                inside.push({
                    id: feature.properties.id,
                    year: year,
                    date: feature.properties.date,
                    time: feature.properties.time,
                    lng: flng,
                    lat: flat,
                    distance: Math.round(distance)
                });
            });

            inside.sort((a, b) => a.distance - b.distance);

            window.dispatchEvent(new CustomEvent('despojoNearResults', {
                detail: {
                    total: inside.length,
                    byYear: byYear,
                    cases: inside.slice(0, 5),
                    point: nearState.point
                }
            }));
        };

        const applyNear = () => {
            if (!map.current || !map.current.getLayer(ACTIVE_LAYER)) return;

            if (!nearState.active) {
                if (nearMarker) { nearMarker.remove(); nearMarker = null; }
                [NEAR_LINE, NEAR_FILL].forEach(id => {
                    if (map.current.getLayer(id)) map.current.removeLayer(id);
                });
                if (map.current.getSource(NEAR_SOURCE)) map.current.removeSource(NEAR_SOURCE);
                map.current.getCanvas().style.cursor = '';
                // Put back everything the near view hid.
                [GHOST_LAYER, BOROUGH_FILL, BOROUGH_LINE, BOROUGH_PICKED].forEach(id => {
                    if (map.current.getLayer(id)) {
                        map.current.setLayoutProperty(id, 'visibility', 'visible');
                    }
                });
                applyYear(currentYear);
                applyBoroughView();
                return;
            }

            // In the near view the question is "what happened around this
            // point", so the city-wide layers come off entirely rather than
            // being dimmed — only what falls inside the radius is drawn.
            [GHOST_LAYER, BOROUGH_FILL, BOROUGH_LINE, BOROUGH_PICKED].forEach(id => {
                if (map.current.getLayer(id)) {
                    map.current.setLayoutProperty(id, 'visibility', 'none');
                }
            });

            // Without a point yet the map is only waiting for a click, and there
            // is no radius to be inside of — so nothing is shown.
            map.current.getCanvas().style.cursor = 'crosshair';
            if (!nearState.point) {
                map.current.setFilter(ACTIVE_LAYER, ['==', ['get', 'id'], -1]);
                return;
            }

            const circle = nearCircle();
            if (!circle) return;

            if (map.current.getSource(NEAR_SOURCE)) {
                map.current.getSource(NEAR_SOURCE).setData(circle);
            } else {
                map.current.addSource(NEAR_SOURCE, { type: 'geojson', data: circle });
                const beforeId = map.current.getLayer(GHOST_LAYER) ? GHOST_LAYER : undefined;
                map.current.addLayer({
                    id: NEAR_FILL,
                    type: 'fill',
                    source: NEAR_SOURCE,
                    paint: { 'fill-color': '#98122b', 'fill-opacity': 0.08 }
                }, beforeId);
                map.current.addLayer({
                    id: NEAR_LINE,
                    type: 'line',
                    source: NEAR_SOURCE,
                    paint: { 'line-color': '#98122b', 'line-width': 1.5, 'line-opacity': 0.55 }
                }, beforeId);
            }

            if (!nearMarker) {
                nearMarker = new mapboxgl.Marker({ color: '#98122b', draggable: true })
                    .setLngLat([nearState.point.lng, nearState.point.lat])
                    .addTo(map.current);
                nearMarker.on('drag', () => {
                    const position = nearMarker.getLngLat();
                    nearState.point = { lng: position.lng, lat: position.lat };
                    // One recompute per frame while dragging, not one per pixel.
                    if (nearFrame) cancelAnimationFrame(nearFrame);
                    nearFrame = requestAnimationFrame(() => {
                        applyNear();
                        window.dispatchEvent(new CustomEvent('despojoNearPointPicked', {
                            detail: { lng: position.lng, lat: position.lat, origin: 'map' }
                        }));
                    });
                });
            } else {
                nearMarker.setLngLat([nearState.point.lng, nearState.point.lat]);
            }

            // Inside the circle and inside the chosen years reads as the active
            // layer; everything else falls back to the decade's ghost.
            const filter = ['all', ['within', circle]];
            if (nearState.years && nearState.years.length) {
                filter.push(['in', ['get', 'year'], ['literal', nearState.years]]);
            }
            map.current.setFilter(ACTIVE_LAYER, filter);
            map.current.setPaintProperty(ACTIVE_LAYER, 'circle-opacity', 0.9);
            map.current.setPaintProperty(ACTIVE_LAYER, 'circle-stroke-width', 1);

            computeNearResults();

            // A point the reader chose from the search box or from geolocation is
            // somewhere they cannot see yet; one they dropped by hand already is.
            if (nearState.origin && nearState.origin !== 'map') {
                map.current.easeTo({
                    center: [nearState.point.lng, nearState.point.lat],
                    zoom: Math.max(map.current.getZoom(), 14),
                    duration: 900
                });
                nearState.origin = 'map';
            }
        };

        const loadBoroughs = () => {
            if (!map.current || cancelled) return;
            if (!map.current.isStyleLoaded()) {
                map.current.once('load', loadBoroughs);
                return;
            }

            Promise.all([
                fetch('/static/data/cdmx-alcaldias.geojson').then(r => r.json()),
                fetch('/api/despojos/by-borough').then(r => r.json())
            ])
                .then(([geojson, matrix]) => {
                    if (cancelled || !map.current || map.current.getSource(BOROUGH_SOURCE)) return;
                    boroughData = matrix;

                    map.current.addSource(BOROUGH_SOURCE, { type: 'geojson', data: geojson });

                    // Underneath the points, which are the finer-grained reading.
                    const beforeId = map.current.getLayer(GHOST_LAYER) ? GHOST_LAYER : undefined;

                    map.current.addLayer({
                        id: BOROUGH_FILL,
                        type: 'fill',
                        source: BOROUGH_SOURCE,
                        layout: { visibility: 'none' },
                        paint: { 'fill-color': RAMP_EMPTY, 'fill-opacity': 0.78 }
                    }, beforeId);

                    map.current.addLayer({
                        id: BOROUGH_LINE,
                        type: 'line',
                        source: BOROUGH_SOURCE,
                        layout: { visibility: 'none' },
                        paint: { 'line-color': '#ffffff', 'line-width': 1, 'line-opacity': 0.85 }
                    }, beforeId);

                    map.current.addLayer({
                        id: BOROUGH_PICKED,
                        type: 'line',
                        source: BOROUGH_SOURCE,
                        layout: { visibility: 'none' },
                        filter: ['==', ['get', 'cve_mun'], '—'],
                        paint: { 'line-color': '#1a2027', 'line-width': 2.4 }
                    }, beforeId);

                    // The value, printed on the polygon. Deliberately NOT placed
                    // under the collision engine: a choropleth whose labels drop
                    // out where the polygons crowd stops answering the question
                    // exactly where it is asked — the centre of the city, where
                    // the four smallest alcaldías meet. Every borough states its
                    // number at every zoom, and the halo does the separating.
                    map.current.addLayer({
                        id: BOROUGH_LABEL,
                        type: 'symbol',
                        source: BOROUGH_SOURCE,
                        layout: {
                            visibility: 'none',
                            'text-field': '',
                            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                            'text-allow-overlap': true,
                            'text-ignore-placement': true,
                            'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 13, 17],
                            'text-letter-spacing': 0.01
                        },
                        paint: {
                            'text-color': '#1a2027',
                            'text-halo-color': 'rgba(255,255,255,.92)',
                            'text-halo-width': 1.5
                        }
                    });

                    map.current.on('mouseenter', BOROUGH_FILL, () => {
                        map.current.getCanvas().style.cursor = 'pointer';
                    });
                    map.current.on('mouseleave', BOROUGH_FILL, () => {
                        map.current.getCanvas().style.cursor = '';
                        if (boroughPopup) { boroughPopup.remove(); boroughPopup = null; }
                    });

                    map.current.on('mousemove', BOROUGH_FILL, (e) => {
                        const feature = e.features[0];
                        if (!feature || !boroughData) return;
                        const code = feature.properties.cve_mun;
                        const count = ((boroughData.byYear || {})[currentYear] || {})[code] || 0;
                        const borough = (boroughData.boroughs || []).find(b => b.code === code);
                        // Both readings, whichever one is painted: the rate is the
                        // honest comparison and the count is what people ask for.
                        const rate = borough && borough.population
                            ? (count / borough.population) * 100000
                            : 0;
                        const html = `
                            <div class="despojo-borough-tip">
                                <span class="despojo-borough-name">${feature.properties.name}</span>
                                <span class="despojo-borough-value">${count.toLocaleString('es-MX')} carpetas en ${currentYear}</span>
                                <span class="despojo-borough-rate">${rate.toFixed(1).replace('.', ',')} por 100 mil hab.</span>
                            </div>`;
                        if (!boroughPopup) {
                            boroughPopup = new mapboxgl.Popup({
                                className: 'despojo-popup is-borough',
                                closeButton: false,
                                closeOnClick: false,
                                maxWidth: '240px',
                                offset: 10
                            }).addTo(map.current);
                        }
                        boroughPopup.setLngLat(e.lngLat).setHTML(html);
                    });

                    map.current.on('click', BOROUGH_FILL, (e) => {
                        const feature = e.features[0];
                        if (!feature) return;
                        window.dispatchEvent(new CustomEvent('despojoBoroughPicked', {
                            detail: feature.properties.cve_mun
                        }));
                    });

                    applyBoroughView();
                    applyBoroughSelection();
                    paintBoroughs();
                })
                .catch(error => {
                    // The choropleth is additive: if it cannot load, the points
                    // view is unaffected and the panel simply never offers it.
                    console.error('Error loading despojo boroughs:', error);
                });
        };

        const loadDespojos = () => {
            if (!map.current || cancelled) return;

            if (!map.current.isStyleLoaded()) {
                map.current.once('load', loadDespojos);
                return;
            }

            fetch('/api/despojos/points')
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    if (cancelled || !map.current || !data || !data.features) return;

                    despojoFeatures = data.features;

                    if (map.current.getSource(SOURCE)) {
                        map.current.getSource(SOURCE).setData(data);
                    } else {
                        map.current.addSource(SOURCE, { type: 'geojson', data: data });

                        map.current.addLayer({
                            id: GHOST_LAYER,
                            type: 'circle',
                            source: SOURCE,
                            paint: {
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 2.5],
                                'circle-color': '#3c6478',
                                'circle-opacity': 0.18
                            }
                        });

                        map.current.addLayer({
                            id: ACTIVE_LAYER,
                            type: 'circle',
                            source: SOURCE,
                            paint: {
                                'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 6],
                                'circle-color': '#98122b',
                                'circle-opacity': 0.85,
                                'circle-stroke-width': 1,
                                'circle-stroke-color': '#ffffff'
                            }
                        });

                        map.current.on('mouseenter', ACTIVE_LAYER, () => {
                            map.current.getCanvas().style.cursor = 'pointer';
                        });
                        map.current.on('mouseleave', ACTIVE_LAYER, () => {
                            // Off a point the cursor belongs to the marker again:
                            // clicking the bare map moves the search point.
                            map.current.getCanvas().style.cursor = nearState.active ? 'crosshair' : '';
                        });

                        // In "cerca de mí" a click on bare map moves the search
                        // point; a click on a carpeta opens its card, the same
                        // as when browsing the city.
                        map.current.on('click', (e) => {
                            if (!nearState.active) return;
                            // A click that lands on a carpeta belongs to that
                            // carpeta: it opens its card and leaves the search
                            // point where the reader put it. Checked by query
                            // rather than by handler order, which Mapbox does
                            // not guarantee between layer and map listeners.
                            const onPoint = map.current.queryRenderedFeatures(e.point, {
                                layers: [ACTIVE_LAYER]
                            });
                            if (onPoint.length) return;
                            nearState.point = { lng: e.lngLat.lng, lat: e.lngLat.lat };
                            nearState.origin = 'map';
                            applyNear();
                            window.dispatchEvent(new CustomEvent('despojoNearPointPicked', {
                                detail: { lng: e.lngLat.lng, lat: e.lngLat.lat, origin: 'map' }
                            }));
                        });

                        map.current.on('click', ACTIVE_LAYER, (e) => {
                            const feature = e.features[0];
                            const props = feature.properties;
                            const coordinates = feature.geometry.coordinates.slice();

                            if (popup) popup.remove();
                            popup = new mapboxgl.Popup({
                                className: 'despojo-popup',
                                closeButton: true,
                                closeOnClick: false,
                                maxWidth: '300px',
                                offset: 14
                            })
                                .setLngLat(coordinates)
                                .setHTML(despojoPopupHTML(props, coordinates))
                                .addTo(map.current);

                            // Patch the address in when it lands — but only if this
                            // popup is still the open one, since the reader may have
                            // clicked another point in the meantime.
                            const opened = popup;
                            reverseGeocode(coordinates[0], coordinates[1]).then(address => {
                                if (opened !== popup || !opened.isOpen()) return;
                                const element = opened.getElement();
                                const slot = element && element.querySelector('.despojo-popup-address');
                                if (!slot) return;
                                slot.textContent = address || 'Dirección no disponible';
                                slot.classList.remove('is-loading');
                            });
                        });
                    }

                    applyYear(currentYear);
                    // A view change may have arrived while the points were still
                    // loading; make sure they land at the right opacity.
                    applyBoroughView();

                    window.despojoPointsLoaded = true;
                    window.dispatchEvent(new CustomEvent('despojoPointsLoaded', {
                        detail: { total: data.features.length }
                    }));
                })
                .catch(error => {
                    console.error('Error loading despojos data:', error);
                });
        };

        loadDespojos();
        loadBoroughs();

        const handleYearChange = (event) => {
            // While a radius is on screen the year comes from that pane's own
            // year strip, so the player must not overwrite the filter.
            if (nearState.active) { currentYear = event.detail; return; }
            applyYear(event.detail);
            paintBoroughs();
        };
        const handleNearChange = (event) => {
            const detail = event.detail || {};
            const wasActive = nearState.active;
            nearState = {
                active: !!detail.active,
                point: detail.point || (detail.active ? nearState.point : null),
                radius: detail.radius || 500,
                years: detail.years || [],
                origin: detail.origin || (wasActive ? nearState.origin : null)
            };
            applyNear();
        };
        // A row in the "cerca de mí" list opens the same case card a click on the
        // point would: in that mode the map's own clicks belong to the marker,
        // so the list is the only way in.
        const handleNearFocus = (event) => {
            const target = event.detail;
            if (!target || !map.current) return;
            map.current.easeTo({
                center: [target.lng, target.lat],
                zoom: Math.max(map.current.getZoom(), 16),
                duration: 700
            });

            if (popup) popup.remove();
            popup = new mapboxgl.Popup({
                className: 'despojo-popup',
                closeButton: true,
                closeOnClick: false,
                maxWidth: '300px',
                offset: 14
            })
                .setLngLat([target.lng, target.lat])
                .setHTML(despojoPopupHTML(target, [target.lng, target.lat]))
                .addTo(map.current);

            const opened = popup;
            reverseGeocode(target.lng, target.lat).then(address => {
                if (opened !== popup || !opened.isOpen()) return;
                const element = opened.getElement();
                const slot = element && element.querySelector('.despojo-popup-address');
                if (!slot) return;
                slot.textContent = address || 'Dirección no disponible';
                slot.classList.remove('is-loading');
            });
        };
        const handleViewChange = (event) => {
            const detail = event.detail || {};
            boroughView = detail.view || 'points';
            boroughMeasure = detail.measure || 'absolute';
            applyBoroughView();
            paintBoroughs();
        };
        const handleBoroughSelected = (event) => {
            boroughSelected = event.detail || null;
            applyBoroughSelection();
        };
        window.addEventListener('despojoYearChanged', handleYearChange);
        window.addEventListener('despojoViewChanged', handleViewChange);
        window.addEventListener('despojoBoroughSelected', handleBoroughSelected);
        window.addEventListener('despojoNearChanged', handleNearChange);
        window.addEventListener('despojoNearFocus', handleNearFocus);

        return () => {
            cancelled = true;
            window.despojoPointsLoaded = false;
            window.removeEventListener('despojoYearChanged', handleYearChange);
            window.removeEventListener('despojoViewChanged', handleViewChange);
            window.removeEventListener('despojoBoroughSelected', handleBoroughSelected);
            window.removeEventListener('despojoNearChanged', handleNearChange);
            window.removeEventListener('despojoNearFocus', handleNearFocus);
            if (nearFrame) cancelAnimationFrame(nearFrame);
            if (nearMarker) nearMarker.remove();
            if (popup) popup.remove();
            if (boroughPopup) boroughPopup.remove();
            // map.current.style is undefined once the map itself has been
            // removed (the map-init effect's cleanup runs first on unmount)
            if (map.current && map.current.style) {
                [ACTIVE_LAYER, GHOST_LAYER, BOROUGH_LABEL, BOROUGH_PICKED, BOROUGH_LINE,
                 BOROUGH_FILL, NEAR_LINE, NEAR_FILL].forEach(id => {
                    if (map.current.getLayer(id)) map.current.removeLayer(id);
                });
                [SOURCE, BOROUGH_SOURCE, NEAR_SOURCE].forEach(id => {
                    if (map.current.getSource(id)) map.current.removeSource(id);
                });
            }
        };
    }, []);

    const handleRadiusChange = (radius) => {
        setSelectedRadius(radius);
        currentRadiusRef.current = radius;
        
        // If there's an existing marker, use its position
        if (circleMarkerRef.current) {
            const markerPos = circleMarkerRef.current.getLngLat();
            drawCircle(radius, [markerPos.lng, markerPos.lat]);
        } else {
            // No marker exists, use map center and create a new marker
            drawCircle(radius);
            addMarkerToCircleAndZoom();
        }
    };

    const drawCircle = (radius, center) => {
        if (!map.current) return;

        // Remove existing circle layer and source if they exist
        if (map.current.getLayer('isochrone-circle-layer')) {
            map.current.removeLayer('isochrone-circle-layer');
        }
        if (map.current.getLayer('isochrone-circle-outline')) {
            map.current.removeLayer('isochrone-circle-outline');
        }
        if (map.current.getSource('isochrone-circle-source')) {
            map.current.removeSource('isochrone-circle-source');
        }

        // Use provided center or map center
        const position = center || [map.current.getCenter().lng, map.current.getCenter().lat];
        const circle = turf.circle(position, radius, {
            steps: 64,
            units: 'meters'
        });

        // Add the circle source
        map.current.addSource('isochrone-circle-source', {
            type: 'geojson',
            data: circle
        });

        // Add fill layer for the circle
        map.current.addLayer({
            id: 'isochrone-circle-layer',
            type: 'fill',
            source: 'isochrone-circle-source',
            paint: {
                'fill-color': '#FFA500',
                'fill-opacity': 0.2
            }
        });

        // Add outline layer for the circle
        map.current.addLayer({
            id: 'isochrone-circle-outline',
            type: 'line',
            source: 'isochrone-circle-source',
            paint: {
                'line-color': '#FFA500',
                'line-width': 2,
                'line-opacity': 0.8
            }
        });

        drawIntersectingPolygons(circle);
    };

    const handleMarkerChange = (newPos) => {
        if (!map.current) return;
        
        // Update marker coordinates state
        setMarkerCoordinates([newPos.lng, newPos.lat]);
        
        // Create a new circle at the new position
        const circle = turf.circle([newPos.lng, newPos.lat], currentRadiusRef.current, {
            steps: 64,
            units: 'meters'
        });
        
        // Update the circle source
        if (map.current.getSource('isochrone-circle-source')) {
            map.current.getSource('isochrone-circle-source').setData(circle);
        }
        
        // Only update intersecting polygons if we're in isochrones mode
        if (scopeAnalysis === 'isochrones') {
            // Remove existing layers before drawing new ones
            if (map.current.getLayer('intersecting-polygons-layer')) {
                map.current.removeLayer('intersecting-polygons-layer');
            }
            if (map.current.getSource('intersecting-polygons-source')) {
                map.current.removeSource('intersecting-polygons-source');
            }
            
            // Draw new intersecting polygons
            drawIntersectingPolygons(circle);
        }
    };

    const addMarkerToCircleAndZoom = () => {
        if (!map.current) return;
        
        // Remove existing marker if it exists
        if (circleMarkerRef.current) {
            circleMarkerRef.current.remove();
        }
        
        const circle = map.current.getSource('isochrone-circle-source')._data;
        
        // Get the center coordinates of the circle using turf.center
        const centerPoint = turf.center(circle);
        const center = centerPoint.geometry.coordinates;
        
        // Update marker coordinates state
        setMarkerCoordinates(center);
        
        // Create a new marker
        const marker = new mapboxgl.Marker({
            color: '#FFA500',
            draggable: true
        })
        .setLngLat(center)
        .addTo(map.current);
        
        // Store marker reference
        circleMarkerRef.current = marker;
        
        // Add drag end event listener
        marker.on('dragend', () => {
            const newPos = marker.getLngLat();
            handleMarkerChange(newPos);
        });

        // Center and zoom the map to the marker's position
        map.current.flyTo({
            center: center,
            zoom: 15,
            duration: 1000
        });
    };

    // Transport system management is now handled by TransportSystemsPanel

    const handleLineSelect = (lineInfo) => {
        setSelectedLine(lineInfo);
        setIsLayerPanelCollapsed(true);
    };

    const handleCloseLineInfo = () => {
        // Remove station marker when closing line details
        if (window.removeStationMarker) {
            window.removeStationMarker();
        }
        setSelectedLine(null);
        // Restore layer panel visibility (Capas de Información)
        setIsLayerPanelCollapsed(false);
        // Transport layer visibility is now handled by TransportSystemsPanel
    };

    // Station details are now handled by TransportSystemsPanel

    const handleCloseStationDetails = () => {
        setSelectedStation(null);
        // Don't change layer panel visibility - let it stay as is
        // setIsLayerPanelCollapsed(false);
        // Do NOT change map visibility - keep current visibility state
    };

    // Function to get geocoded address from coordinates
    const getGeocodedAddress = async (lngLat) => {
        try {
            setIsGeocoding(true);
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${mapboxgl.accessToken}&types=address,poi,neighborhood,place&language=es`
            );
            
            if (!response.ok) {
                throw new Error('Geocoding request failed');
            }
            
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                setGeocodedAddress(feature.place_name_es || feature.place_name);
            } else {
                setGeocodedAddress('Dirección no disponible');
            }
        } catch (error) {
            console.error('Error geocoding address:', error);
            setGeocodedAddress('Error al obtener dirección');
        } finally {
            setIsGeocoding(false);
        }
    };

    // Handler for floating action button clicks
    const handleElementAnalysisClick = (action) => {
        
        // If action is null, remove all analysis layers and clean up
        if (action === null) {
            removeAllAnalysisLayers();
            setScopeAnalysis(null);
            setIntersectingFeatures([]);
            return;
        }
        
        // Remove all existing analysis layers before adding the new one
        removeAllAnalysisLayers();
        
        // Set scope analysis based on action
        switch (action) {
            case 'hexbin':
                setScopeAnalysis('hexbin');
                // Add hexbin layer here when implemented
                break;
            case 'agebs':
                setScopeAnalysis('agebs');
                
                // Check if indicatorsData is available and add to map
                if (indicatorsData && indicatorsData.features) {
                    addAgebsToMap(indicatorsData, 'ageb');
                } else {
                    alert('Los datos de AGEBs aún se están cargando. Por favor espere un momento.');
                }
                break;
            case 'neighborhood':
                setScopeAnalysis('neighbourhood');
                
                // Fetch neighborhood data
                fetchIndicatorsData('neighbourhood').then(() => {
                    // After fetching, check if indicatorsData is available and add to map
                    if (indicatorsData && indicatorsData.features) {
                        addAgebsToMap(indicatorsData, 'neighbourhood');
                    } else {
                        alert('Los datos de colonias aún se están cargando. Por favor espere un momento.');
                    }
                }).catch(error => {
                    console.error('Error fetching neighborhood data:', error);
                    alert('Error al cargar los datos de colonias.');
                });
                break;
            case 'polygon':
                setScopeAnalysis('polygon');
                break;
            case 'isochrones':
                setScopeAnalysis('isochrones');
                handleRadiusChange(selectedRadius);
                break;
            default:
                // Unknown action
                break;
        }
    };

    // Function to remove specific AGEB layers while keeping hover and boundary effects
    const removeAgebDataLayers = () => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        try {
            // Remove only the data visualization layers
            if (map.current.getLayer('intersecting-polygons-layer')) {
                map.current.removeLayer('intersecting-polygons-layer');
            }
            if (map.current.getSource('intersecting-polygons-source')) {
                map.current.removeSource('intersecting-polygons-source');
            }
        } catch (error) {
            console.error('Error removing AGEB data layers:', error);
        }
    };

    // Function to remove all analysis layers from the map
    const removeAllAnalysisLayers = () => {
        if (!map.current || !map.current.isStyleLoaded()) {
            return;
        }

        try {
            // Remove popup
            removePopup();

            // Comprehensive list of all possible layers and sources
            const allLayers = [
                // Isochrone layers
                'isochrone-circle-layer',
                'isochrone-circle-outline',
                'intersecting-polygons-layer',
                // AGEBs layers
                'agebs-layer',
                'agebs-hover-detection',
                'agebs-hover-layer',
                // Selected geozone highlight
                'selected-geozone-highlight',
                // Any additional analysis layers
                'hexbin-layer',
                'neighborhood-layer',
                'custom-polygon-layer'
            ];
            
            const allSources = [
                // Isochrone sources
                'isochrone-circle-source',
                'intersecting-polygons-source',
                // AGEBs sources
                'agebs-source',
                'agebs-hover-source',
                // Selected geozone highlight source
                'selected-geozone-highlight',
                // Any additional analysis sources
                'hexbin-source',
                'neighborhood-source',
                'custom-polygon-source'
            ];

            // Remove all event listeners
            if (map.current.listeners) {
                Object.entries(map.current.listeners).forEach(([key, listener]) => {
                    const [event, layer] = key.split('-');
                    if (layer && map.current.getLayer(layer)) {
                        map.current.off(event, layer, listener);
                    }
                });
                map.current.listeners = {};
            }

            // Remove all layers first
            allLayers.forEach(layerId => {
                if (map.current.getLayer(layerId)) {
                    map.current.removeLayer(layerId);
                }
            });

            // Then remove all sources
            allSources.forEach(sourceId => {
                if (map.current.getSource(sourceId)) {
                    map.current.removeSource(sourceId);
                }
            });

            // Remove marker and reset coordinates
            if (circleMarkerRef.current) {
                circleMarkerRef.current.remove();
                circleMarkerRef.current = null;
                setMarkerCoordinates(null);
            }

            // Reset all related states
            setIntersectingFeatures([]);
            setHoveredFeature(null);
            
            // Remove any remaining mouse events
            map.current.getCanvas().style.cursor = '';
            
        } catch (error) {
            console.error('Error removing analysis layers from map:', error);
        }
    };

    // Function to remove all analysis layers except AGEBs layers
    const removeAllAnalysisLayersExceptAgebs = () => {
        
        if (!map.current || !map.current.isStyleLoaded()) {
            return;
        }

        try {
            
            // Remove popup
            removePopup();

            // List of layers to remove (excluding AGEBs layers)
            const layersToRemove = [
                // Isochrone layers
                'isochrone-circle-layer',
                'isochrone-circle-outline',
                'intersecting-polygons-layer',
                // Selected geozone highlight (will be recreated)
                'selected-geozone-highlight',
                // Any additional analysis layers
                'hexbin-layer',
                'neighborhood-layer',
                'custom-polygon-layer'
            ];
            
            const sourcesToRemove = [
                // Isochrone sources
                'isochrone-circle-source',
                'intersecting-polygons-source',
                // Selected geozone highlight source (will be recreated)
                'selected-geozone-highlight',
                // Any additional analysis sources
                'hexbin-source',
                'neighborhood-source',
                'custom-polygon-source'
            ];

            // Remove specific event listeners (keep AGEBs listeners)
            if (map.current.listeners) {
                const listenersToRemove = ['mouseenter-intersecting', 'mouseleave-intersecting', 'mousemove-intersecting'];
                listenersToRemove.forEach(key => {
                    if (map.current.listeners[key]) {
                        const [event, layer] = key.split('-');
                        if (layer && map.current.getLayer(layer)) {
                            map.current.off(event, layer, map.current.listeners[key]);
                        }
                        delete map.current.listeners[key];
                    }
                });
            }

            // Remove specified layers first
            layersToRemove.forEach(layerId => {
                if (map.current.getLayer(layerId)) {
                    map.current.removeLayer(layerId);
                }
            });

            // Then remove specified sources
            sourcesToRemove.forEach(sourceId => {
                if (map.current.getSource(sourceId)) {
                    map.current.removeSource(sourceId);
                }
            });

            // Remove marker and reset coordinates
            if (circleMarkerRef.current) {
                circleMarkerRef.current.remove();
                circleMarkerRef.current = null;
                setMarkerCoordinates(null);
            }

            // Reset related states
            setIntersectingFeatures([]);
            setHoveredFeature(null);
            
            // Remove any remaining mouse events
            map.current.getCanvas().style.cursor = '';
            
        } catch (error) {
            console.error('Error removing analysis layers from map:', error);
        }
    };

    // Function to add AGEBs data to the map
    const addAgebsToMap = (agebsData, geographicUnit = 'ageb') => {
        if (!map.current || !map.current.isStyleLoaded()) {
            setTimeout(() => addAgebsToMap(agebsData, geographicUnit), 1000);
            return;
        }

        try {
            // Remove existing popup before adding new layers
            removePopup();

            // Remove existing AGEBs layers and sources if they exist
            const layersToRemove = ['agebs-layer', 'agebs-hover-detection', 'agebs-hover-layer'];
            const sourcesToRemove = ['agebs-source', 'agebs-hover-source'];

            // Remove existing event listeners
            if (map.current.listeners && map.current.listeners['mouseenter-agebs']) {
                map.current.off('mouseenter', 'agebs-hover-detection', map.current.listeners['mouseenter-agebs']);
            }
            if (map.current.listeners && map.current.listeners['mouseleave-agebs']) {
                map.current.off('mouseleave', 'agebs-hover-detection', map.current.listeners['mouseleave-agebs']);
            }
            if (map.current.listeners && map.current.listeners['mousemove-agebs']) {
                map.current.off('mousemove', 'agebs-hover-detection', map.current.listeners['mousemove-agebs']);
            }

            // Remove layers first (in reverse order to avoid dependency issues)
            layersToRemove.reverse().forEach(layerId => {
                if (map.current.getLayer(layerId)) {
                    map.current.removeLayer(layerId);
                }
            });

            // Remove sources
            sourcesToRemove.forEach(sourceId => {
                if (map.current.getSource(sourceId)) {
                    map.current.removeSource(sourceId);
                }
            });

            // Add unique IDs to features if they don't have them
            const processedData = {
                ...agebsData,
                features: agebsData.features.map((feature, index) => ({
                    ...feature,
                    id: feature.id || `ageb-${index}`
                }))
            };

            // Add AGEBs source
            map.current.addSource('agebs-source', {
                type: 'geojson',
                data: processedData
            });

            // Add hover source (empty initially)
            map.current.addSource('agebs-hover-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Cache for geocoded addresses by CVEGEO
            const geocodingCache = {};

            // Function to get geocoded address from Mapbox
            const getMapboxAddress = async (feature) => {
                const cvegeo = feature.properties.cvegeo;
                if (geocodingCache[cvegeo]) {
                    return geocodingCache[cvegeo];
                }

                try {
                    // Calculate centroid of the feature
                    const centroid = turf.center(feature);
                    const [lng, lat] = centroid.geometry.coordinates;
                    
                    // Use Mapbox Geocoding API to get address - focus on neighborhood, locality, and district
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=address,neighborhood,locality,district&language=es&limit=1`
                    );
                    
                    if (!response.ok) {
                        throw new Error('Mapbox geocoding request failed');
                    }
                    
                    const data = await response.json();

                    let address = 'Dirección no disponible';
                    
                    if (data.features && data.features.length > 0) {
                        const retrievedFeature = data.features[0];
                        const context = retrievedFeature.context || [];
                        // Extract neighborhood, locality, and district from context
                        const neighborhoodItem = context.find(c => c.id.startsWith('neighborhood'));
                        const neighborhood = neighborhoodItem ? (neighborhoodItem.text_es || neighborhoodItem.text) : null;
                        
                        const localityItem = context.find(c => c.id.startsWith('locality'));
                        const locality = localityItem ? (localityItem.text_es || localityItem.text) : null;
                        
                        const districtItem = context.find(c => c.id.startsWith('district'));
                        const district = districtItem ? (districtItem.text_es || districtItem.text) : null;
                        
                        // Build address string with available components
                        const addressParts = ["AGEB " + feature.properties.cve_ageb];
                        if (neighborhood) addressParts.push(neighborhood);
                        if (locality) addressParts.push(locality);
                        if (district) addressParts.push(district);
                        
                        if (addressParts.length > 0) {
                            address = addressParts.join(', ');
                        } else {
                            // Fallback to the main feature text if no context found
                            address = feature.text_es || feature.text || feature.place_name_es || feature.place_name;
                        }
                    }
                    
                    geocodingCache[cvegeo] = address;
                    return address;
                } catch (error) {
                    console.error('Error getting Mapbox address:', error);
                    return 'Error al obtener dirección';
                }
            };

            // Add AGEBs border layer (only borders)
            map.current.addLayer({
                id: 'agebs-layer',
                type: 'line',
                source: 'agebs-source',
                paint: {
                    'line-color': '#FFA500',
                    'line-width': 1.5,
                    'line-opacity': 0.8
                }
            });

            // Add AGEBs fill layer for hover detection (invisible but covers full area)
            map.current.addLayer({
                id: 'agebs-hover-detection',
                type: 'fill',
                source: 'agebs-source',
                paint: {
                    'fill-color': 'transparent',
                    'fill-opacity': 0
                }
            }, 'agebs-layer');

            // Add AGEBs hover layer (for highlighting hovered feature) - ABOVE the border layer
            map.current.addLayer({
                id: 'agebs-hover-layer',
                type: 'fill',
                source: 'agebs-hover-source',
                paint: {
                    'fill-color': '#000000',
                    'fill-opacity': 0.3,
                    'fill-outline-color': 'transparent'
                }
            }, 'agebs-hover-detection');

            // Initialize popup variable
            let popup = null;

            // Store event listener references
            if (!map.current.listeners) map.current.listeners = {};

            // Mouseenter event
            const mouseenterHandler = (e) => {
                const features = map.current.queryRenderedFeatures(e.point, {
                    layers: ['agebs-hover-detection']
                });
                
                if (features.length > 0) {
                    const feature = features[features.length - 1];
                    map.current.getCanvas().style.cursor = 'pointer';
                    
                    // Check if the source exists before calling setData
                    const hoverSource = map.current.getSource('agebs-hover-source');
                    if (hoverSource) {
                        hoverSource.setData({
                            type: 'FeatureCollection',
                            features: [feature]
                        });
                    }
                    
                    // Remove existing popup before creating a new one
                    removePopup();
                    
                    popupRef.current = new mapboxgl.Popup({
                        closeButton: false,
                        closeOnClick: false,
                        className: 'agebs-popup'
                    });
                    
                    const initialPopupContent = generatePopupContent(feature.properties, selectedIndicatorRef.current, null, geographicUnit);
                    
                    popupRef.current
                        .setLngLat(e.lngLat)
                        .setHTML(initialPopupContent)
                        .addTo(map.current);
                    
                    getMapboxAddress(feature).then(address => {
                        if (popupRef.current) {
                            const updatedPopupContent = generatePopupContent(feature.properties, selectedIndicatorRef.current, address, geographicUnit);
                            popupRef.current.setHTML(updatedPopupContent);
                        }
                    });
                }
            };

            // Mouseleave event
            const mouseleaveHandler = () => {
                map.current.getCanvas().style.cursor = '';
                
                // Check if the source exists before calling setData
                const hoverSource = map.current.getSource('agebs-hover-source');
                if (hoverSource) {
                    hoverSource.setData({
                        type: 'FeatureCollection',
                        features: []
                    });
                }
                
                removePopup();
            };

            // Mousemove event
            const mousemoveHandler = (e) => {
                const features = map.current.queryRenderedFeatures(e.point, {
                    layers: ['agebs-hover-detection']
                });
                
                if (features.length > 0) {
                    const feature = features[features.length - 1];
                    
                    // Check if the source exists before calling setData
                    const hoverSource = map.current.getSource('agebs-hover-source');
                    if (hoverSource) {
                        hoverSource.setData({
                            type: 'FeatureCollection',
                            features: [feature]
                        });
                    }
                    
                    if (popupRef.current) {
                        popupRef.current.setLngLat(e.lngLat);
                        
                        getMapboxAddress(feature).then(address => {
                            if (popupRef.current) {
                                const updatedPopupContent = generatePopupContent(feature.properties, selectedIndicatorRef.current, address, geographicUnit);
                                popupRef.current.setHTML(updatedPopupContent);
                            }
                        });
                    }
                }
            };

            // Store event listeners for later removal
            map.current.listeners['mouseenter-agebs'] = mouseenterHandler;
            map.current.listeners['mouseleave-agebs'] = mouseleaveHandler;
            map.current.listeners['mousemove-agebs'] = mousemoveHandler;

            // Add event listeners
            map.current.on('mouseenter', 'agebs-hover-detection', mouseenterHandler);
            map.current.on('mouseleave', 'agebs-hover-detection', mouseleaveHandler);
            map.current.on('mousemove', 'agebs-hover-detection', mousemoveHandler);
            
            // Add click event listener for AGEB selection
            const clickHandler = (e) => {
                const features = map.current.queryRenderedFeatures(e.point, {
                    layers: ['agebs-hover-detection']
                });
                                
                if (features.length > 0) {
                    const feature = features[features.length - 1];
                    
                    // Convert Mapbox vector tile feature to GeoJSON feature
                    const geojsonFeature = {
                        type: 'Feature',
                        geometry: feature.geometry,
                        properties: feature.properties,
                        id: feature.id
                    };
                    
                    // Add type property to identify as AGEB
                    const geozone = {
                        ...geojsonFeature,
                        type: 'ageb'
                    };

                    handleGeozoneSelect(geozone);
                }
            };
            
            map.current.on('click', 'agebs-hover-detection', clickHandler);
            
            // Store click handler for later removal
            map.current.listeners['click-agebs'] = clickHandler;
            
        } catch (error) {
            console.error('Error adding AGEBs to map:', error);
        }
    };

    // Function to draw intersecting polygons from indicators data
    const drawIntersectingPolygons = (circle) => {
        if (!indicatorsData || !indicatorsData.features || !map.current) {
            return;
        }

        var intersectingFeatures = [];

        try {
            // Find intersecting features
            if (scopeAnalysis === 'agebs' || scopeAnalysis === 'neighbourhood') {
                intersectingFeatures = indicatorsData.features;
                // Add the AGEBs layer for agebs and neighbourhood scope
                // Check if AGEBs layer already exists, if not add it
                if (!map.current.getLayer('agebs-layer')) {
                    addAgebsToMap(indicatorsData, scopeAnalysis === 'neighbourhood' ? 'neighbourhood' : 'ageb');
                }
            } else if (scopeAnalysis === 'isochrones') {
                // For isochrones mode, only show intersecting features
                intersectingFeatures = indicatorsData.features.filter(feature => {
                    if (feature.geometry && feature.geometry.type === 'Polygon') {
                        return turf.booleanIntersects(circle, feature);
                    }
                    return false;
                });
                
                // Create a FeatureCollection with just the intersecting features
                const intersectingCollection = {
                    type: 'FeatureCollection',
                    features: intersectingFeatures
                };
                
                // Add the AGEBs layer with just the intersecting features
                addAgebsToMap(intersectingCollection, scopeAnalysis === 'neighbourhood' ? 'neighbourhood' : 'ageb');
                
                // Update the intersecting features state
                setIntersectingFeatures(intersectingFeatures);
            }
        } catch (error) {
            console.error('Error retrieving intersecting features:', error);
        }

        drawFeatures(intersectingFeatures, selectedIndicatorRef.current);
    };

    // Function to draw intersecting polygons with a specific indicator
    const drawFeatures = (intersectingFeatures, indicatorProperty) => {
        try {
            if (intersectingFeatures.length > 0) {
                
                // Get min/max values from COLOR_BRACKETS for this indicator
                let coloredFeatures;
                
                if (indicatorProperty) {
                    // If an indicator is selected, use color gradients
                    const brackets = ColorUtils.getManualRanges(indicatorProperty);
                    
                    let minValue = null;
                    let maxValue = null;
                    let startColor = null;
                    let endColor = null;
                    
                    if (brackets && brackets.length > 0) {
                        const bracket = brackets[0]; // Get the first (and only) bracket
                        minValue = bracket.min;
                        maxValue = bracket.max;
                        startColor = bracket.color;
                        endColor = bracket.endColor;
                    }

                    // Add colors using the gradient functionality
                    coloredFeatures = intersectingFeatures.map((feature, index) => {
                        const color = ColorUtils.getManualColorForValue(
                            indicatorProperty,
                            feature.properties[indicatorProperty] || 0,
                            minValue,
                            maxValue,
                            startColor,
                            endColor,
                            'cbrt' // Use cube root for strong shift towards zero
                        );
                        
                        return {
                            ...feature,
                            properties: {
                                ...feature.properties,
                                [`${indicatorProperty}Color`]: color
                            }
                        };
                    });
                } else {
                    // If no indicator is selected, use transparent fill
                    coloredFeatures = intersectingFeatures.map(feature => ({
                        ...feature,
                        properties: {
                            ...feature.properties,
                            fillColor: 'transparent'
                        }
                    }));
                }

                // Store intersecting features for legend
                setIntersectingFeatures(intersectingFeatures);

                // Create a feature collection with intersecting polygons
                const intersectingCollection = {
                    type: 'FeatureCollection',
                    features: coloredFeatures
                };

                // Check if the layer already exists
                const layerExists = map.current.getLayer('intersecting-polygons-layer');
                const sourceExists = map.current.getSource('intersecting-polygons-source');

                if (layerExists && sourceExists) {
                    // Layer exists, just update the source data
                    map.current.getSource('intersecting-polygons-source').setData(intersectingCollection);
                    
                    // Update the paint properties if needed
                    map.current.setPaintProperty('intersecting-polygons-layer', 'fill-color',
                        indicatorProperty ? ['coalesce', ['get', `${indicatorProperty}Color`], 'transparent'] : 'transparent');
                    map.current.setPaintProperty('intersecting-polygons-layer', 'fill-outline-color',
                        indicatorProperty ? ['coalesce', ['get', `${indicatorProperty}Color`], 'transparent'] : 'transparent');
                } else {
                    
                    // Remove existing source and layer if they exist
                    if (map.current.getLayer('intersecting-polygons-layer')) {
                        // Remove event handlers before removing layer
                        map.current.off('mouseenter', 'intersecting-polygons-layer');
                        map.current.off('mouseleave', 'intersecting-polygons-layer');
                        map.current.off('mousemove', 'intersecting-polygons-layer');
                        map.current.removeLayer('intersecting-polygons-layer');
                    }
                    if (map.current.getSource('intersecting-polygons-source')) {
                        map.current.removeSource('intersecting-polygons-source');
                    }

                    // Add new source and layer
                    map.current.addSource('intersecting-polygons-source', {
                        type: 'geojson',
                        data: intersectingCollection
                    });

                    map.current.addLayer({
                        id: 'intersecting-polygons-layer',
                        type: 'fill',
                        source: 'intersecting-polygons-source',
                        paint: {
                            'fill-color': indicatorProperty ? ['coalesce', ['get', `${indicatorProperty}Color`], 'transparent'] : 'transparent',
                            'fill-opacity': 0.5,
                            'fill-outline-color': indicatorProperty ? ['coalesce', ['get', `${indicatorProperty}Color`], 'transparent'] : 'transparent'
                        }
                    });

                    // Add event handlers only when creating new layer
                    map.current.on('mouseenter', 'intersecting-polygons-layer', (e) => {
                        if (e.features.length > 0) {                        
                            setHoveredFeature(e.features[0]);
                        }
                    });

                    map.current.on('mouseleave', 'intersecting-polygons-layer', () => {
                        map.current.getCanvas().style.cursor = '';
                        setHoveredFeature(null);
                    });

                    map.current.on('mousemove', 'intersecting-polygons-layer', (e) => {
                        if (e.features.length > 0) {
                            setHoveredFeature(e.features[0]);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error drawing intersecting polygons:', error);
        }
    };

    // Map event handlers are now managed by TransportSystemsPanel

    // Transport layer management is now handled by TransportSystemsPanel

    // Hide floating actions when other panels are shown
    React.useEffect(() => {
        if (indicatorsVisible || transportSystemsVisible || selectedLine || selectedStation || selectedGeozone) {
            setShowFloatingActions(false);
            if (tappedMarkerRef.current) {
                tappedMarkerRef.current.remove();
                tappedMarkerRef.current = null;
            }
            setGeocodedAddress('');
        }
    }, [indicatorsVisible, transportSystemsVisible, selectedLine, selectedStation, selectedGeozone]);

    // Remove station marker when transport systems panel is closed
    React.useEffect(() => {
        if (!transportSystemsVisible && window.removeStationMarker) {
            window.removeStationMarker();
        }
    }, [transportSystemsVisible]);

    // Function to highlight the selected geozone with blue color
    const highlightSelectedGeozone = (geozone, retryCount = 0) => {
        // Check if geozone is valid
        if (!geozone || !geozone.geometry || !geozone.properties) {
            return;
        }
        
        // Prevent infinite loops
        if (retryCount > 10) {
            return;
        }
        
        if (!map.current || !map.current.isStyleLoaded()) {
            setTimeout(() => highlightSelectedGeozone(geozone, retryCount + 1), 500);
            return;
        }

        // Wait for AGEBs layer to be ready
        const agebsLayer = map.current.getLayer('agebs-layer');
        if (!agebsLayer) {
            setTimeout(() => highlightSelectedGeozone(geozone, retryCount + 1), 300);
            return;
        }

        try {
            
            // Remove existing selected geozone highlight if it exists
            const existingHighlightLayer = map.current.getLayer('selected-geozone-highlight');
            const existingHighlightSource = map.current.getSource('selected-geozone-highlight');

            if (existingHighlightLayer) {
                map.current.removeLayer('selected-geozone-highlight');
            }
            if (existingHighlightSource) {
                map.current.removeSource('selected-geozone-highlight');
            }

            // Create a feature collection with just the selected geozone
            const selectedFeature = {
                type: 'FeatureCollection',
                features: [geozone]
            };

            // Add source for the selected geozone highlight
            map.current.addSource('selected-geozone-highlight', {
                type: 'geojson',
                data: selectedFeature
            });

            // Add layer to highlight the selected geozone with blue color
            map.current.addLayer({
                id: 'selected-geozone-highlight',
                type: 'fill',
                source: 'selected-geozone-highlight',
                paint: {
                    'fill-color': '#0066CC',
                    'fill-opacity': 0.6,
                    'fill-outline-color': '#0066CC'
                }
            }, 'agebs-layer'); // Insert above the AGEBs border layer
            
            // Verify the layer was added
            const newHighlightLayer = map.current.getLayer('selected-geozone-highlight');
            
        } catch (error) {
            console.error('Error highlighting selected geozone:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
    };

    // Function to safely remove popup
    const removePopup = () => {
        if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
        }
    };

    // Add cleanup effect
    React.useEffect(() => {
        return () => {
            removePopup();
        };
    }, []);

    // Update popup cleanup in removeAllAnalysisLayers
    React.useEffect(() => {
        return () => {
            removePopup();
        };
    }, []);

    // Add cleanup when indicators visibility changes
    React.useEffect(() => {
        if (!indicatorsVisible) {
            // Only remove the data visualization layers, keep boundaries and hover effects
            removeAgebDataLayers();
            setSelectedIndicator(null);
        } else if (indicatorsVisible && selectedIndicator && indicatorsData && indicatorsData.features) {
            // Ensure AGEBs layer is present when indicators are visible and we have a selected indicator
            if (!map.current.getLayer('agebs-layer')) {
                addAgebsToMap(indicatorsData, 'ageb');
            }
        }
    }, [indicatorsVisible]);

    // Add cleanup when scope analysis changes
    React.useEffect(() => {
        // Only remove all layers when switching away from agebs/neighbourhood to other analysis types
        if (scopeAnalysis && scopeAnalysis !== 'agebs' && scopeAnalysis !== 'neighbourhood') {
            removeAllAnalysisLayers();
        } else if (scopeAnalysis === null) {
            // Remove all layers when scope analysis is null
            removeAllAnalysisLayers();
            // Hide indicators panel when scope analysis is null
            setIndicatorsVisible(false);
        }
        
        // Only proceed with drawing if we have a valid analysis type
        if (scopeAnalysis) {
            const position = markerCoordinates || [map.current.getCenter().lng, map.current.getCenter().lat];
            const circle = turf.circle(position, currentRadiusRef.current, {
                steps: 64,
                units: 'meters'
            });
            drawIntersectingPolygons(circle);
        }
    }, [scopeAnalysis]);

    // Add cleanup when isochrones visibility changes
    React.useEffect(() => {
        if (!isochronasVisible) {
            removeAllAnalysisLayers();
            setScopeAnalysis(null);
        }
    }, [isochronasVisible]);

    // Add cleanup on component unmount
    React.useEffect(() => {
        return () => {
            removeAllAnalysisLayers();
        };
    }, []);

    // Update intersecting features when marker coordinates change
    React.useEffect(() => {
        if (scopeAnalysis === 'isochrones' && markerCoordinates && map.current) {
            const circle = turf.circle(markerCoordinates, currentRadiusRef.current, {
                steps: 64,
                units: 'meters'
            });
            drawIntersectingPolygons(circle);
        }
    }, [markerCoordinates, scopeAnalysis]);

    // Handler for crime year changes
    const handleCrimeYearChange = (year) => {
        setSelectedYearCrime(year);
        
        // If a crime indicator is currently selected, switch to the same category for the new year
        if (selectedIndicator && (
            selectedIndicator.startsWith('thefts_') || 
            selectedIndicator.startsWith('cell_phone_thefts_') ||
            selectedIndicator.startsWith('harrasment_') ||
            selectedIndicator.startsWith('sexual_assault_') ||
            selectedIndicator.startsWith('taxi_thefts_') ||
            selectedIndicator.startsWith('house_thefts_')
        )) {
            // Extract the crime type from the current indicator
            let crimeType = '';
            if (selectedIndicator.startsWith('thefts_')) {
                crimeType = 'thefts';
            } else if (selectedIndicator.startsWith('cell_phone_thefts_')) {
                crimeType = 'cell_phone_thefts';
            } else if (selectedIndicator.startsWith('harrasment_')) {
                crimeType = 'harrasment';
            } else if (selectedIndicator.startsWith('sexual_assault_')) {
                crimeType = 'sexual_assault';
            } else if (selectedIndicator.startsWith('taxi_thefts_')) {
                crimeType = 'taxi_thefts';
            } else if (selectedIndicator.startsWith('house_thefts_')) {
                crimeType = 'house_thefts';
            }
            
            // Set the new indicator for the selected year
            if (crimeType) {
                const newIndicator = `${crimeType}_${year}`;
                setSelectedIndicator(newIndicator);
            }
        }
    };

    // Redraw features when crime year changes
    React.useEffect(() => {
        if (indicatorsVisible && selectedIndicator && map.current && !isClearingDueToSectionClose) {
            // Use marker coordinates if they exist, otherwise use map center
            const position = markerCoordinates || [map.current.getCenter().lng, map.current.getCenter().lat];
            const circle = turf.circle(position, currentRadiusRef.current, {
                steps: 64,
                units: 'meters'
            });

            drawIntersectingPolygons(circle);
        }
    }, [selectedYearCrime]);

    return (
        <div className="map-admin-container">
            {!hideTopNavigation && <TopNavigationBar onHelpClick={onHelpClick} />}

            <div ref={mapContainer} className="map-container" />

            {!isMobile && !hideLoadingModal && (
                <LoadingModal 
                    isVisible={indicatorsLoading} 
                    message="Cargando datos de indicadores..." 
                    progress={downloadProgress}
                />
            )}

            {!showFloatingActions && !hideVerticalPanel && (
                <VerticalPanelContainer 
                    map={map}
                    showSearchDialog={showSearchDialog}
                    setShowSearchDialog={setShowSearchDialog}
                    onLineSelect={handleLineSelect}
                    indicatorsData={indicatorsData}
                    indicatorsLoading={indicatorsLoading}
                    indicatorsError={indicatorsError}
                    indicatorsVisible={indicatorsVisible}
                    setIndicatorsVisible={setIndicatorsVisible}
                    onElementAnalysisClick={handleElementAnalysisClick}
                    intersectingFeatures={intersectingFeatures}
                    hoveredFeature={hoveredFeature}
                    selectedIndicator={selectedIndicator}
                    onIndicatorSelect={(indicator) => {
                        setSelectedIndicator(indicator ? indicator.property : null);
                        // Set scope analysis to agebs when selecting indicators
                        setScopeAnalysis('agebs');
                        // Use marker coordinates if they exist, otherwise use map center
                        if (indicatorsVisible && map.current && !isClearingDueToSectionClose) {
                            // Ensure AGEBs layer is present when selecting indicators
                            if (indicatorsData && indicatorsData.features && !map.current.getLayer('agebs-layer')) {
                                addAgebsToMap(indicatorsData, 'ageb');
                            }
                            
                            const position = markerCoordinates || [map.current.getCenter().lng, map.current.getCenter().lat];
                            const circle = turf.circle(position, currentRadiusRef.current, {
                                steps: 64,
                                units: 'meters'
                            });

                            drawIntersectingPolygons(circle);
                        }
                    }}
                    selectedRadius={selectedRadius}
                    onRadiusChange={handleRadiusChange}
                    transportSystemsVisible={transportSystemsVisible}
                    setTransportSystemsVisible={setTransportSystemsVisible}
                    isochronasVisible={isochronasVisible}
                    setIsochronasVisible={setIsochronasVisible}
                    selectedYearCrime={selectedYearCrime}
                    onCrimeYearChange={handleCrimeYearChange}
                    selectedStation={selectedStation}
                    onCloseStationDetails={handleCloseStationDetails}
                    selectedLine={selectedLine}
                    onCloseLineDetails={handleCloseLineInfo}
                    lineDetailsPanelRef={lineDetailsPanelRef}
                    selectedGeozone={selectedGeozone}
                    onCloseGeozoneDetails={handleGeozoneClose}
                    geozoneDetailsPanelRef={geozoneDetailsPanelRef}
                    scopeAnalysis={scopeAnalysis}
                    removeAllAnalysisLayers={removeAllAnalysisLayers}
                    removeAgebDataLayers={removeAgebDataLayers}
                    setSelectedIndicator={setSelectedIndicator}
                    setIsClearingDueToSectionClose={setIsClearingDueToSectionClose}
                    onStationSelect={(station) => setSelectedStation(station)}
                    onShowFloatingActions={(show) => setShowFloatingActions(show)}
                    onLayerPanelCollapse={(collapsed) => setIsLayerPanelCollapsed(collapsed)}
                />
            )}
        </div>
    );
}

// Make the component available globally
window.MapAdminApp = MapAdminApp;

// Make the helper function available globally
window.getIndicatorDisplayName = getIndicatorDisplayName; 