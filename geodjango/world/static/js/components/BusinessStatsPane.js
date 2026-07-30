// Utility function to parse URL parameters for business stats
const parseBusinessStatsURLParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const coordinates = urlParams.get('c');
    const radius = urlParams.get('r');
    const categories = urlParams.get('i');
    
    if (!coordinates || !radius || !categories) {
        return null;
    }
    
    try {
        // Parse coordinates (format: "lat,lng")
        const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
        
        if (isNaN(lat) || isNaN(lng)) {
            return null;
        }
        
        // Parse radius
        const radiusValue = parseInt(radius);
        if (isNaN(radiusValue) || radiusValue <= 0) {
            return null;
        }
        
        // Parse categories (format: "code1,code2,code3")
        const categoryCodes = categories.split(',').map(code => code.trim()).filter(code => code);
        if (categoryCodes.length === 0) {
            return null;
        }
        
        return {
            lat,
            lng,
            radius: radiusValue,
            categoryCodes,
            coordinatesParam: coordinates,
            radiusParam: radius,
            categoriesParam: categories
        };
    } catch (error) {
        console.error('Error parsing URL parameters:', error);
        return null;
    }
};

// BusinessStatsPane component - Displays business statistics in a bottom-left panel
function BusinessStatsPane({ onReturnToWizard }) {
    const [isVisible, setIsVisible] = React.useState(false);
    const [localStatsData, setLocalStatsData] = React.useState(null);
    const [localCategoryColorMapping, setLocalCategoryColorMapping] = React.useState({});
    const [isInitialized, setIsInitialized] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [hasDrawnLocations, setHasDrawnLocations] = React.useState(false);
    const [geocodedAddress, setGeocodedAddress] = React.useState('');
    const [isGeocodingLoading, setIsGeocodingLoading] = React.useState(false);
    const [selectedCategory, setSelectedCategory] = React.useState(null);
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [showIndicatorPane, setShowIndicatorPane] = React.useState(false);
    const [indicatorPaneLoading, setIndicatorPaneLoading] = React.useState(false);

    // Function to scroll parent container up to show buttons
    const scrollToShowButtons = () => {
        const container = document.querySelector('.business-stats-container');
        if (container) {
            
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
            
            // Log the scroll position after a short delay
            setTimeout(() => {
            }, 500);
        } else {
            console.warn('⚠️ Could not find .business-stats-container element');
        }
    };

    // Function to reverse geocode coordinates using Nominatim
    const reverseGeocode = async (lat, lng) => {
        try {
            setIsGeocodingLoading(true);
            console.log('🌍 Starting reverse geocoding for:', { lat, lng });
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es&addressdetails=1&zoom=18`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('🗺️ Nominatim response:', data);
            
            if (data && data.display_name) {
                // Extract relevant parts for a cleaner address
                const address = data.address || {};
                const parts = [];
                
                // Add street information
                if (address.road) {
                    parts.push(address.road);
                    if (address.house_number) {
                        parts[parts.length - 1] = `${address.road} ${address.house_number}`;
                    }
                }
                
                // Add neighborhood or suburb
                if (address.neighbourhood || address.suburb) {
                    parts.push(address.neighbourhood || address.suburb);
                }
                
                // Add city/town
                if (address.city || address.town || address.village) {
                    parts.push(address.city || address.town || address.village);
                }
                
                // Add state/region
                if (address.state) {
                    parts.push(address.state);
                }
                
                const cleanAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
                console.log('✅ Geocoded address:', cleanAddress);
                return cleanAddress;
            } else {
                throw new Error('No address found');
            }
        } catch (error) {
            console.warn('❌ Reverse geocoding failed:', error);
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } finally {
            setIsGeocodingLoading(false);
        }
    };

    // Effect to geocode coordinates when stats data is available
    React.useEffect(() => {
        if (localStatsData && localStatsData.summary && localStatsData.summary.coordinates) {
            const { lat, lng } = localStatsData.summary.coordinates;
            reverseGeocode(lat, lng).then(address => {
                setGeocodedAddress(address);
            });
        }
    }, [localStatsData]);

    // Function to handle component collapse/expand
    const handleToggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Function to handle category selection and map filtering
    const handleCategoryClick = (categoryCode) => {
        if (!window.map || !window.map.getLayer('business-locations-layer')) {
            console.warn('Map or business locations layer not available');
            return;
        }

        try {
            if (selectedCategory === categoryCode) {
                // Deselect category - show all markers
                setSelectedCategory(null);
                window.map.setFilter('business-locations-layer', null);
                console.log('🔄 Showing all business categories');
            } else {
                // Select category - show only this category's markers
                setSelectedCategory(categoryCode);
                window.map.setFilter('business-locations-layer', ['==', ['get', 'category'], categoryCode]);
                console.log('🎯 Filtering to category:', categoryCode);
            }
        } catch (error) {
            console.error('❌ Error filtering map by category:', error);
        }
    };

    // Reset category selection when component unmounts or data changes
    React.useEffect(() => {
        return () => {
            setSelectedCategory(null);
        };
    }, []);

    // Reset category selection when new data loads
    React.useEffect(() => {
        if (localStatsData) {
            setSelectedCategory(null);
        }
    }, [localStatsData]);

    // Effect to scroll to show buttons when indicator pane finishes loading
    React.useEffect(() => {
        if (showIndicatorPane && !indicatorPaneLoading) {
            // Small delay to ensure the indicator pane is fully rendered
            const timer = setTimeout(() => {
                scrollToShowButtons();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [showIndicatorPane, indicatorPaneLoading]);

    // Check for URL parameters and initialize from them if needed
    React.useEffect(() => {
        const currentPath = window.location.pathname;
        
        if (currentPath.startsWith('/negocios/stats') && !localStatsData && !isInitialized) {
            console.log('📊 BusinessStatsPane: Initializing from URL parameters');
            
            const parsedParams = parseBusinessStatsURLParams();
            
            if (parsedParams) {
                const { lat, lng, radius, categoryCodes } = parsedParams;
                
                console.log('📊 BusinessStatsPane: Parsed URL parameters:', parsedParams);
                
                // Track user seeing stats event
                if (window.analyticsService) {
                    window.analyticsService.track('USER_SEEING_STATS', {
                        coordinates: { lat, lng },
                        radius: radius,
                        categories: categoryCodes,
                        url_path: currentPath
                    });
                }
                
                // Create category color mapping - only 3 very distinct colors
                const CATEGORY_COLORS = [
                    '#FF6B6B', // Bright red
                    '#4ECDC4', // Bright teal
                    '#F7DC6F'  // Bright yellow
                ];
                
                const newColorMapping = {};
                categoryCodes.forEach((code, index) => {
                    newColorMapping[code] = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                });
                
                setLocalCategoryColorMapping(newColorMapping);
                
                // Fetch stats data
                fetchStatsFromURL(lat, lng, radius, categoryCodes);
                
                // Draw radius circle and center map
                setTimeout(() => {
                    drawRadiusCircleFromURL(lat, lng, radius);
                    centerMapOnLocation(lat, lng);
                }, 500);
            }
        }
    }, [localStatsData, isInitialized]);

    // Function to fetch stats data from URL parameters
    const fetchStatsFromURL = async (lat, lng, radius, categoryCodes) => {
        try {
            setIsLoading(true);
            console.log('🔄 BusinessStatsPane: Fetching stats data from URL parameters');
            
            const response = await fetch('/api/business/location/stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selected_codes: categoryCodes,
                    coordinates: { lat, lng },
                    radius: radius
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                console.log('✅ BusinessStatsPane: Stats data fetched successfully:', result);
                setLocalStatsData(result.data);
                setIsVisible(true);
            } else {
                throw new Error(result.message || 'Failed to fetch location stats');
            }
            
        } catch (error) {
            console.error('❌ BusinessStatsPane: Error fetching stats data:', error);
            // Show error state or fallback
            setIsVisible(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to draw radius circle from URL parameters
    const drawRadiusCircleFromURL = (lat, lng, radiusInMeters) => {
        if (!window.map) {
            console.warn('⚠️ BusinessStatsPane: Map not available for drawing radius circle');
            return;
        }

        try {
            // Remove existing circle layers first
            const existingLayers = [
                'business-radius-circle',
                'business-radius-circle-border',
                'business-radius-circle-fill',
                'business-radius-circle-border'
            ];
            
            const existingSources = [
                'business-radius-circle',
                'business-radius-circle-border',
                'business-radius-circle-source'
            ];

            existingLayers.forEach(layerId => {
                if (window.map.getLayer && window.map.getLayer(layerId)) {
                    window.map.removeLayer(layerId);
                }
            });

            existingSources.forEach(sourceId => {
                if (window.map.getSource && window.map.getSource(sourceId)) {
                    window.map.removeSource(sourceId);
                }
            });

            // Create circle using turf.js
            const circle = turf.circle([lng, lat], radiusInMeters, {
                steps: 100,
                units: 'meters'
            });

            // Add circle to map
            const addCircleLayer = () => {
                window.map.addLayer({
                    id: 'business-radius-circle',
                    type: 'fill',
                    source: {
                        type: 'geojson',
                        data: circle
                    },
                    layout: {},
                    paint: {
                        'fill-color': '#ff8c00',
                        'fill-opacity': 0.3
                    }
                });

                // Add border for better visibility
                window.map.addLayer({
                    id: 'business-radius-circle-border',
                    type: 'line',
                    source: {
                        type: 'geojson',
                        data: circle
                    },
                    layout: {},
                    paint: {
                        'line-color': '#ff8c00',
                        'line-width': 2,
                        'line-opacity': 0.8
                    }
                });

                console.log('✅ BusinessStatsPane: Radius circle drawn from URL parameters');
            };

            if (window.map.isStyleLoaded()) {
                addCircleLayer();
            } else {
                window.map.once('style.load', addCircleLayer);
            }
        } catch (error) {
            console.error('❌ BusinessStatsPane: Error drawing radius circle:', error);
        }
    };

    // Function to draw center marker from URL parameters
    const drawCenterMarkerFromURL = (lat, lng) => {
        if (!window.map) {
            return;
        }

        try {
            // Remove existing center marker if it exists
            if (window.centerMarker) {
                window.centerMarker.remove();
            }
            
            // Create center marker using the same style as BusinessWizard
            window.centerMarker = new mapboxgl.Marker({
                color: '#10b981',
                draggable: true
            })
            .setLngLat([lng, lat])
            .addTo(window.map);

            // Add drag event handlers
            window.centerMarker.on('dragend', handleMarkerDragEnd);

            console.log('✅ BusinessStatsPane: Center marker drawn from URL parameters at:', { lat, lng });

        } catch (error) {
            console.error('❌ BusinessStatsPane: Error drawing center marker from URL:', error);
        }
    };

    // Function to center map on location
    const centerMapOnLocation = (lat, lng) => {
        if (window.map) {
            window.map.flyTo({
                center: [lng, lat],
                zoom: 15,
                duration: 1500
            });
            console.log('✅ BusinessStatsPane: Map centered on location from URL parameters');
        }
    };

    // Function to handle marker drag end event
    const handleMarkerDragEnd = async (event) => {
        try {
            const newCoordinates = event.target.getLngLat();
            const newLat = newCoordinates.lat;
            const newLng = newCoordinates.lng;
            
            console.log('🎯 Marker dragged to new coordinates:', { lat: newLat, lng: newLng });
            
            // Get current URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const radius = urlParams.get('r');
            const categories = urlParams.get('i');
            
            if (!radius || !categories) {
                console.warn('⚠️ Missing radius or categories in URL parameters');
                return;
            }
            
            // Update URL with new coordinates
            const newCoordinatesParam = `${newLat.toFixed(6)},${newLng.toFixed(6)}`;
            const newURL = `/negocios/stats?c=${newCoordinatesParam}&r=${radius}&i=${categories}`;
            
            // Update browser URL without page reload
            window.history.pushState({}, '', newURL);
            console.log('🔗 URL updated with new coordinates:', newURL);
            
            // Show loading state immediately
            setIsLoading(true);
            setIsVisible(true); // Ensure the pane is visible to show loading state
            
            // Parse category codes
            const categoryCodes = categories.split(',').map(code => code.trim()).filter(code => code);
            
            // Fetch new stats data with updated coordinates
            await fetchStatsFromURL(newLat, newLng, parseInt(radius), categoryCodes);
            
            // Update the radius circle with new coordinates
            drawRadiusCircleFromURL(newLat, newLng, parseInt(radius));
            
            // Update geocoded address
            const newAddress = await reverseGeocode(newLat, newLng);
            setGeocodedAddress(newAddress);
            
            // Reset category selection
            setSelectedCategory(null);
            
            // Clear existing business locations and redraw
            setHasDrawnLocations(false);
            
            console.log('✅ Data refetched and view updated with new coordinates');
            
        } catch (error) {
            console.error('❌ Error handling marker drag:', error);
            // Revert marker position if there was an error
            if (localStatsData && localStatsData.summary) {
                const { coordinates } = localStatsData.summary;
                window.centerMarker.setLngLat([coordinates.lng, coordinates.lat]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Show the pane when stats data is available
    React.useEffect(() => {
        if (localStatsData && localStatsData.summary && !hasDrawnLocations) {
            console.log('📊 BusinessStatsPane: Drawing business locations from local data');
            setIsVisible(true);
            // Draw business locations and radius circle on the map
            drawBusinessLocationsOnMap(localStatsData);
            setHasDrawnLocations(true);
        }
    }, [localStatsData, hasDrawnLocations]);

    // Hide the pane when returning to wizard
    const handleReturnToWizard = () => {
        setIsVisible(false);
        setHasDrawnLocations(false);
        // Clean up map layers when hiding the pane
        cleanupMapLayers();
        
        // Clean up geozone layers
        if (window.cleanupGeozoneLayers) {
            window.cleanupGeozoneLayers();
        }
        
        // Navigate back to review URL if we came from a URL
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/negocios/stats')) {
            const parsedParams = parseBusinessStatsURLParams();
            
            if (parsedParams) {
                const { coordinatesParam, radiusParam, categoriesParam } = parsedParams;
                const reviewURL = `/negocios/review?c=${coordinatesParam}&r=${radiusParam}&i=${categoriesParam}`;
                console.log('🔄 BusinessStatsPane: Navigating back to review URL:', reviewURL);
                
                if (window.navigate) {
                    window.navigate(reviewURL);
                } else {
                    window.history.pushState({}, '', reviewURL);
                }
            }
        }
        
        // Call the global function to return to wizard review state
        if (window.returnToBusinessWizardReview) {
            window.returnToBusinessWizardReview();
        }
        if (onReturnToWizard) {
            onReturnToWizard();
        }
    };

    // Clean up map layers when component unmounts
    React.useEffect(() => {
        return () => {
            console.log('🔄 BusinessStatsPane unmounting, cleaning up...');
            cleanupMapLayers();
            // Remove drag event handler from center marker
            if (window.centerMarker) {
                window.centerMarker.off('dragend', handleMarkerDragEnd);
            }
            // Reset initialization flag
            setIsInitialized(false);
            setHasDrawnLocations(false);
        };
    }, []);

    // Global cleanup function for component switching
    React.useEffect(() => {
        // Register global cleanup function
        window.cleanupBusinessStatsLayers = cleanupMapLayers;
        
        return () => {
            // Remove global cleanup function when component unmounts
            delete window.cleanupBusinessStatsLayers;
        };
    }, []);

    // Global cleanup function for geozone layers
    React.useEffect(() => {
        // Register global cleanup function for geozone layers
        window.cleanupGeozoneLayers = () => {
            if (!window.map) return;
            
            try {
                if (window.map.getLayer('geozone-polygons-layer')) {
                    window.map.removeLayer('geozone-polygons-layer');
                }
                if (window.map.getSource('geozone-polygons-source')) {
                    window.map.removeSource('geozone-polygons-source');
                }
                console.log('🗺️ Cleaned up geozone layers globally');
            } catch (error) {
                console.warn('⚠️ Error cleaning up geozone layers globally:', error);
            }
        };
        
        return () => {
            // Remove global cleanup function when component unmounts
            delete window.cleanupGeozoneLayers;
        };
    }, []);

    // Function to draw business locations on the map
    const drawBusinessLocationsOnMap = (data) => {
        if (!window.map || !data || !data.records) {
            return;
        }

        try {
            // Always clean up existing layers first to prevent duplicates
            cleanupMapLayers();
            
            // Create GeoJSON features for business locations
            const features = data.records.map(record => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [record.geometry.lng, record.geometry.lat]
                },
                properties: {
                    id: record.id,
                    name: record.nom_estab,
                    category: record.codigo_act,
                    categoryName: record.nombre_act,
                    jobs: record.average_jobs,
                    address: `${record.nomb_asent}, ${record.municipio}`,
                    color: localCategoryColorMapping[record.codigo_act] || '#10b981'
                }
            }));

            const geojson = {
                type: 'FeatureCollection',
                features: features
            };

            // Add business locations source
            window.map.addSource('business-locations-source', {
                type: 'geojson',
                data: geojson
            });

            // Create a colored circle image for each category
            const createColoredCircle = (color, size = 24) => {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                // Draw circle with color
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                
                // Add white border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                return canvas;
            };

            // Calculate jobs range for proportional sizing
            if (!data.records || data.records.length === 0) {
                console.warn('⚠️ No business records available');
                return;
            }
            
            const jobsValues = data.records.map(record => record.average_jobs || 0);
            const minJobs = Math.min(...jobsValues);
            const maxJobs = Math.max(...jobsValues);
            const jobsRange = maxJobs - minJobs;
            
            // Ensure we have valid jobs data
            if (jobsValues.every(jobs => jobs === 0)) {
                console.warn('⚠️ No jobs data available, using default marker sizes');
            } else {
                console.log(`📊 Jobs range: ${minJobs} - ${maxJobs} (${jobsRange} range) → Marker sizes: 12-48px`);
            }
            
            // Create individual markers for each business location with proportional sizing based on jobs
            const markerPromises = data.records.map((record) => {
                return new Promise((resolve) => {
                    const jobs = record.average_jobs || 0;
                    const color = localCategoryColorMapping[record.codigo_act] || '#10b981';
                    
                    // Calculate proportional size based on jobs value
                    let size;
                    if (jobsRange === 0) {
                        // All businesses have the same number of jobs, use default size
                        size = 24;
                    } else {
                        // Map jobs to size between 12 and 48 pixels proportionally
                        const normalizedJobs = (jobs - minJobs) / jobsRange;
                        size = Math.max(12, Math.min(48, 12 + (normalizedJobs * 36)));
                    }
                    
                    console.log(`📍 Business ${record.id}: ${jobs} jobs → ${size.toFixed(1)}px marker`);
                    
                    const canvas = createColoredCircle(color, size);
                    const imageId = `business-marker-${record.id}`;
                    
                    // Convert canvas to image data
                    const imageData = canvas.toDataURL();
                    const img = new Image();
                    img.onload = () => {
                        if (window.map.hasImage(imageId)) {
                            window.map.removeImage(imageId);
                        }
                        window.map.addImage(imageId, img);
                        resolve();
                    };
                    img.src = imageData;
                });
            });
            
            // Wait for all images to load before adding layers
            Promise.all(markerPromises).then(() => {
                addBusinessLocationLayers();
            });

            // Separate function to add business location layers (called after images load)
            const addBusinessLocationLayers = () => {
            // Add business locations layer
            window.map.addLayer({
                id: 'business-locations-layer',
                type: 'symbol',
                source: 'business-locations-source',
                layout: {
                    'icon-image': [
                        'case',
                        ['has', 'id'],
                        ['concat', 'business-marker-', ['get', 'id']],
                        'business-marker-0'
                    ],
                    'icon-size': 1,
                    'icon-allow-overlap': true
                }
            });

            // Add hover effect layer
            window.map.addLayer({
                id: 'business-locations-hover',
                type: 'symbol',
                source: 'business-locations-source',
                layout: {
                    'icon-image': [
                        'case',
                        ['has', 'id'],
                        ['concat', 'business-marker-', ['get', 'id']],
                        'business-marker-0'
                    ],
                    'icon-size': 1.2,
                    'icon-allow-overlap': true
                },
                filter: ['==', ['get', 'id'], '']
            });

            // Add hover events for business locations
            let hoveredLocationId = null;

            // Store event handlers for proper cleanup
            window.businessLocationMouseEnterHandler = (e) => {
                window.map.getCanvas().style.cursor = 'pointer';
                
                if (e.features.length > 0) {
                    hoveredLocationId = e.features[0].properties.id;
                    window.map.setFilter('business-locations-hover', ['==', ['get', 'id'], hoveredLocationId]);
                }
            };

            window.businessLocationMouseLeaveHandler = () => {
                window.map.getCanvas().style.cursor = '';
                hoveredLocationId = null;
                window.map.setFilter('business-locations-hover', ['==', ['get', 'id'], '']);
            };

            // Add click event for business locations
            window.businessLocationClickHandler = (e) => {
                if (e.features.length > 0) {
                    const feature = e.features[0];
                    const coordinates = feature.geometry.coordinates.slice();
                    const properties = feature.properties;

                    // Create popup content
                    const popupContent = `
                        <div class="business-popup">
                            <h3>${properties.name || 'Sin nombre'}</h3>
                            <p><strong>Categoría:</strong> ${properties.categoryName}</p>
                            <p><strong>Código:</strong> ${properties.category}</p>
                            <p><strong>Empleos estimados:</strong> ${Math.round(properties.jobs)}</p>
                            <p><strong>Dirección:</strong> ${properties.address}</p>
                        </div>
                    `;

                    // Create and show popup
                    new mapboxgl.Popup()
                        .setLngLat(coordinates)
                        .setHTML(popupContent)
                        .addTo(window.map);
                }
            };

            // Attach event listeners
            window.map.on('mouseenter', 'business-locations-layer', window.businessLocationMouseEnterHandler);
            window.map.on('mouseleave', 'business-locations-layer', window.businessLocationMouseLeaveHandler);
            window.map.on('click', 'business-locations-layer', window.businessLocationClickHandler);
            }; // End of addBusinessLocationLayers function

            // Draw center marker
            drawCenterMarker(data);

            // Draw radius circle
            drawRadiusCircle();

            // Fit map to show all business locations and radius circle
            fitMapToBusinessData();

            // Mark as initialized to prevent duplicate initialization
            setIsInitialized(true);

        } catch (error) {
            console.error('Error drawing business locations on map:', error);
        }
    };

    // Function to draw center marker
    const drawCenterMarker = (data) => {
        if (!window.map || !data || !data.summary) {
            return;
        }

        try {
            const { coordinates } = data.summary;
            
            // Remove existing center marker if it exists
            if (window.centerMarker) {
                window.centerMarker.remove();
            }
            
            // Create center marker using the same style as BusinessWizard
            window.centerMarker = new mapboxgl.Marker({
                color: '#10b981',
                draggable: true
            })
            .setLngLat([coordinates.lng, coordinates.lat])
            .addTo(window.map);

            // Add drag event handlers
            window.centerMarker.on('dragend', handleMarkerDragEnd);

            console.log('✅ Center marker drawn at coordinates:', coordinates);

        } catch (error) {
            console.error('Error drawing center marker:', error);
        }
    };

    // Function to draw radius circle
    const drawRadiusCircle = () => {
        if (!window.map || !localStatsData || !localStatsData.summary) {
            return;
        }

        try {
            const { coordinates, radius_meters } = localStatsData.summary;
            
            // Create circle using turf.js
            const circle = turf.circle([coordinates.lng, coordinates.lat], radius_meters, {
                steps: 100,
                units: 'meters'
            });

            // Add circle source
            window.map.addSource('business-radius-circle-source', {
                type: 'geojson',
                data: circle
            });

            // Add circle fill layer
            window.map.addLayer({
                id: 'business-radius-circle-fill',
                type: 'fill',
                source: 'business-radius-circle-source',
                paint: {
                    'fill-color': '#ff8c00',
                    'fill-opacity': 0.1
                }
            });

            // Add circle border layer
            window.map.addLayer({
                id: 'business-radius-circle-border',
                type: 'line',
                source: 'business-radius-circle-source',
                paint: {
                    'line-color': '#ff8c00',
                    'line-width': 2,
                    'line-opacity': 0.6
                }
            });

        } catch (error) {
            console.error('Error drawing radius circle:', error);
        }
    };

    // Function to fit map to show all business data
    const fitMapToBusinessData = () => {
        if (!window.map || !localStatsData || !localStatsData.records) {
            return;
        }

        try {
            // Create a collection of all points (business locations + center point)
            const allPoints = localStatsData.records.map(record => 
                turf.point([record.geometry.lng, record.geometry.lat])
            );
            
            // Add the center point
            allPoints.push(turf.point([localStatsData.summary.coordinates.lng, localStatsData.summary.coordinates.lat]));

            // Create a feature collection
            const featureCollection = turf.featureCollection(allPoints);

            // Get the bounding box
            const bbox = turf.bbox(featureCollection);

            // Fit the map to the bounding box with padding
            window.map.fitBounds(bbox, {
                padding: {
                    top: 50,
                    bottom: 200, // Extra padding for the stats pane
                    left: 50,
                    right: 50
                },
                duration: 1000
            });

        } catch (error) {
            console.error('Error fitting map to business data:', error);
        }
    };

    // Function to clean up map layers
    const cleanupMapLayers = () => {
        if (!window.map) {
            return;
        }

        try {
            console.log('🧹 Cleaning up BusinessStatsPane map layers...');
            
            // Remove business location layers
            const businessLayers = [
                'business-locations-layer',
                'business-locations-hover'
            ];
            
            const businessSources = [
                'business-locations-source'
            ];

            // Remove radius circle layers
            const radiusLayers = [
                'business-radius-circle-fill',
                'business-radius-circle-border',
                'business-radius-circle'
            ];
            
            const radiusSources = [
                'business-radius-circle-source'
            ];

            // Remove all layers
            [...businessLayers, ...radiusLayers].forEach(layerId => {
                if (window.map.getLayer && window.map.getLayer(layerId)) {
                    window.map.removeLayer(layerId);
                    console.log(`🗑️ Removed layer: ${layerId}`);
                }
            });

            // Remove all sources
            [...businessSources, ...radiusSources].forEach(sourceId => {
                if (window.map.getSource && window.map.getSource(sourceId)) {
                    window.map.removeSource(sourceId);
                    console.log(`🗑️ Removed source: ${sourceId}`);
                }
            });

            // Remove business marker images
            if (localStatsData && localStatsData.records) {
                localStatsData.records.forEach((record) => {
                    const imageId = `business-marker-${record.id}`;
                    if (window.map.hasImage(imageId)) {
                        window.map.removeImage(imageId);
                        console.log(`🗑️ Removed image: ${imageId}`);
                    }
                });
            }

            // Remove center marker
            if (window.centerMarker) {
                // Remove drag event handler before removing marker
                window.centerMarker.off('dragend', handleMarkerDragEnd);
                window.centerMarker.remove();
                window.centerMarker = null;
                console.log('🗑️ Removed center marker');
            }

            // Remove event listeners (store references for proper cleanup)
            if (window.businessLocationClickHandler) {
                window.map.off('click', 'business-locations-layer', window.businessLocationClickHandler);
                delete window.businessLocationClickHandler;
            }
            if (window.businessLocationMouseEnterHandler) {
                window.map.off('mouseenter', 'business-locations-layer', window.businessLocationMouseEnterHandler);
                delete window.businessLocationMouseEnterHandler;
            }
            if (window.businessLocationMouseLeaveHandler) {
                window.map.off('mouseleave', 'business-locations-layer', window.businessLocationMouseLeaveHandler);
                delete window.businessLocationMouseLeaveHandler;
            }

            console.log('✅ BusinessStatsPane map layers cleanup completed');

        } catch (error) {
            console.error('❌ Error cleaning up map layers:', error);
        }
    };

    // Show loading state when data is being fetched
    if (isLoading) {
        return (
            <div className="business-stats-container">
                <div className="business-stats-pane">
                    <div className="business-stats-loading">
                        <h3 className="loading-title">📊 Análisis de Zona</h3>
                        <div className="loading-spinner-container">
                            <div className="address-loading">
                                <svg 
                                    className="address-spinner" 
                                    width="14" 
                                    height="14" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <circle cx="12" cy="12" r="10" opacity="0.3"/>
                                    <path d="M12 2a10 10 0 0 1 10 10" opacity="1"/>
                                </svg>
                                <span>
                                    {!localStatsData ? 'Obteniendo dirección...' : 'Actualizando datos...'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isVisible || !localStatsData) {
        return null;
    }

    const { summary, category_stats } = localStatsData;

    return (
        <div className="business-stats-container">
            <Spacer value={100} />
            <div className="business-stats-pane">
                <div className="stats-header">
                    <h3 className="stats-title">Análisis de Zona</h3>
                    <button 
                        className="stats-toggle-btn"
                        onClick={handleToggleCollapse}
                        type="button"
                        disabled={isLoading}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isCollapsed ? (
                                <path d="m18 15-6-6-6 6"/>
                            ) : (
                                <path d="m6 9 6 6 6-6"/>
                            )}
                        </svg>
                    </button>
                </div>

                {!isCollapsed && (
                    <div className="stats-content">
                    {/* Summary metrics */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-number">{summary.total_businesses}</div>
                            <div className="stat-label">Negocios</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{Math.round(summary.total_jobs)}</div>
                            <div className="stat-label">Empleos</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{summary.radius_meters}m</div>
                            <div className="stat-label">Radio</div>
                        </div>
                    </div>

                    {/* Categories */}
                    {category_stats && Object.keys(category_stats).length > 0 && (
                        <div className="categories-section">
                            <div className="categories-container">
                                <div className="categories-grid">
                                    {Object.entries(category_stats).map(([code, stats]) => {
                                        const isSelected = selectedCategory === code;
                                        const isDimmed = selectedCategory && !isSelected;
                                        
                                        return (
                                            <div 
                                                key={code} 
                                                className={`category-item ${isSelected ? 'category-selected' : ''} ${isDimmed ? 'category-dimmed' : ''}`}
                                                style={{ borderColor: localCategoryColorMapping[code] || '#10b981' }}
                                                onClick={() => handleCategoryClick(code)}
                                            >
                                                <div className="category-info">
                                                    <div className="category-title">
                                                        {stats.category_name}
                                                    </div>
                                                    <div className="category-details">
                                                        <div className="category-detail">{stats.count} negocios</div>
                                                        <div className="category-detail">{Math.round(stats.total_jobs)} personas empleadas</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="content-divider"></div>

                    {/* Area address */}
                    <div className="area-address">
                        <div className="address-text">
                            {isGeocodingLoading ? (
                                <div className="address-loading">
                                    <svg 
                                        className="address-spinner" 
                                        width="14" 
                                        height="14" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" opacity="0.3"/>
                                        <path d="M12 2a10 10 0 0 1 10 10" opacity="1"/>
                                    </svg>
                                    <span>Obteniendo dirección...</span>
                                </div>
                            ) : (
                                geocodedAddress || 
                                (summary.coordinates ? 
                                    `${summary.coordinates.lat.toFixed(4)}, ${summary.coordinates.lng.toFixed(4)}` : 
                                    'Área seleccionada'
                                )
                            )}
                        </div>
                    </div>
                </div>
                )}
            </div>
            {/* BusinessIndicatorPane */}
            {showIndicatorPane && localStatsData && localStatsData.summary && (
                <BusinessIndicatorPane 
                    isVisible={showIndicatorPane}
                    onClose={() => setShowIndicatorPane(false)}
                    coordinates={localStatsData.summary.coordinates}
                    radius={localStatsData.summary.radius_meters}
                    onLoadingComplete={() => {
                        setIndicatorPaneLoading(false);
                    }}
                    onLoadingStart={() => {
                        setIndicatorPaneLoading(true);
                    }}
                />
            )}
            
            {/* Buttons Container */}
            <div className="business-stats-buttons">
                <button 
                    className="otros-indicadores-btn"
                    onClick={() => {
                        // Track user seeing more stats event
                        if (window.analyticsService) {
                            const parsedParams = parseBusinessStatsURLParams();
                            if (parsedParams) {
                                window.analyticsService.track('USER_SEEING_MORE_STATS', {
                                    coordinates: { lat: parsedParams.lat, lng: parsedParams.lng },
                                    radius: parsedParams.radius,
                                    categories: parsedParams.categoryCodes,
                                    action: !showIndicatorPane ? 'open' : 'close'
                                });
                            }
                        }
                        
                        if (!showIndicatorPane) {
                            // Opening the indicator pane
                            setShowIndicatorPane(true);
                            setIndicatorPaneLoading(true);
                        } else {
                            // Closing the indicator pane
                            setShowIndicatorPane(false);
                            setIndicatorPaneLoading(false);
                        }
                        console.log('Otros indicadores clicked');
                    }}
                    type="button"
                    disabled={isLoading || indicatorPaneLoading}
                >
                    {indicatorPaneLoading ? (
                        <svg className="address-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" opacity="0.3"/>
                            <path d="M12 2a10 10 0 0 1 10 10" opacity="1"/>
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    )}
                    {indicatorPaneLoading ? 'Cargando...' : 'Ver más'}
                </button>
                
                <button 
                    className="return-to-review-btn"
                    onClick={() => {
                        // Track user refine selection event
                        if (window.analyticsService) {
                            const parsedParams = parseBusinessStatsURLParams();
                            if (parsedParams) {
                                window.analyticsService.track('USER_REFINE_SELECTION', {
                                    coordinates: { lat: parsedParams.lat, lng: parsedParams.lng },
                                    radius: parsedParams.radius,
                                    categories: parsedParams.categoryCodes,
                                    action: 'return_to_wizard'
                                });
                            }
                        }
                        
                        handleReturnToWizard();
                    }}
                    type="button"
                    disabled={isLoading}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    Cambiar
                </button>
            </div>
        </div>
    );
}

// Make the component available globally
window.BusinessStatsPane = BusinessStatsPane;
