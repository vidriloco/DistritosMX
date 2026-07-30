// TripsPanel component - Displays trips grouped by country
function TripsPanel() {
    const [tripsData, setTripsData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [groupedTrips, setGroupedTrips] = React.useState({});
    
    // New state for view management
    const [currentView, setCurrentView] = React.useState('countries'); // 'countries' or 'trips' or 'devices'
    const [selectedCountry, setSelectedCountry] = React.useState(null);
    const [devicesInCountry, setDevicesInCountry] = React.useState([]);
    const [tripsInCountry, setTripsInCountry] = React.useState([]);
    const [selectedTrip, setSelectedTrip] = React.useState(null);
    const [selectedTripData, setSelectedTripData] = React.useState(null);
    const [showDetailPanel, setShowDetailPanel] = React.useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = React.useState(null);
    
    // State for progressive loading
    const [fetchingFiles, setFetchingFiles] = React.useState(false);
    const [fetchedFilesCount, setFetchedFilesCount] = React.useState(0);
    const [totalFilesCount, setTotalFilesCount] = React.useState(0);
    
    // State for device selection and map display
    const [selectedDevice, setSelectedDevice] = React.useState(null);
    const [loadingDeviceData, setLoadingDeviceData] = React.useState(false);
    
    // State for second set of trips (from trips directory)
    const [additionalTripsData, setAdditionalTripsData] = React.useState([]);
    const [additionalGroupedTrips, setAdditionalGroupedTrips] = React.useState({});
    const [loadingAdditionalTrips, setLoadingAdditionalTrips] = React.useState(false);
    const [fetchingAdditionalFiles, setFetchingAdditionalFiles] = React.useState(false);
    const [fetchedAdditionalFilesCount, setFetchedAdditionalFilesCount] = React.useState(0);
    const [totalAdditionalFilesCount, setTotalAdditionalFilesCount] = React.useState(0);

    // State for phone location tooltip
    const [phoneLocationTooltip, setPhoneLocationTooltip] = React.useState(null);

    // Country flag mapping
    const countryFlags = {
        'US': '🇺🇸',
        'MX': '🇲🇽',
        'CA': '🇨🇦',
        'GB': '🇬🇧',
        'FR': '🇫🇷',
        'DE': '🇩🇪',
        'ES': '🇪🇸',
        'IT': '🇮🇹',
        'BR': '🇧🇷',
        'AR': '🇦🇷',
        'CL': '🇨🇱',
        'CO': '🇨🇴',
        'PE': '🇵🇪',
        'VE': '🇻🇪',
        'UY': '🇺🇾',
        'PY': '🇵🇾',
        'BO': '🇧🇴',
        'EC': '🇪🇨',
        'GY': '🇬🇾',
        'SR': '🇸🇷',
        'GF': '🇬🇫',
        'FK': '🇫🇰',
        'GS': '🇬🇸',
        'JP': '🇯🇵',
        'KR': '🇰🇷',
        'CN': '🇨🇳',
        'IN': '🇮🇳',
        'AU': '🇦🇺',
        'NZ': '🇳🇿',
        'RU': '🇷🇺',
        'TR': '🇹🇷',
        'SA': '🇸🇦',
        'AE': '🇦🇪',
        'EG': '🇪🇬',
        'ZA': '🇿🇦',
        'NG': '🇳🇬',
        'KE': '🇰🇪',
        'MA': '🇲🇦',
        'TN': '🇹🇳',
        'DZ': '🇩🇿',
        'LY': '🇱🇾',
        'SD': '🇸🇩',
        'ET': '🇪🇹',
        'GH': '🇬🇭',
        'UG': '🇺🇬',
        'TZ': '🇹🇿',
        'ZW': '🇿🇼',
        'BW': '🇧🇼',
        'NA': '🇳🇦',
        'SZ': '🇸🇿',
        'LS': '🇱🇸',
        'MW': '🇲🇼',
        'ZM': '🇿🇲',
        'AO': '🇦🇴',
        'MZ': '🇲🇿',
        'MG': '🇲🇬',
        'MU': '🇲🇺',
        'SC': '🇸🇨',
        'KM': '🇰🇲',
        'DJ': '🇩🇯',
        'SO': '🇸🇴',
        'ER': '🇪🇷',
        'SS': '🇸🇸',
        'CF': '🇨🇫',
        'TD': '🇹🇩',
        'NE': '🇳🇪',
        'ML': '🇲🇱',
        'BF': '🇧🇫',
        'CI': '🇨🇮',
        'LR': '🇱🇷',
        'SL': '🇸🇱',
        'GN': '🇬🇳',
        'GW': '🇬🇼',
        'GM': '🇬🇲',
        'SN': '🇸🇳',
        'MR': '🇲🇷',
        'CV': '🇨🇻',
        'ST': '🇸🇹',
        'GQ': '🇬🇶',
        'GA': '🇬🇦',
        'CG': '🇨🇬',
        'CD': '🇨🇩',
        'CM': '🇨🇲',
        'CF': '🇨🇫',
        'TD': '🇹🇩',
        'NE': '🇳🇪',
        'ML': '🇲🇱',
        'BF': '🇧🇫',
        'CI': '🇨🇮',
        'LR': '🇱🇷',
        'SL': '🇸🇱',
        'GN': '🇬🇳',
        'GW': '🇬🇼',
        'GM': '🇬🇲',
        'SN': '🇸🇳',
        'MR': '🇲🇷',
        'CV': '🇨🇻',
        'ST': '🇸🇹',
        'GQ': '🇬🇶',
        'GA': '🇬🇦',
        'CG': '🇨🇬',
        'CD': '🇨🇩',
        'CM': '🇨🇲',
        'AT': '🇦🇹',
        'NL': '🇳🇱',
        'BZ': '🇧🇿',
        'CR': '🇨🇷',
        'DO': '🇩🇴',
        'ID': '🇮🇩',
        'PH': '🇵🇭',
        'SE': '🇸🇪',
        'SG': '🇸🇬',
        'SV': '🇸🇻',
        'UA': '🇺🇦',
        'NI': '🇳🇮'
    };

    // Country code to name mapping (Spanish)
    const countryNames = {
        'US': 'Estados Unidos',
        'MX': 'México',
        'CA': 'Canadá',
        'GB': 'Reino Unido',
        'FR': 'Francia',
        'DE': 'Alemania',
        'ES': 'España',
        'IT': 'Italia',
        'BR': 'Brasil',
        'AR': 'Argentina',
        'CL': 'Chile',
        'CO': 'Colombia',
        'PE': 'Perú',
        'VE': 'Venezuela',
        'UY': 'Uruguay',
        'PY': 'Paraguay',
        'BO': 'Bolivia',
        'EC': 'Ecuador',
        'JP': 'Japón',
        'KR': 'Corea del Sur',
        'CN': 'China',
        'IN': 'India',
        'AU': 'Australia',
        'NZ': 'Nueva Zelanda',
        'RU': 'Rusia',
        'TR': 'Turquía',
        'SA': 'Arabia Saudí',
        'AE': 'Emiratos Árabes Unidos',
        'AT': 'Austria',
        'NL': 'Países Bajos',
        'BZ': 'Belice',
        'CR': 'Costa Rica',
        'DO': 'República Dominicana',
        'ID': 'Indonesia',
        'PH': 'Filipinas',
        'SE': 'Suecia',
        'SG': 'Singapur',
        'SV': 'El Salvador',
        'UA': 'Ucrania',
        'NI': 'Nicaragua'
    };

    // Handler for country selection
    const handleCountryClick = async (countryCode, countryData) => {
        setSelectedCountry({
            code: countryCode,
            name: countryData.name,
            flag: countryFlags[countryCode] || '🏳️'
        });
        
        // Show trips list from analysis.json
        // The trips array contains trip objects with identifier, startDate, endDate, and pings
        if (countryData.trips && Array.isArray(countryData.trips) && countryData.trips.length > 0) {
            setTripsInCountry(countryData.trips);
            setCurrentView('trips');
        } else {
            // No trips found for this country
            setTripsInCountry([]);
            setCurrentView('trips');
        }
    };

    // Handler for back navigation
    const handleBackClick = () => {
        setCurrentView('countries');
        setSelectedCountry(null);
        setDevicesInCountry([]);
        setTripsInCountry([]);
        setSelectedDevice(null);
    };
    
    // Handler for trip click - show detail panel and load data
    const handleTripClick = async (trip) => {
            setLoadingDeviceData(true);
        setSelectedTrip(trip);
        
        try {
            // Get the global map instance
            const mapInstance = window.map;
            if (!mapInstance) {
                throw new Error('Map instance not available');
            }
            
            // Clean up any existing device layers
            cleanupDeviceLayers(mapInstance);
            
            // Construct the URL for the trip's GeoJSON file
            // The identifier is the filename (without .geojson extension)
            const geojsonUrl = `https://distritosmexico.s3.us-east-2.amazonaws.com/geojsons/${selectedCountry.code}/${trip.identifier}.geojson`;
            
            console.log('Fetching GeoJSON data from:', geojsonUrl);
            
            const response = await fetch(geojsonUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status}`);
            }
            
            const geoJsonData = await response.json();
            console.log('GeoJSON data loaded:', geoJsonData);
            
            // Store the trip data for the detail panel
            setSelectedTripData(geoJsonData);
            
            // Show the detail panel
            setShowDetailPanel(true);
            
            // Ensure map style is loaded
            if (!mapInstance.isStyleLoaded()) {
                mapInstance.once('style.load', () => {
                    addTripLayerToMap(mapInstance, geoJsonData, trip);
                });
            } else {
                addTripLayerToMap(mapInstance, geoJsonData, trip);
            }
            
        } catch (error) {
            console.error('Error loading trip data:', error);
            alert(`Error loading data for trip ${trip.identifier}: ${error.message}`);
        } finally {
            setLoadingDeviceData(false);
        }
    };
    
    // Handler to go back to trips list
    const handleBackToTrips = () => {
        setShowDetailPanel(false);
        setSelectedTrip(null);
        setSelectedTripData(null);
        setSelectedDayIndex(null);
        
        // Clean up map layers
        const mapInstance = window.map;
        if (mapInstance) {
            cleanupDeviceLayers(mapInstance);
            // Also remove selected day layer if it exists
            if (mapInstance.getLayer('trip-trips-points-selected')) {
                mapInstance.removeLayer('trip-trips-points-selected');
            }
        }
    };
    
    // Handler for day selection
    const handleDayClick = (dayIndex, dayDate) => {
        setSelectedDayIndex(dayIndex);
        
        if (!selectedTripData || !selectedTripData.features) {
            return;
        }
        
        const mapInstance = window.map;
        if (!mapInstance || !mapInstance.getSource('trip-trips')) {
            return;
        }
        
        // Calculate the target date string in Mexico City timezone (YYYY-MM-DD format)
        const mexicoTz = 'America/Mexico_City';
        const targetDateStr = dayDate.toLocaleDateString('en-CA', { timeZone: mexicoTz });
        
        console.log('Day selection:', { 
            dayIndex, 
            dayDate,
            targetDateStr
        });
        
        // Filter features that belong to the selected day
        // Use the same logic as calculateDaysFromFeatures
        const matchedFeatures = selectedTripData.features.filter(feature => {
            const props = feature.properties || {};
            const timestamp = props.utc_timestamp || props.timestamp;
            
            if (!timestamp) return false;
            
            // Convert timestamp to date
            let date;
            if (timestamp < 10000000000) {
                date = new Date(timestamp * 1000);
            } else {
                date = new Date(timestamp);
            }
            
            if (isNaN(date.getTime())) return false;
            
            // Get date in Mexico City timezone and format as YYYY-MM-DD
            const featureDateStr = date.toLocaleDateString('en-CA', { timeZone: mexicoTz });
            
            return featureDateStr === targetDateStr;
        });
        
        console.log(`Found ${matchedFeatures.length} features for day ${targetDateStr}`);
        
        if (matchedFeatures.length === 0) {
            console.warn('No features found for selected day');
            return;
        }
        
        // Ensure original data is still in the source
        if (selectedTripData) {
            mapInstance.getSource('trip-trips').setData(selectedTripData);
        }
        
        // Remove existing selected day layer if it exists
        if (mapInstance.getLayer('trip-trips-points-selected')) {
            mapInstance.removeLayer('trip-trips-points-selected');
        }
        
        // Create a GeoJSON with only the matched features
        const matchedGeoJson = {
            type: 'FeatureCollection',
            features: matchedFeatures
        };
        
        // Add a new source for the selected day features
        if (mapInstance.getSource('trip-trips-selected')) {
            mapInstance.removeSource('trip-trips-selected');
        }
        
        mapInstance.addSource('trip-trips-selected', {
            type: 'geojson',
            data: matchedGeoJson
        });
        
        // Add a new layer on top that shows selected day features in green
        if (mapInstance.getLayer('trip-trips-points')) {
            mapInstance.addLayer({
                id: 'trip-trips-points-selected',
                type: 'circle',
                source: 'trip-trips-selected',
                paint: {
                    'circle-color': '#00FF00', // Green for selected day
                    'circle-radius': 10, // Larger for selected day
                    'circle-opacity': 1.0, // Full opacity
                    'circle-stroke-color': '#FFFF00', // Yellow border
                    'circle-stroke-width': 3
                }
            }, 'trip-trips-points'); // Insert after the original points layer so it appears on top
            
            // Add click event listener for the selected day points
            mapInstance.on('click', 'trip-trips-points-selected', handlePhoneLocationClick);
            mapInstance.on('mouseenter', 'trip-trips-points-selected', () => {
                mapInstance.getCanvas().style.cursor = 'pointer';
            });
            mapInstance.on('mouseleave', 'trip-trips-points-selected', () => {
                mapInstance.getCanvas().style.cursor = '';
            });
        }
        
        // Zoom to the matched locations
        const coordinates = matchedFeatures
            .filter(feature => feature.geometry && feature.geometry.coordinates)
            .map(feature => feature.geometry.coordinates);
        
        if (coordinates.length > 0) {
            const bounds = coordinates.reduce((bounds, coord) => {
                return bounds.extend(coord);
            }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
            
            mapInstance.fitBounds(bounds, {
                padding: 50,
                maxZoom: 15,
                duration: 1000
            });
        }
    };
    
    // Handler to clear day selection (show all data)
    const handleClearDaySelection = () => {
        setSelectedDayIndex(null);
        
        // Remove the selected day layer and source
        const mapInstance = window.map;
        if (mapInstance) {
            if (mapInstance.getLayer('trip-trips-points-selected')) {
                mapInstance.off('click', 'trip-trips-points-selected', handlePhoneLocationClick);
                mapInstance.off('mouseenter', 'trip-trips-points-selected');
                mapInstance.off('mouseleave', 'trip-trips-points-selected');
                mapInstance.removeLayer('trip-trips-points-selected');
            }
            if (mapInstance.getSource('trip-trips-selected')) {
                mapInstance.removeSource('trip-trips-selected');
            }
        }
    };
    
    // Helper function to calculate days from GeoJSON features
    const calculateDaysFromFeatures = (geoJsonData) => {
        if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
            return [];
        }
        
        // Get all unique days from timestamps
        const daysSet = new Set();
        
        geoJsonData.features.forEach(feature => {
            const props = feature.properties || {};
            const timestamp = props.utc_timestamp || props.timestamp;
            
            if (timestamp) {
                // Convert timestamp to date
                let date;
                if (timestamp < 10000000000) {
                    date = new Date(timestamp * 1000);
                } else {
                    date = new Date(timestamp);
                }
                
                if (!isNaN(date.getTime())) {
                    // Get date in Mexico City timezone and format as YYYY-MM-DD
                    const mexicoTz = 'America/Mexico_City';
                    const dateStr = date.toLocaleDateString('en-CA', { timeZone: mexicoTz });
                    daysSet.add(dateStr);
                }
            }
        });
        
        // Convert to sorted array of date strings
        const days = Array.from(daysSet).sort();
        
        // Convert to Date objects for display
        return days.map(dayStr => {
            const [year, month, day] = dayStr.split('-');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        });
    };
    
    // Helper function to add trip layer to map
    const addTripLayerToMap = (mapInstance, geoJsonData, trip) => {
        // Add the GeoJSON source
        mapInstance.addSource('trip-trips', {
            type: 'geojson',
            data: geoJsonData
        });
        
        // Add line layer for trip paths
        mapInstance.addLayer({
            id: 'trip-trips',
            type: 'line',
            source: 'trip-trips',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#00FF00',
                'line-width': 3,
                'line-opacity': 0.8
            }
        });
        
        // Add point layer for trip points with conditional styling
        // Use utc_timestamp if available, otherwise fall back to timestamp
        mapInstance.addLayer({
            id: 'trip-trips-points',
            type: 'circle',
            source: 'trip-trips',
            paint: {
                'circle-color': [
                    'case',
                    [
                        'all',
                        ['>=', ['coalesce', ['get', 'utc_timestamp'], ['get', 'timestamp'], 0], 0],
                        [
                            'any',
                            ['>=', ['%', ['/', ['coalesce', ['get', 'utc_timestamp'], ['get', 'timestamp'], 0], 1000], 86400], 43200], // 12pm (43200 seconds)
                            ['<=', ['%', ['/', ['coalesce', ['get', 'utc_timestamp'], ['get', 'timestamp'], 0], 1000], 86400], 14400]  // 4am (14400 seconds)
                        ]
                    ],
                    '#FF0000', // Red for night time (12pm-4am)
                    '#00FF00'  // Green for other times
                ],
                'circle-radius': [
                    'case',
                    [
                        'all',
                        ['>=', ['coalesce', ['get', 'utc_timestamp'], ['get', 'timestamp'], 0], 0],
                        [
                            'any',
                            ['>=', ['%', ['/', ['coalesce', ['get', 'utc_timestamp'], ['get', 'timestamp'], 0], 1000], 86400], 43200], // 12pm
                            ['<=', ['%', ['/', ['coalesce', ['get', 'utc_timestamp'], ['get', 'timestamp'], 0], 1000], 86400], 14400]  // 4am
                        ]
                    ],
                    8,  // Bigger circle for night time
                    4   // Normal size for other times
                ],
                'circle-opacity': 0.8,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2
            }
        });

        // Add click event listener for phone location tooltips
        mapInstance.on('click', 'trip-trips-points', handlePhoneLocationClick);
        
        // Change cursor on hover
        mapInstance.on('mouseenter', 'trip-trips-points', () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
        });
        
        mapInstance.on('mouseleave', 'trip-trips-points', () => {
            mapInstance.getCanvas().style.cursor = '';
        });
        
        // Fit map to the bounds of the data
        if (geoJsonData.features && geoJsonData.features.length > 0) {
            const coordinates = geoJsonData.features
                .filter(feature => feature.geometry && feature.geometry.coordinates)
                .map(feature => feature.geometry.coordinates);
            
            if (coordinates.length > 0) {
                const bounds = coordinates.reduce((bounds, coord) => {
                    return bounds.extend(coord);
                }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                
                mapInstance.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 15
                });
            }
        }
        
        console.log(`Trip ${trip.identifier} data displayed on map`);
    };
    
    // Handler for file click - fetch and display GeoJSON data on map
    const handleFileClick = async (tripData) => {
        setLoadingDeviceData(true);
        
        try {
            // Get the global map instance
            const mapInstance = window.map;
            if (!mapInstance) {
                throw new Error('Map instance not available');
            }
            
            // Clean up any existing device layers
            cleanupDeviceLayers(mapInstance);
            
            // Use the trip data directly
            const geoJsonData = tripData.data;
            console.log('GeoJSON data loaded:', geoJsonData);
            
            // Ensure map style is loaded
            if (!mapInstance.isStyleLoaded()) {
                mapInstance.once('style.load', () => {
                    addFileLayerToMap(mapInstance, geoJsonData, tripData);
                });
            } else {
                addFileLayerToMap(mapInstance, geoJsonData, tripData);
            }
            
        } catch (error) {
            console.error('Error loading file data:', error);
            alert(`Error loading data for file ${tripData.filename}: ${error.message}`);
        } finally {
            setLoadingDeviceData(false);
        }
    };

    // Handler for device click - fetch and display GeoJSON data on map
    const handleDeviceClick = async (device) => {
        if (!device.file_urls || device.file_urls.length === 0) {
            console.warn('No file URLs available for device:', device.device_id);
            return;
        }
        
        setSelectedDevice(device);
        setLoadingDeviceData(true);
        
        try {
            // Get the global map instance
            const mapInstance = window.map;
            if (!mapInstance) {
                throw new Error('Map instance not available');
            }
            
            // Clean up any existing device layers
            cleanupDeviceLayers(mapInstance);
            
            // Fetch GeoJSON data from the first file URL (or you could combine multiple files)
            const fileUrl = device.file_urls[0];
            console.log('Fetching GeoJSON data from:', fileUrl);
            
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status}`);
            }
            
            const geoJsonData = await response.json();
            console.log('GeoJSON data loaded:', geoJsonData);

            // Ensure map style is loaded
            if (!mapInstance.isStyleLoaded()) {
                mapInstance.once('style.load', () => {
                    addDeviceLayerToMap(mapInstance, geoJsonData, device);
                });
            } else {
                addDeviceLayerToMap(mapInstance, geoJsonData, device);
            }
            
        } catch (error) {
            console.error('Error loading device data:', error);
            alert(`Error loading data for device ${device.device_id}: ${error.message}`);
        } finally {
            setLoadingDeviceData(false);
        }
    };
    
    // Helper function to clean up existing device layers
    const cleanupDeviceLayers = (mapInstance) => {
        const layersToRemove = ['device-trips', 'device-trips-points', 'file-trips', 'file-trips-points', 'trip-trips', 'trip-trips-points', 'trip-trips-points-selected'];
        const sourcesToRemove = ['device-trips', 'file-trips', 'trip-trips', 'trip-trips-selected'];
        
        try {
            // Remove event listeners first
            mapInstance.off('click', 'device-trips-points', handlePhoneLocationClick);
            mapInstance.off('click', 'file-trips-points', handlePhoneLocationClick);
            mapInstance.off('click', 'trip-trips-points', handlePhoneLocationClick);
            mapInstance.off('click', 'trip-trips-points-selected', handlePhoneLocationClick);
            mapInstance.off('mouseenter', 'device-trips-points');
            mapInstance.off('mouseleave', 'device-trips-points');
            mapInstance.off('mouseenter', 'file-trips-points');
            mapInstance.off('mouseleave', 'file-trips-points');
            mapInstance.off('mouseenter', 'trip-trips-points');
            mapInstance.off('mouseleave', 'trip-trips-points');
            mapInstance.off('mouseenter', 'trip-trips-points-selected');
            mapInstance.off('mouseleave', 'trip-trips-points-selected');
            
            // Remove layers
            layersToRemove.forEach(layerId => {
                if (mapInstance.getLayer(layerId)) {
                    mapInstance.removeLayer(layerId);
                }
            });
            
            // Remove sources after layers are removed
            sourcesToRemove.forEach(sourceId => {
                if (mapInstance.getSource(sourceId)) {
                    mapInstance.removeSource(sourceId);
                }
            });
            
            // Close any open tooltip and popup
            setPhoneLocationTooltip(null);
            if (window.phoneLocationPopup) {
                window.phoneLocationPopup.remove();
                window.phoneLocationPopup = null;
            }
        } catch (error) {
            console.warn('Error cleaning up device layers:', error);
            // Continue execution even if cleanup fails
        }
    };

    // Helper function to handle phone location clicks
    const handlePhoneLocationClick = (e) => {
        if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates.slice();
            const properties = feature.properties;

            // Format timestamp - handle both Unix timestamp (seconds) and milliseconds
            const formatTimestamp = (timestamp) => {
                if (!timestamp) return 'N/A';
                
                // Convert to milliseconds if it's in seconds (Unix timestamp)
                let date;
                if (timestamp < 10000000000) {
                    // If timestamp is less than 10 billion, it's likely in seconds
                    date = new Date(timestamp * 1000);
                } else {
                    // Otherwise assume it's already in milliseconds
                    date = new Date(timestamp);
                }
                
                // Check if date is valid
                if (isNaN(date.getTime())) {
                    return 'Invalid timestamp';
                }
                
                return date.toLocaleString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'America/Mexico_City'
                });
            };

            // Format accuracy
            const formatAccuracy = (accuracy) => {
                if (!accuracy) return 'N/A';
                return `${Math.round(accuracy)}m`;
            };

            // Create popup content
            const popupContent = `
                <div style="
                    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; 
                    font-size: 14px; 
                    line-height: 1.5;
                    padding: 16px;
                    min-width: 200px;
                ">
                    <div style="
                        font-weight: 600; 
                        margin-bottom: 12px; 
                        color: #333;
                        font-size: 16px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 8px;
                    ">📍 Ubicación</div>
                    <div style="margin-bottom: 8px; color: #555;">🕐 ${formatTimestamp(properties.utc_timestamp)}</div>
                    <div style="margin-bottom: 8px; color: #555;">📍 ${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}</div>
                    <div style="color: #555;">🎯 Precisión: ${formatAccuracy(properties.horizontal_accuracy)}</div>
                </div>
            `;

            // Remove any existing popup
            if (window.phoneLocationPopup) {
                window.phoneLocationPopup.remove();
            }

            // Create new popup
            window.phoneLocationPopup = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                offset: 25
            })
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(window.map);
        }
    };

    // Helper function to close phone location tooltip
    const closePhoneLocationTooltip = () => {
        setPhoneLocationTooltip(null);
    };
    
    // Helper function to add device layer to map
    const addDeviceLayerToMap = (mapInstance, geoJsonData, device) => {
        // Add the GeoJSON source
        mapInstance.addSource('device-trips', {
            type: 'geojson',
            data: geoJsonData
        });
        
        // Add line layer for trip paths
        mapInstance.addLayer({
            id: 'device-trips',
            type: 'line',
            source: 'device-trips',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#FFA500',
                'line-width': 3,
                'line-opacity': 0.8
            },
            filter: ['==', ['get', 'device_id'], device.device_id]
        });
        
        // Add point layer for trip points with conditional styling
        mapInstance.addLayer({
            id: 'device-trips-points',
            type: 'circle',
            source: 'device-trips',
            paint: {
                'circle-color': [
                    'case',
                    [
                        'all',
                        ['>=', ['get', 'timestamp'], 0],
                        [
                            'any',
                            ['>=', ['%', ['/', ['get', 'timestamp'], 1000], 86400], 43200], // 12pm (43200 seconds)
                            ['<=', ['%', ['/', ['get', 'timestamp'], 1000], 86400], 14400]  // 4am (14400 seconds)
                        ]
                    ],
                    '#FF0000', // Red for night time (12pm-4am)
                    '#FFA500'  // Orange for other times
                ],
                'circle-radius': [
                    'case',
                    [
                        'all',
                        ['>=', ['get', 'timestamp'], 0],
                        [
                            'any',
                            ['>=', ['%', ['/', ['get', 'timestamp'], 1000], 86400], 43200], // 12pm
                            ['<=', ['%', ['/', ['get', 'timestamp'], 1000], 86400], 14400]  // 4am
                        ]
                    ],
                    8,  // Bigger circle for night time
                    4   // Normal size for other times
                ],
                'circle-opacity': 0.8,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2
            },
            filter: ['==', ['get', 'device_id'], device.device_id]
        });

        // Add click event listener for phone location tooltips
        mapInstance.on('click', 'device-trips-points', handlePhoneLocationClick);
        
        // Change cursor on hover
        mapInstance.on('mouseenter', 'device-trips-points', () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
        });
        
        mapInstance.on('mouseleave', 'device-trips-points', () => {
            mapInstance.getCanvas().style.cursor = '';
        });
        
        // Fit map to the bounds of the data
        if (geoJsonData.features && geoJsonData.features.length > 0) {
            const coordinates = geoJsonData.features
                .filter(feature => feature.geometry && feature.geometry.coordinates)
                .map(feature => feature.geometry.coordinates);
            
            if (coordinates.length > 0) {
                const bounds = coordinates.reduce((bounds, coord) => {
                    return bounds.extend(coord);
                }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                
                mapInstance.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 15
                });
            }
        }
        
        console.log(`Device ${device.device_id} data displayed on map`);
    };
    
    // Helper function to add file layer to map
    const addFileLayerToMap = (mapInstance, geoJsonData, tripData) => {
        // Add the GeoJSON source
        mapInstance.addSource('file-trips', {
            type: 'geojson',
            data: geoJsonData
        });
        
        // Add line layer for trip paths
        mapInstance.addLayer({
            id: 'file-trips',
            type: 'line',
            source: 'file-trips',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#00FF00',
                'line-width': 3,
                'line-opacity': 0.8
            }
        });
        
        // Add point layer for trip points with conditional styling
        mapInstance.addLayer({
            id: 'file-trips-points',
            type: 'circle',
            source: 'file-trips',
            paint: {
                'circle-color': [
                    'case',
                    [
                        'all',
                        ['>=', ['get', 'timestamp'], 0],
                        [
                            'any',
                            ['>=', ['%', ['/', ['get', 'timestamp'], 1000], 86400], 43200], // 12pm (43200 seconds)
                            ['<=', ['%', ['/', ['get', 'timestamp'], 1000], 86400], 14400]  // 4am (14400 seconds)
                        ]
                    ],
                    '#FF0000', // Red for night time (12pm-4am)
                    '#00FF00'  // Green for other times
                ],
                'circle-radius': [
                    'case',
                    [
                        'all',
                        ['>=', ['get', 'timestamp'], 0],
                        [
                            'any',
                            ['>=', ['%', ['/', ['get', 'timestamp'], 1000], 86400], 43200], // 12pm
                            ['<=', ['%', ['/', ['get', 'timestamp'], 1000], 86400], 14400]  // 4am
                        ]
                    ],
                    8,  // Bigger circle for night time
                    4   // Normal size for other times
                ],
                'circle-opacity': 0.8,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2
            }
        });

        // Add click event listener for phone location tooltips
        mapInstance.on('click', 'file-trips-points', handlePhoneLocationClick);
        
        // Change cursor on hover
        mapInstance.on('mouseenter', 'file-trips-points', () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
        });
        
        mapInstance.on('mouseleave', 'file-trips-points', () => {
            mapInstance.getCanvas().style.cursor = '';
        });
        
        // Fit map to the bounds of the data
        if (geoJsonData.features && geoJsonData.features.length > 0) {
            const coordinates = geoJsonData.features
                .filter(feature => feature.geometry && feature.geometry.coordinates)
                .map(feature => feature.geometry.coordinates);
            
            if (coordinates.length > 0) {
                const bounds = coordinates.reduce((bounds, coord) => {
                    return bounds.extend(coord);
                }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                
                mapInstance.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 15
                });
            }
        }
        
        console.log(`File ${tripData.filename} data displayed on map`);
    };
    
    // Helper function to extract device information from trip data
    const extractDeviceInfoFromTripData = (tripData) => {
        if (!tripData.data || !tripData.data.features || tripData.data.features.length === 0) {
            return null;
        }
        
        const features = tripData.data.features;
        const deviceMap = new Map();
        
        // Process all features to extract device information
        features.forEach(feature => {
            const deviceId = feature.properties.device_id;
            const timestamp = feature.properties.utc_timestamp;
            
            if (!deviceId) return;
            
            if (!deviceMap.has(deviceId)) {
                deviceMap.set(deviceId, {
                    device_id: deviceId,
                    id_type: feature.properties.id_type,
                    country: feature.properties.country,
                    iso_country_code: feature.properties.iso_country_code,
                    trip_count: 0,
                    first_seen: timestamp,
                    last_seen: timestamp,
                    trips: []
                });
            }
            
            const device = deviceMap.get(deviceId);
            device.trip_count++;
            device.trips.push(timestamp);
            
            if (timestamp < device.first_seen) {
                device.first_seen = timestamp;
            }
            if (timestamp > device.last_seen) {
                device.last_seen = timestamp;
            }
        });
        
        // Return the first (and likely only) device from this file
        const devices = Array.from(deviceMap.values());
        return devices.length > 0 ? devices[0] : null;
    };
    
    // Helper function to process trip data and update grouped trips
    const processTripData = (tripData, currentGroupedTrips) => {
        const newGroupedTrips = { ...currentGroupedTrips };
        
        tripData.data.features.forEach(feature => {
            const countryCode = feature.properties.iso_country_code || 'US';
            const countryName = feature.properties.country || 'United States of America';
            
            if (!newGroupedTrips[countryCode]) {
                newGroupedTrips[countryCode] = {
                    name: countryName,
                    count: 0,
                    trips: [],
                    uniqueDevices: new Set()
                };
            }
            
            // Add device to unique devices set
            const deviceId = feature.properties.device_id;
            if (deviceId) {
                newGroupedTrips[countryCode].uniqueDevices.add(deviceId);
                newGroupedTrips[countryCode].count = newGroupedTrips[countryCode].uniqueDevices.size;
            }
            
            newGroupedTrips[countryCode].trips.push(tripData);
        });
        
        // Sort countries by unique device count (descending)
        const sortedGroupedTrips = {};
        Object.entries(newGroupedTrips)
            .sort(([,a], [,b]) => b.count - a.count)
            .forEach(([countryCode, countryData]) => {
                sortedGroupedTrips[countryCode] = countryData;
            });
        
        return sortedGroupedTrips;
    };

    // Function to fetch additional trips from the trips directory
    const fetchAdditionalTripsData = async () => {
        try {
            setLoadingAdditionalTrips(true);
            
            // Fetch trip files from the trips directory
            let tripFiles = [];
            
            try {
                const listResponse = await fetch('/api/trips/list?directory=trips');
                if (listResponse.ok) {
                    const responseData = await listResponse.json();
                    console.log('Additional trips API Response:', responseData);
                    if (responseData.status === 'success' && responseData.data && responseData.data.trip_files) {
                        tripFiles = responseData.data.trip_files;
                        console.log('Found additional trip files:', tripFiles);
                    }
                }
            } catch (listError) {
                console.log('No hay endpoint backend para archivos adicionales de viajes:', listError);
            }
            
            // If no backend endpoint or no files, try to fetch known files
            if (!tripFiles || tripFiles.length === 0) {
                // Known additional trip files - you can add more here
                const knownAdditionalFiles = [
                    // Add known files from trips directory here
                    // 'device-id-2025-09-01.geojson',
                ];
                
                tripFiles = knownAdditionalFiles.map(filename => ({
                    filename: filename,
                    url: `https://distritosmexico.s3.us-east-2.amazonaws.com/trips/${filename}`
                }));
            }
            
            // Ensure tripFiles is an array
            if (!Array.isArray(tripFiles)) {
                tripFiles = [];
            }
            
            console.log('Final additional tripFiles:', tripFiles);
            
            // Initialize progressive loading for additional trips
            setTotalAdditionalFilesCount(tripFiles.length);
            setFetchingAdditionalFiles(true);
            setFetchedAdditionalFilesCount(0);
            
            // Fetch files one by one and update UI immediately as each completes
            const allAdditionalTripsData = [];
            let completedCount = 0;
            
            // Process files sequentially to update UI immediately
            for (const fileInfo of tripFiles) {
                try {
                    const response = await fetch(fileInfo.url);
                    if (response.ok) {
                        const data = await response.json();
                        const tripData = {
                            filename: fileInfo.filename,
                            data: data,
                            url: fileInfo.url
                        };
                        
                        allAdditionalTripsData.push(tripData);
                        
                        // Update UI immediately as each file is loaded
                        setAdditionalTripsData([...allAdditionalTripsData]);
                    }
                } catch (error) {
                    console.warn(`Failed to fetch additional ${fileInfo.filename}:`, error);
                }
                
                // Update progress after each file
                completedCount++;
                setFetchedAdditionalFilesCount(completedCount);
            }
            
            setAdditionalTripsData(allAdditionalTripsData);
            
        } catch (err) {
            console.error('Error obteniendo datos adicionales de viajes:', err);
        } finally {
            setLoadingAdditionalTrips(false);
            setFetchingAdditionalFiles(false);
        }
    };

    // Fetch trips data from all files in the trips directory
    React.useEffect(() => {
        const fetchAllTripsData = async () => {
            try {
                setLoading(true);
                
                // Check if we're on the mundial-2025 route
                const isMundial2025 = window.location.pathname === '/proyectos/mundial-2025';
                
                if (isMundial2025) {
                    // Fetch from analysis.json for mundial-2025
                    try {
                        const analysisResponse = await fetch('https://distritosmexico.s3.us-east-2.amazonaws.com/geojsons/analysis.json');
                        if (!analysisResponse.ok) {
                            throw new Error(`Failed to fetch analysis.json: ${analysisResponse.status}`);
                        }
                        
                        const analysisData = await analysisResponse.json();
                        console.log('Analysis data loaded:', analysisData);
                        
                        // Transform analysis.json data into groupedTrips format
                        // New format: country codes as top-level keys, each with an array of trip objects
                        const newGroupedTrips = {};
                        
                        // Process each country code in the analysis data
                        Object.entries(analysisData).forEach(([countryCode, tripsArray]) => {
                            if (Array.isArray(tripsArray) && tripsArray.length > 0) {
                                newGroupedTrips[countryCode] = {
                                    name: countryNames[countryCode] || countryCode,
                                    count: tripsArray.length, // Number of trips
                                    trips: tripsArray, // Store the trips array
                                    uniqueDevices: new Set()
                                };
                        }
                        });
                        
                        // Sort countries by trip count (descending)
                        const sortedGroupedTrips = {};
                        Object.entries(newGroupedTrips)
                            .sort(([,a], [,b]) => b.count - a.count)
                            .forEach(([countryCode, countryData]) => {
                                sortedGroupedTrips[countryCode] = countryData;
                            });
                        
                        setGroupedTrips(sortedGroupedTrips);
                        setTripsData([]); // No individual trip data for analysis.json mode
                        setLoading(false);
                        setFetchingFiles(false);
                        
                        return; // Exit early, don't fetch additional trips
                    } catch (analysisError) {
                        console.error('Error fetching analysis.json:', analysisError);
                        setError(`Error cargando datos de análisis: ${analysisError.message}`);
                        setLoading(false);
                        setFetchingFiles(false);
                        return;
                    }
                }
                
                // Original logic for non-mundial-2025 routes
                // First, try to get a list of trip files from a backend endpoint
                // If that doesn't exist, we'll try to fetch known files
                let tripFiles = [];
                
                try {
                    // Try to fetch a list of trip files from backend
                    const listResponse = await fetch('/api/trips/list');
                    if (listResponse.ok) {
                        const responseData = await listResponse.json();
                        console.log('API Response:', responseData);
                        if (responseData.status === 'success' && responseData.data && responseData.data.trip_files) {
                            tripFiles = responseData.data.trip_files;
                            console.log('Found trip files:', tripFiles);
                        }
                    }
                } catch (listError) {
                    console.log('No hay endpoint backend para lista de archivos de viajes, intentando archivos conocidos:', listError);
                }
                
                // If no backend endpoint or no files, try to fetch known files based on patterns
                if (!tripFiles || tripFiles.length === 0) {
                    // Known trip files - you can add more here
                    const knownFiles = [
                        '000545a1-9a11-4e5e-aefb-84c28cdb670d-2025-09-01.geojson',
                        // Add more known trip files here
                        // 'another-device-id-2025-09-02.geojson',
                        // 'yet-another-device-id-2025-09-03.geojson',
                    ];
                    
                    tripFiles = knownFiles.map(filename => ({
                        filename: filename,
                        url: `https://distritosmexico.s3.us-east-2.amazonaws.com/trips/${filename}`
                    }));
                }
                
                // Ensure tripFiles is an array
                if (!Array.isArray(tripFiles)) {
                    tripFiles = [];
                }
                
                console.log('Final tripFiles:', tripFiles);
                
                // Initialize progressive loading
                setTotalFilesCount(tripFiles.length);
                setFetchingFiles(true);
                setFetchedFilesCount(0);
                
                // Initialize empty grouped trips for progressive updates
                let currentGroupedTrips = {};
                setGroupedTrips(currentGroupedTrips);
                
                // Fetch files one by one and update UI immediately as each completes
                const allTripsData = [];
                let completedCount = 0;
                
                // Process files sequentially to update UI immediately
                for (const fileInfo of tripFiles) {
                    try {
                        const response = await fetch(fileInfo.url);
                        if (response.ok) {
                            const data = await response.json();
                            const tripData = {
                                filename: fileInfo.filename,
                                data: data,
                                url: fileInfo.url
                            };
                            
                            // Process this trip data immediately and update UI
                            currentGroupedTrips = processTripData(tripData, currentGroupedTrips);
                            setGroupedTrips(currentGroupedTrips);
                            
                            allTripsData.push(tripData);
                        }
                    } catch (error) {
                        console.warn(`Failed to fetch ${fileInfo.filename}:`, error);
                    }
                    
                    // Update progress after each file
                    completedCount++;
                    setFetchedFilesCount(completedCount);
                }
                
                const validTrips = allTripsData;
                
                if (validTrips.length === 0) {
                    throw new Error('No se pudieron obtener archivos de viajes válidos');
                }
                
                // Data is already processed progressively, just set the trips data
                setTripsData(validTrips);
                
                // Hide loading after first batch (trips-consolidated) completes
                setLoading(false);
                setFetchingFiles(false);
                
                // After first set is loaded, fetch additional trips
                await fetchAdditionalTripsData();
                
            } catch (err) {
                setError(err.message);
                console.error('Error obteniendo datos de viajes:', err);
                setLoading(false);
                setFetchingFiles(false);
            }
        };

        fetchAllTripsData();
    }, []);


    // If showing detail panel, render it instead
    if (showDetailPanel && selectedTrip && selectedTripData) {
        const days = calculateDaysFromFeatures(selectedTripData);
        
        return (
            <div className="trips-panel">
                <div className="trips-header">
                    <div className="trips-header-info">
                        <button className="back-button" onClick={handleBackToTrips}>
                            ← Atrás
                        </button>
                        <div className="trips-header-details">
                            <h3>Detalle del Viaje</h3>
                        </div>
                    </div>
                </div>
                <div className="trips-content">
                    {/* Trip Information */}
                    <div className="trip-detail-section">
                        <div className="trip-detail-item">
                            <div className="trip-info">
                                <div className="trip-header">
                                    <div className="trip-identifier">{selectedTrip.identifier.substring(0, 20)}...</div>
                                    <div className="trip-pings-badge">{selectedTrip.pings} pings</div>
                                </div>
                                <div className="trip-timestamps">
                                    <div className="timestamp">
                                        <div className="timestamp-content">
                                            <span className="timestamp-label">Inicio</span>
                                            <span className="timestamp-value">
                                                {new Date(selectedTrip.startDate.replace(' ', 'T')).toLocaleString('es-MX', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="timestamp">
                                        <div className="timestamp-content">
                                            <span className="timestamp-label">Fin</span>
                                            <span className="timestamp-value">
                                                {new Date(selectedTrip.endDate.replace(' ', 'T')).toLocaleString('es-MX', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Daily Segmentation Section */}
                    <div className="daily-segmentation-section">
                        <div className="section-header">
                            <h4 className="section-title">Segmentación Diaria</h4>
                            {selectedDayIndex !== null && (
                                <button className="clear-day-button" onClick={handleClearDaySelection}>
                                    Desactivar selección
                                </button>
                            )}
                        </div>
                        <div className="days-list">
                            {days.length > 0 ? (
                                days.map((day, index) => (
                                    <div 
                                        key={index} 
                                        className={`day-item clickable ${selectedDayIndex === index ? 'selected' : ''}`}
                                        onClick={() => handleDayClick(index, day)}
                                    >
                                        <div className="day-item-content">
                                            <div className="day-item-number">Día {index + 1}</div>
                                            <div className="day-item-date">
                                                {day.toLocaleDateString('es-MX', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-days-message">No hay días disponibles</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="trips-panel">
                <div className="trips-header">
                    <h3>Recorridos</h3>
                </div>
                <div className="trips-content">
                    <div className="error">Error cargando viajes: {error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="trips-panel">
            <div className="trips-header">
                {currentView === 'countries' ? (
                    <h3>Viajes</h3>
                ) : currentView === 'trips' ? (
                    <div className="trips-header-info">
                        <button className="back-button" onClick={handleBackClick}>
                            ← Atrás
                        </button>
                        <div className="trips-header-details">
                            <h3>Viajeros de {selectedCountry && selectedCountry.flag} {selectedCountry && selectedCountry.name}</h3>
                            <p className="trips-count">{tripsInCountry.length} viajes encontrados</p>
                        </div>
                    </div>
                ) : (
                    <div className="devices-header">
                        <button className="back-button" onClick={handleBackClick}>
                            ← Atrás
                        </button>
                        <div className="devices-header-info">
                            <h3>Dispositivos en {selectedCountry && selectedCountry.flag}</h3>
                            <p className="devices-count">{devicesInCountry.length} dispositivos encontrados</p>
                        </div>
                    </div>
                )}
            </div>
            <div className="trips-content">
                {fetchingFiles && (
                    <div className="loading-indicator">
                        <div className="loading-content">
                            <div className="loading-text">Cargando ...</div>
                        </div>
                    </div>
                )}
                {currentView === 'countries' ? (
                    // Countries view
                    Object.entries(groupedTrips).map(([countryCode, countryData]) => (
                        <div key={countryCode} className="country-group">
                            <div 
                                className="country-item clickable" 
                                onClick={() => handleCountryClick(countryCode, countryData)}
                            >
                                <span className="country-flag">
                                    {countryFlags[countryCode] || '🏳️'}
                                </span>
                                <span className="country-name">{countryData.name}</span>
                                <span className="country-count">{countryData.count} {countryData.trips && Array.isArray(countryData.trips) && countryData.trips.length > 0 ? 'viajes' : 'archivos'}</span>
                            </div>
                        </div>
                    ))
                ) : currentView === 'trips' ? (
                    // Trips view - show list of trips for selected country
                    tripsInCountry.map((trip, index) => (
                        <div key={trip.identifier || index} className="trip-group">
                            <div 
                                className={`trip-item clickable ${loadingDeviceData ? 'loading' : ''}`}
                                onClick={() => handleTripClick(trip)}
                            >
                                <div className="trip-info">
                                    <div className="trip-header">
                                        <div className="trip-identifier">{trip.identifier.substring(0, 20)}...</div>
                                        <div className="trip-pings-badge">{trip.pings} pings</div>
                                    </div>
                                    <div className="trip-timestamps">
                                        <div className="timestamp">
                                            <div className="timestamp-content">
                                                <span className="timestamp-label">Inicio</span>
                                                <span className="timestamp-value">
                                                    {new Date(trip.startDate.replace(' ', 'T')).toLocaleString('es-MX', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="timestamp">
                                            <div className="timestamp-content">
                                                <span className="timestamp-label">Fin</span>
                                                <span className="timestamp-value">
                                                    {new Date(trip.endDate.replace(' ', 'T')).toLocaleString('es-MX', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {loadingDeviceData && (
                                    <div className="trip-loading">
                                        <div className="trip-spinner"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    // Devices view
                    devicesInCountry.map((device, index) => (
                        <div key={device.device_id} className="device-group">
                            <div 
                                className={`device-item clickable ${selectedDevice && selectedDevice.device_id === device.device_id ? 'selected' : ''} ${loadingDeviceData && selectedDevice && selectedDevice.device_id === device.device_id ? 'loading' : ''}`}
                                onClick={() => handleDeviceClick(device)}
                            >
                                <div className="device-info">
                                    <div className="device-id">{device.device_id}</div>
                                    <div className="device-details">
                                        <span className="device-trips">{device.trip_count} ubicaciones</span>
                                    
                                    </div>
                                    <div className="device-timestamps">
                                        <div className="timestamp">
                                            <span className="timestamp-label">Primera vez visto:</span>
                                            <span className="timestamp-value">
                                                {new Date(device.first_seen * 1000).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="timestamp">
                                            <span className="timestamp-label">Última vez visto:</span>
                                            <span className="timestamp-value">
                                                {new Date(device.last_seen * 1000).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {loadingDeviceData && selectedDevice && selectedDevice.device_id === device.device_id && (
                                    <div className="device-loading">
                                        <div className="device-spinner"></div>
                                        <span>Cargando datos...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                
                
            </div>
            
        </div>
    );
}

// Make the component available globally
window.TripsPanel = TripsPanel;
