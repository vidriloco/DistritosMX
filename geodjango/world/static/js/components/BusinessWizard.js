// BusinessWizard component - Bottom-aligned wizard for business setup that allows map interaction
function BusinessWizard({ onComplete, onClose, initialState = 'location-selection', initialData = null }) {
    const [currentState, setCurrentState] = React.useState(initialState);
    const [wizardData, setWizardData] = React.useState(initialData || {
        location: '',
        coordinates: null,
        selectedCategories: [],
        selectedRadius: null
    });
    const [searchResults, setSearchResults] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [showResults, setShowResults] = React.useState(false);
    const [selectedLocation, setSelectedLocation] = React.useState(null);
    const [userLocation, setUserLocation] = React.useState(null);
    const searchTimeoutRef = React.useRef(null);
    
    // Category selection state
    const [categorySearchQuery, setCategorySearchQuery] = React.useState('');
    const [categorySearchResults, setCategorySearchResults] = React.useState([]);
    const [showCategoryResults, setShowCategoryResults] = React.useState(false);

    // Color mapping for categories
    const [categoryColorMapping, setCategoryColorMapping] = React.useState({});
    const [categoriesExpanded, setCategoriesExpanded] = React.useState(false);
    const [locationLoading, setLocationLoading] = React.useState(false);
    
    // Check if device is mobile
    const isMobile = () => {
        return window.innerWidth <= 768;
    };
    
    // Array of colors for category assignment - only 3 very distinct colors
    const CATEGORY_COLORS = [
        '#FF6B6B', // Bright red
        '#4ECDC4', // Bright teal
        '#F7DC6F', // Bright yellow
    ];

    // Test the useBusinessCategories hook
    const { categoriesData, categoriesLoading, categoriesError } = useBusinessCategories();
    
    // Use the business location stats hook
    const { statsData, statsLoading, statsError, fetchLocationStats } = useBusinessLocationStats();

    // Function to get category colors for external use
    const getCategoryColors = () => {
        return categoryColorMapping;
    };

    // Expose the function globally for use in map components
    React.useEffect(() => {
        window.getBusinessCategoryColors = getCategoryColors;
        window.returnToBusinessWizardReview = handleReturnToReview;
        return () => {
            delete window.getBusinessCategoryColors;
            delete window.returnToBusinessWizardReview;
        };
    }, [categoryColorMapping]);

    // Update state when initialData changes (for returning to wizard)
    React.useEffect(() => {
        if (initialData) {
            setWizardData(initialData);
            if (initialData.selectedLocation) {
                setSelectedLocation(initialData.selectedLocation);
            }
            if (initialData.categoryColorMapping) {
                setCategoryColorMapping(initialData.categoryColorMapping);
            }
            // If initialData has selectedCategories, ensure they're properly set
            if (initialData.selectedCategories && initialData.selectedCategories.length > 0) {
                console.log('🔄 Setting selected categories from initialData:', initialData.selectedCategories.length);
                // Assign colors if not already assigned
                const newColorMapping = { ...categoryColorMapping };
                initialData.selectedCategories.forEach((category, index) => {
                    if (!newColorMapping[category.codigo_act]) {
                        newColorMapping[category.codigo_act] = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                    }
                });
                setCategoryColorMapping(newColorMapping);
            }
        }
    }, [initialData]);

    // Handle initialization from URL parameters
    React.useEffect(() => {
        if (initialState === 'review-of-selection' && initialData && initialData.selectedLocation) {
            console.log('🎯 Initializing wizard from URL parameters');
            
            // Track user reviewing selection event
            if (window.analyticsService) {
                const eventProperties = {
                    currentState: initialState,
                    location: initialData.location || '',
                    coordinates: initialData.coordinates,
                    selectedCategories: initialData.selectedCategories || [],
                    selectedRadius: initialData.selectedRadius,
                    selectedLocation: initialData.selectedLocation,
                    url_path: window.location.pathname
                };
                window.analyticsService.track('USER_REVIEWING_SELECTION', eventProperties);
            }
            
            // Clean up any leftover layers from BusinessStatsPane
            if (window.cleanupBusinessStatsLayers) {
                console.log('🧹 Cleaning up leftover BusinessStatsPane layers...');
                window.cleanupBusinessStatsLayers();
            }
            
            // Set the selected location
            setSelectedLocation(initialData.selectedLocation);
            
            // Add marker to map if coordinates are available
            if (initialData.coordinates) {
                const { lat, lng } = initialData.coordinates;
                console.log('📍 Adding marker from URL coordinates:', { lat, lng });
                
                // Use setTimeout to ensure map is ready
                setTimeout(() => {
                    if (window.map && window.map.flyTo) {
                        // Center the map on the location
                        window.map.flyTo({
                            center: [lng, lat],
                            zoom: 15,
                            duration: 1500
                        });
                        
                        // Add marker
                        if (window.businessMarker) {
                            window.businessMarker.remove();
                        }
                        
                        window.businessMarker = new mapboxgl.Marker({
                            color: '#10b981',
                            draggable: false // Not draggable in review state
                        })
                        .setLngLat([lng, lat])
                        .addTo(window.map);
                        
                        console.log('✅ Marker added from URL parameters');
                    }
                }, 500);
                
                // Reverse geocode to get proper address
                const reverseGeocodeAddress = async () => {
                    try {
                        console.log('🌍 Reverse geocoding coordinates for proper address...');
                        setLocationLoading(true);
                        const address = await reverseGeocode(lng, lat);
                        
                        // Update the location display name
                        setSelectedLocation(prev => ({
                            ...prev,
                            display_name: address
                        }));
                        
                        // Update wizard data with proper address
                        setWizardData(prev => ({
                            ...prev,
                            location: address
                        }));
                        
                        console.log('✅ Address reverse geocoded:', address);
                    } catch (error) {
                        console.error('❌ Error reverse geocoding address:', error);
                        // Keep the coordinates as fallback
                    } finally {
                        setLocationLoading(false);
                    }
                };
                
                // Reverse geocode after a short delay
                setTimeout(reverseGeocodeAddress, 1000);
            }
            
            // Draw radius circle if radius is available
            if (initialData.selectedRadius) {
                console.log('🔘 Drawing radius circle from URL parameters:', initialData.selectedRadius);
                
                // Use setTimeout to ensure map and location are ready
                setTimeout(() => {
                    if (initialData.selectedLocation) {
                        drawRadiusCircle(initialData.selectedRadius);
                        console.log('✅ Radius circle drawn from URL parameters');
                    }
                }, 1000);
            }
        }
    }, [initialState, initialData]);

    // Handle category reconstruction from URL parameters
    React.useEffect(() => {
        if (initialState === 'review-of-selection' && window.pendingCategoryCodes && categoriesData && categoriesData.length > 0) {
            console.log('🗂️ Reconstructing categories from URL parameters:', window.pendingCategoryCodes);
            
            const categoryCodes = window.pendingCategoryCodes;
            const reconstructedCategories = [];
            
            // Find categories by their codes
            categoryCodes.forEach(code => {
                const category = categoriesData.find(cat => cat.codigo_act === code);
                if (category) {
                    reconstructedCategories.push(category);
                    console.log('✅ Found category:', category.nombre_act);
                } else {
                    console.warn('⚠️ Category not found for code:', code);
                }
            });
            
            if (reconstructedCategories.length > 0) {
                // Update wizard data with reconstructed categories
                setWizardData(prev => ({
                    ...prev,
                    selectedCategories: reconstructedCategories
                }));
                
                // Assign colors to categories
                const newColorMapping = {};
                reconstructedCategories.forEach((category, index) => {
                    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                    newColorMapping[category.codigo_act] = color;
                });
                setCategoryColorMapping(newColorMapping);
                
                // Also update the global initialData reference to ensure persistence
                if (window.businessWizardInitialData) {
                    window.businessWizardInitialData.selectedCategories = reconstructedCategories;
                    window.businessWizardInitialData.categoryColorMapping = newColorMapping;
                }
                
                console.log('✅ Categories reconstructed from URL:', reconstructedCategories.length, 'categories');
                
                // Clear pending category codes
                delete window.pendingCategoryCodes;
            }
        }
    }, [initialState, categoriesData]);

    // Handle state change to review-of-selection and check URL for categories
    React.useEffect(() => {
        if (currentState === 'review-of-selection' && categoriesData && categoriesData.length > 0) {
            console.log('🔍 Checking URL for categories in review state');
            
            // Check if we already have categories in state
            if (wizardData.selectedCategories && wizardData.selectedCategories.length > 0) {
                console.log('✅ Categories already exist in state:', wizardData.selectedCategories.length);
                return;
            }
            
            // Check URL parameters for categories
            const urlParams = new URLSearchParams(window.location.search);
            const categories = urlParams.get('i');
            
            if (categories) {
                console.log('🗂️ Found categories in URL:', categories);
                
                const categoryCodes = categories.split(',').map(code => code.trim());
                const reconstructedCategories = [];
                
                // Find categories by their codes
                categoryCodes.forEach(code => {
                    const category = categoriesData.find(cat => cat.codigo_act === code);
                    if (category) {
                        reconstructedCategories.push(category);
                        console.log('✅ Found category:', category.nombre_act);
                    } else {
                        console.warn('⚠️ Category not found for code:', code);
                    }
                });
                
                if (reconstructedCategories.length > 0) {
                    // Update wizard data with reconstructed categories
                    setWizardData(prev => ({
                        ...prev,
                        selectedCategories: reconstructedCategories
                    }));
                    
                    // Assign colors to categories
                    const newColorMapping = { ...categoryColorMapping };
                    reconstructedCategories.forEach((category, index) => {
                        if (!newColorMapping[category.codigo_act]) {
                            newColorMapping[category.codigo_act] = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                        }
                    });
                    setCategoryColorMapping(newColorMapping);
                    
                    // Also update the global initialData reference to ensure persistence
                    if (window.businessWizardInitialData) {
                        window.businessWizardInitialData.selectedCategories = reconstructedCategories;
                        window.businessWizardInitialData.categoryColorMapping = newColorMapping;
                    }
                    
                    console.log('✅ Categories reconstructed from URL in review state:', reconstructedCategories.length, 'categories');
                }
            } else {
                console.log('ℹ️ No categories found in URL parameters');
            }
        }
    }, [currentState, categoriesData, wizardData.selectedCategories]);

    // Ensure category persistence when navigating between states
    React.useEffect(() => {
        // If we have categories in wizardData but they're not being displayed properly,
        // ensure they're properly synchronized
        if (wizardData.selectedCategories && wizardData.selectedCategories.length > 0) {
            console.log('🔄 Ensuring category persistence:', wizardData.selectedCategories.length, 'categories');
            
            // Ensure color mapping is complete
            const newColorMapping = { ...categoryColorMapping };
            let needsUpdate = false;
            
            wizardData.selectedCategories.forEach((category, index) => {
                if (!newColorMapping[category.codigo_act]) {
                    newColorMapping[category.codigo_act] = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                setCategoryColorMapping(newColorMapping);
                console.log('✅ Updated category color mapping');
            }
        }
    }, [currentState, wizardData.selectedCategories]);

    // Log categories data when it loads
    React.useEffect(() => {
        if (categoriesData) {
            console.log('🏢 Business Categories loaded:', categoriesData);
            console.log('📊 Total categories:', categoriesData.length);
            console.log('📋 Sample categories:', categoriesData.slice(0, 5));
            
            // Handle pending category codes from URL parameters
            if (window.pendingCategoryCodes && window.pendingCategoryCodes.length > 0) {
                console.log('🔍 Processing pending category codes:', window.pendingCategoryCodes);
                
                const pendingCodes = window.pendingCategoryCodes;
                const foundCategories = [];
                const newColorMapping = {};
                
                // Find categories by their codes
                pendingCodes.forEach((code, index) => {
                    const category = categoriesData.find(cat => cat.codigo_act === code);
                    if (category) {
                        foundCategories.push(category);
                        // Assign a color to this category
                        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                        newColorMapping[code] = color;
                        console.log(`✅ Found category: ${category.nombre_act} (${code}) with color ${color}`);
                    } else {
                        console.warn(`⚠️ Category code not found: ${code}`);
                    }
                });
                
                if (foundCategories.length > 0) {
                    // Update wizard data with found categories
                    setWizardData(prev => ({
                        ...prev,
                        selectedCategories: foundCategories
                    }));
                    
                    // Update color mapping
                    setCategoryColorMapping(newColorMapping);
                    
                    console.log(`✅ Populated ${foundCategories.length} categories from URL parameters`);
                }
                
                // Clear pending codes
                delete window.pendingCategoryCodes;
            }
        }
        if (categoriesError) {
            console.error('❌ Error loading categories:', categoriesError);
        }
        if (categoriesLoading) {
            console.log('⏳ Loading business categories...');
        }
    }, [categoriesData, categoriesLoading, categoriesError]);

    // Fetch business location stats when in review state
    React.useEffect(() => {
        if (currentState === 'review-of-selection' && 
            selectedLocation && 
            wizardData.selectedCategories.length > 0 && 
            wizardData.selectedRadius) {
            
            const selectedCodes = wizardData.selectedCategories.map(cat => cat.codigo_act);
            const coordinates = {
                lat: parseFloat(selectedLocation.lat),
                lng: parseFloat(selectedLocation.lon)
            };
            
            console.log('🔍 Fetching business location stats for review state:', {
                selectedCodes,
                coordinates,
                radius: wizardData.selectedRadius
            });
            
            fetchLocationStats(selectedCodes, coordinates, wizardData.selectedRadius);
        }
    }, [currentState, selectedLocation, wizardData.selectedCategories, wizardData.selectedRadius, fetchLocationStats]);

    // Log stats data when it loads and expose it globally
    React.useEffect(() => {
        if (statsData) {
            console.log('📊 Business Location Stats loaded:', statsData);
            console.log('🏢 Total businesses found:', statsData.summary.total_businesses);
            console.log('👥 Total jobs estimated:', statsData.summary.total_jobs);
            
            // Expose stats data globally for BusinessStatsPane
            window.businessStatsData = statsData;
        }
        if (statsError) {
            console.error('❌ Error loading location stats:', statsError);
        }
        if (statsLoading) {
            console.log('⏳ Loading business location stats...');
        }
    }, [statsData, statsLoading, statsError]);

    // Get user location on component mount
    React.useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log('Geolocation error:', error);
                    // Fallback to Mexico City center if geolocation fails
                    setUserLocation({
                        lat: 19.4326,
                        lng: -99.1332
                    });
                }
            );
        } else {
            // Fallback to Mexico City center if geolocation not supported
            setUserLocation({
                lat: 19.4326,
                lng: -99.1332
            });
        }
    }, []);

    // Cleanup effect
    React.useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            // Remove marker when component unmounts
            if (window.businessMarker) {
                window.businessMarker.remove();
                window.businessMarker = null;
            }
            // Remove radius circle when component unmounts
            removeRadiusCircle();
        };
    }, []);

    // Map click handler effect
    React.useEffect(() => {
        const handleMapClick = async (e) => {
            // Only handle clicks when in location selection state
            if (currentState !== 'location-selection') {
                return;
            }

            const { lng, lat } = e.lngLat;
            console.log('Map clicked at:', { lat, lng });

            // Immediately update coordinates in state
            const newLocation = {
                lat: lat.toString(),
                lon: lng.toString(),
                display_name: `${lat.toFixed(6)}, ${lng.toFixed(6)}` // Temporary display name
            };
            setSelectedLocation(newLocation);

            // Access the global map instance
            if (window.map) {
                const addOrUpdateMarker = () => {
                    // Remove existing business marker if it exists
                    if (window.businessMarker) {
                        window.businessMarker.remove();
                    }

                    // Create a new draggable marker
                    window.businessMarker = new mapboxgl.Marker({
                        color: '#10b981',
                        draggable: currentState === 'location-selection' // Only draggable in location selection
                    })
                    .setLngLat([lng, lat])
                    .addTo(window.map);

                    // Add event listener for drag end only if in location selection state
                    if (currentState === 'location-selection') {
                        window.businessMarker.on('dragend', async () => {
                            const newLngLat = window.businessMarker.getLngLat();
                            console.log('Marker dragged to:', {
                                lat: newLngLat.lat,
                                lng: newLngLat.lng
                            });
                            
                            // Show loading indicator while geocoding
                            setIsSearching(true);
                            setLocationLoading(true);
                            
                            // Update the selected location with new coordinates
                            setSelectedLocation(prev => ({
                                ...prev,
                                lat: newLngLat.lat.toString(),
                                lon: newLngLat.lng.toString()
                            }));

                            // Reverse geocode the new position and update input
                            const newAddress = await reverseGeocode(newLngLat.lng, newLngLat.lat);
                            setWizardData(prev => ({
                                ...prev,
                                location: newAddress
                            }));
                            
                            // Hide loading indicator
                            setIsSearching(false);
                            setLocationLoading(false);
                            
                            // Update URL if we're in review state
                            if (currentState === 'review-of-selection') {
                                updateReviewURL();
                            }
                        });
                    }
                };

                if (window.map.isStyleLoaded && window.map.isStyleLoaded()) {
                    addOrUpdateMarker();
                } else if (window.map.on) {
                    // Wait for map to load
                    window.map.on('load', addOrUpdateMarker);
                }
            }

            // Clear search results
            setShowResults(false);
            setSearchResults([]);

            // Now fetch the geocoded address asynchronously
            setIsSearching(true);
            setLocationLoading(true);
            try {
                const address = await reverseGeocode(lng, lat);
                
                // Update the input field with the address
                setWizardData(prev => ({
                    ...prev,
                    location: address
                }));

                // Update the selected location with the full address
                setSelectedLocation(prev => ({
                    ...prev,
                    display_name: address
                }));
            } catch (error) {
                console.error('Error geocoding address:', error);
                // Keep the coordinates as fallback
                setWizardData(prev => ({
                    ...prev,
                    location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                }));
            } finally {
                // Hide loading indicator
                setIsSearching(false);
                setLocationLoading(false);
            }
        };

        // Add map click event listener when map is available
        const setupMapClickListener = () => {
            if (window.map) {
                if (window.map.on) {
                    window.map.on('click', handleMapClick);
                }
                
                // Return cleanup function
                return () => {
                    if (window.map.off) {
                        window.map.off('click', handleMapClick);
                    }
                };
            }
        };

        // Set up the click listener
        const cleanup = setupMapClickListener();
        
        // If map isn't available yet, wait for it
        if (!window.map) {
            const checkMapInterval = setInterval(() => {
                if (window.map) {
                    clearInterval(checkMapInterval);
                    const cleanup = setupMapClickListener();
                    // Note: We can't return cleanup from this interval, but the component
                    // will be unmounted anyway when the wizard closes
                }
            }, 100);
        }

        // Cleanup function
        return () => {
            if (cleanup) cleanup();
        };
    }, [currentState]); // Re-run when currentState changes

    // Effect to update marker draggability when state changes
    React.useEffect(() => {
        if (window.map && window.businessMarker) {
            // Update marker draggability based on current state
            window.businessMarker.setDraggable(currentState === 'location-selection');
        }
        
        // Remove radius circle when in location-selection state
        if (currentState === 'location-selection') {
            removeRadiusCircle();
        }
    }, [currentState]);



    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    };

    // Nominatim API search function
    const searchLocation = async (query) => {
        if (!query.trim() || query.length < 3) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        setShowResults(true);

        try {
            
            // Try search with broader terms for better results
            let searchQuery = query;
            if (query.length >= 5) {
                searchQuery = query;
            }
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(searchQuery)}&` +
                `format=json&` +
                `limit=8&` +
                `countrycodes=mx&` +
                `bounded=1&` +
                `addressdetails=1&` +
                `accept-language=es&` +
                `dedupe=1`
            );

            if (response.ok) {
                const results = await response.json();
                
                // Check if the response contains an error
                if (results.error) {
                    console.error('Nominatim API error:', results.error);
                    setSearchResults([]);
                    return;
                }

                console.log(results);
                
                // Add distance to each result and sort by distance
                let processedResults = results;
                if (userLocation) {
                    processedResults = results.map(result => ({
                        ...result,
                        distance: calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            parseFloat(result.lat),
                            parseFloat(result.lon)
                        )
                    }));
                    
                    // Sort by distance (closest first)
                    processedResults.sort((a, b) => a.distance - b.distance);
                }
                
                setSearchResults(processedResults);
            } else {
                console.error('Nominatim API request failed:', response.status, response.statusText);
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error searching location:', error);
            setSearchResults([]);
        } finally {
            // Add 1.5 second delay before hiding loading indicator
            setTimeout(() => {
                setIsSearching(false);
            }, 1500);
        }
    };

    // Handle input changes with debounced search
    const handleInputChange = (field, value) => {
        setWizardData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear selected location when user types
        setSelectedLocation(null);

        // Debounce search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (field === 'location') {
            // Show searching immediately if the query is long enough
            if (value.length >= 3) {
                setIsSearching(true);
                setShowResults(true);
            } else {
                setIsSearching(false);
                setShowResults(false);
                setSearchResults([]);
            }

            searchTimeoutRef.current = setTimeout(() => {
                searchLocation(value);
            }, 300);
        }
    };

    // Handle location selection from search results
    const handleLocationSelect = (location) => {
        const locationName = location.display_name;
        setWizardData(prev => ({
            ...prev,
            location: locationName
        }));
        setSelectedLocation(location);
        setShowResults(false);
        setSearchResults([]);
        setIsSearching(false);
        
        // Clear any pending search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        // Add marker to map
        addMarkerToMap(location);
        
        // Update URL if we're in review state
        if (currentState === 'review-of-selection') {
            updateReviewURL();
        }
    };

    // Add marker to map and center it
    const addMarkerToMap = (location) => {
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        
        console.log('Adding marker at:', {
            lat: lat,
            lng: lng,
            name: location.display_name
        });

        // Access the global map instance
        if (window.map) {
            const addMarkerToLoadedMap = () => {
                // Center the map on the selected location
                if (window.map.flyTo) {
                    window.map.flyTo({
                        center: [lng, lat],
                        zoom: 15,
                        duration: 1500
                    });
                }

                // Remove existing business marker if it exists
                if (window.businessMarker) {
                    window.businessMarker.remove();
                }

                // Create a new draggable marker
                window.businessMarker = new mapboxgl.Marker({
                    color: '#10b981',
                    draggable: true
                })
                .setLngLat([lng, lat])
                .addTo(window.map);

                // Add event listener for drag end
                window.businessMarker.on('dragend', async () => {
                    const newLngLat = window.businessMarker.getLngLat();
                    console.log('Marker dragged to:', {
                        lat: newLngLat.lat,
                        lng: newLngLat.lng
                    });
                    
                    // Show loading indicator while geocoding
                    setIsSearching(true);
                    
                    // Update the selected location with new coordinates
                    setSelectedLocation(prev => ({
                        ...prev,
                        lat: newLngLat.lat.toString(),
                        lon: newLngLat.lng.toString()
                    }));

                    // Reverse geocode the new position and update input
                    const address = await reverseGeocode(newLngLat.lng, newLngLat.lat);
                    setWizardData(prev => ({
                        ...prev,
                        location: address
                    }));
                    
                    // Hide loading indicator
                    setIsSearching(false);
                    
                    // Update URL if we're in review state
                    if (currentState === 'review-of-selection') {
                        updateReviewURL();
                    }
                });
            };

            if (window.map.isStyleLoaded && window.map.isStyleLoaded()) {
                addMarkerToLoadedMap();
            } else if (window.map.on) {
                // Wait for map to load
                window.map.on('load', addMarkerToLoadedMap);
            }
        } else {
            console.warn('Map instance not available yet');
        }
    };

    // Handle state navigation
    const handleNext = () => {
        // Track analytics events based on current state
        if (window.analyticsService) {
            const eventProperties = {
                currentState: currentState,
                location: wizardData.location,
                coordinates: wizardData.coordinates,
                selectedCategories: wizardData.selectedCategories,
                selectedRadius: wizardData.selectedRadius,
                selectedLocation: selectedLocation
            };

            if (currentState === 'location-selection') {
                window.analyticsService.track('USER_SELECTED_LOCATION', eventProperties);
            } else if (currentState === 'category-selection') {
                window.analyticsService.track('USER_SELECTED_CATEGORIES', eventProperties);
            } else if (currentState === 'radius-selection') {
                window.analyticsService.track('USER_SELECTED_RADIUS', eventProperties);
            } else if (currentState === 'review-of-selection') {
                window.analyticsService.track('USER_CONFIRMED_SELECTION', eventProperties);
            }
        }

        if (currentState === 'location-selection') {
            // Store coordinates and transition to category selection
            const coordinates = selectedLocation ? {
                lat: parseFloat(selectedLocation.lat),
                lng: parseFloat(selectedLocation.lon)
            } : null;
            
            setWizardData(prev => ({
                ...prev,
                coordinates: coordinates
            }));
            
            setCurrentState('category-selection');
        } else if (currentState === 'category-selection') {
            // Transition to radius selection
            setCurrentState('radius-selection');
            
            // Restore previously selected radius if it exists
            if (selectedLocation && wizardData.selectedRadius) {
                // Use setTimeout to ensure state transition completes first
                setTimeout(() => {
                    drawRadiusCircle(wizardData.selectedRadius);
                }, 100);
            }
        } else if (currentState === 'radius-selection') {
            // Transition to review state
            setCurrentState('review-of-selection');
            
            // Update URL with current selection parameters
            updateReviewURL();
        } else if (currentState === 'review-of-selection') {
            // Transition to waiting state and complete wizard
            setCurrentState('waiting');
            
            // Update URL to stats route
            updateStatsURL();
            
            if (onComplete) {
                onComplete({
                    ...wizardData,
                    selectedLocation: selectedLocation,
                    categoryColorMapping: categoryColorMapping
                });
            }
        }
    };

    // Function to update URL with review parameters
    const updateReviewURL = () => {
        if (!selectedLocation || !wizardData.selectedRadius || wizardData.selectedCategories.length === 0) {
            console.warn('⚠️ Cannot update URL: missing required parameters');
            return;
        }

        try {
            // Format coordinates as "lat,lng"
            const coordinates = `${selectedLocation.lat},${selectedLocation.lon}`;
            
            // Format radius
            const radius = wizardData.selectedRadius.toString();
            
            // Format category codes as comma-separated list
            const categoryCodes = wizardData.selectedCategories.map(cat => cat.codigo_act).join(',');
            
            // Build the URL
            const reviewURL = `/negocios/review?c=${coordinates}&r=${radius}&i=${categoryCodes}`;
            
            console.log('🔗 Updating URL to:', reviewURL);
            
            // Update the URL without triggering a page reload
            if (window.navigate) {
                window.navigate(reviewURL);
            } else {
                window.history.pushState({}, '', reviewURL);
            }
            
            console.log('✅ URL updated successfully');
        } catch (error) {
            console.error('❌ Error updating URL:', error);
        }
    };

    // Function to update URL to stats route
    const updateStatsURL = () => {
        if (!selectedLocation || !wizardData.selectedRadius || wizardData.selectedCategories.length === 0) {
            console.warn('⚠️ Cannot update URL: missing required parameters for stats');
            return;
        }

        try {
            const coordinates = `${selectedLocation.lat},${selectedLocation.lon}`;
            const radius = wizardData.selectedRadius.toString();
            const categoryCodes = wizardData.selectedCategories.map(cat => cat.codigo_act).join(',');
            const statsURL = `/negocios/stats?c=${coordinates}&r=${radius}&i=${categoryCodes}`;

            console.log('🔗 Updating URL to stats:', statsURL);
            if (window.navigate) {
                window.navigate(statsURL);
            } else {
                window.history.pushState({}, '', statsURL);
            }
            console.log('✅ URL updated successfully to stats');
        } catch (error) {
            console.error('❌ Error updating URL to stats:', error);
        }
    };

    // Handle back button
    const handleBack = () => {
        if (currentState === 'category-selection') {
            setCurrentState('location-selection');
        } else if (currentState === 'radius-selection') {
            // Remove radius circle when going back
            removeRadiusCircle();
            setCurrentState('category-selection');
        } else if (currentState === 'review-of-selection') {
            setCurrentState('radius-selection');
        }
    };

    // Handle return to review state from waiting state
    const handleReturnToReview = () => {
        setCurrentState('review-of-selection');
        // Update URL when returning to review state
        updateReviewURL();
    };

    // Filter categories based on search query
    const filterCategories = React.useCallback((query) => {
        if (!categoriesData || !query.trim() || query.length < 2) {
            setCategorySearchResults([]);
            setShowCategoryResults(false);
            return;
        }

        const filtered = categoriesData.filter(category => 
            category.nombre_act.toLowerCase().includes(query.toLowerCase()) ||
            category.codigo_act.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10); // Limit to 10 results

        setCategorySearchResults(filtered);
        setShowCategoryResults(true);
    }, [categoriesData]);

    // Handle category search input
    const handleCategoryInputChange = (value) => {
        setCategorySearchQuery(value);
        filterCategories(value);
    };

    // Get next available color for category assignment
    const getNextAvailableColor = () => {
        const usedColors = Object.values(categoryColorMapping);
        for (let i = 0; i < CATEGORY_COLORS.length; i++) {
            if (!usedColors.includes(CATEGORY_COLORS[i])) {
                return CATEGORY_COLORS[i];
            }
        }
        // If all colors are used, cycle back to the first one
        return CATEGORY_COLORS[0];
    };

    // Handle category selection
    const handleCategorySelect = (category) => {
        // Check if already selected
        if (wizardData.selectedCategories.find(c => c.codigo_act === category.codigo_act)) {
            return;
        }

        // Check if we can add more categories (max 3)
        if (wizardData.selectedCategories.length >= 3) {
            return;
        }

        setWizardData(prev => ({
            ...prev,
            selectedCategories: [...prev.selectedCategories, category]
        }));

        // Assign a color to the new category
        const newColor = getNextAvailableColor();
        setCategoryColorMapping(prev => ({
            ...prev,
            [category.codigo_act]: newColor
        }));

        // Clear search
        setCategorySearchQuery('');
        setCategorySearchResults([]);
        setShowCategoryResults(false);
        
        // Update URL if we're in review state
        if (currentState === 'review-of-selection') {
            updateReviewURL();
        }
    };

    // Remove selected category
    const handleCategoryRemove = (categoryToRemove) => {
        setWizardData(prev => ({
            ...prev,
            selectedCategories: prev.selectedCategories.filter(
                c => c.codigo_act !== categoryToRemove.codigo_act
            )
        }));
        // Remove the color mapping for the removed category
        setCategoryColorMapping(prev => {
            const newState = { ...prev };
            delete newState[categoryToRemove.codigo_act];
            return newState;
        });
        
        // Update URL if we're in review state
        if (currentState === 'review-of-selection') {
            updateReviewURL();
        }
    };

    // Handle category input blur
    const handleCategoryInputBlur = () => {
        setTimeout(() => {
            setShowCategoryResults(false);
        }, 300);
    };

    // Handle category input focus
    const handleCategoryInputFocus = () => {
        if (categorySearchResults.length > 0 && categorySearchQuery.length >= 2) {
            setShowCategoryResults(true);
        }
    };

    // Handle radius selection
    const handleRadiusSelect = (radius) => {
        setWizardData(prev => ({
            ...prev,
            selectedRadius: radius
        }));

        // Draw circle on map
        if (selectedLocation) {
            drawRadiusCircle(radius);
        }
        
        // Update URL if we're in review state
        if (currentState === 'review-of-selection') {
            updateReviewURL();
        }
    };

    // Handle navigation to specific section
    const handleGoToSection = (section) => {
        if (section === 'location') {
            setCurrentState('location-selection');
            // Ensure marker is draggable when transitioning to location selection
            setTimeout(() => {
                if (window.map && window.businessMarker) {
                    window.businessMarker.setDraggable(true);
                }
            }, 100);
        } else if (section === 'category') {
            setCurrentState('category-selection');
        } else if (section === 'radius') {
            setCurrentState('radius-selection');
            // Restore radius circle if it exists
            if (selectedLocation && wizardData.selectedRadius) {
                setTimeout(() => {
                    drawRadiusCircle(wizardData.selectedRadius);
                }, 100);
            }
        }
    };

    // Handle categories expand/collapse toggle
    const handleCategoriesToggle = () => {
        setCategoriesExpanded(!categoriesExpanded);
    };

    // Draw radius circle on map
    const drawRadiusCircle = (radiusInMeters) => {
        if (!window.map || !selectedLocation) {
            return;
        }

        // Remove existing circle first
        removeRadiusCircle();

        const lat = parseFloat(selectedLocation.lat);
        const lng = parseFloat(selectedLocation.lon);

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
                    'fill-color': '#ff8c00', // Orange color
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
                    'line-color': '#ff8c00', // Orange color
                    'line-width': 2,
                    'line-opacity': 0.8
                }
            });

            // Zoom to fit the circle with margins
            if (window.map.fitBounds) {
                const bounds = turf.bbox(circle);
                window.map.fitBounds(bounds, {
                    padding: {
                        top: window.innerHeight * 0.1,    // 10% margin
                        bottom: window.innerHeight * 0.1, // 10% margin
                        left: window.innerWidth * 0.1,    // 10% margin
                        right: window.innerWidth * 0.1    // 10% margin
                    },
                    duration: 1000 // Smooth animation
                });
            }
        };

        if (window.map.isStyleLoaded && window.map.isStyleLoaded()) {
            addCircleLayer();
        } else if (window.map.once) {
            window.map.once('style.load', addCircleLayer);
        }
    };

    // Remove radius circle from map
    const removeRadiusCircle = () => {
        if (!window.map) {
            return;
        }

        try {
            // Remove circle layers if they exist
            if (window.map.getLayer && window.map.getLayer('business-radius-circle')) {
                window.map.removeLayer('business-radius-circle');
            }
            if (window.map.getSource && window.map.getSource('business-radius-circle')) {
                window.map.removeSource('business-radius-circle');
            }
            if (window.map.getLayer && window.map.getLayer('business-radius-circle-border')) {
                window.map.removeLayer('business-radius-circle-border');
            }
            if (window.map.getSource && window.map.getSource('business-radius-circle-border')) {
                window.map.removeSource('business-radius-circle-border');
            }
        } catch (error) {
            console.warn('Error removing radius circle:', error);
        }
    };

    // Reverse geocode coordinates to get address
    const reverseGeocode = async (lng, lat) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?` +
                `lat=${lat}&` +
                `lon=${lng}&` +
                `format=json&` +
                `addressdetails=1&` +
                `accept-language=es`
            );

            if (response.ok) {
                const result = await response.json();
                return result.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            } else {
                console.error('Reverse geocoding failed:', response.status);
                return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
        } catch (error) {
            console.error('Error in reverse geocoding:', error);
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    };

    // Handle pin button click
    const handlePinClick = async () => {
        // If marker already exists, do nothing
        if (window.businessMarker) {
            console.log('Marker already exists');
            return;
        }

        // Access the global map instance
        if (window.map && window.map.getCenter) {
            const mapCenter = window.map.getCenter();
            const lat = mapCenter.lat;
            const lng = mapCenter.lng;

            console.log('Dropping marker at map center:', { lat, lng });

            // Create a new draggable marker at map center
            window.businessMarker = new mapboxgl.Marker({
                color: '#10b981',
                draggable: true
            })
            .setLngLat([lng, lat])
            .addTo(window.map);

            // Add event listener for drag end
            window.businessMarker.on('dragend', async () => {
                const newLngLat = window.businessMarker.getLngLat();
                console.log('Marker dragged to:', {
                    lat: newLngLat.lat,
                    lng: newLngLat.lng
                });
                
                // Show loading indicator while geocoding
                setIsSearching(true);
                setLocationLoading(true);
                
                // Update the selected location with new coordinates
                setSelectedLocation(prev => ({
                    ...prev,
                    lat: newLngLat.lat.toString(),
                    lon: newLngLat.lng.toString()
                }));

                // Reverse geocode the new position and update input
                const address = await reverseGeocode(newLngLat.lng, newLngLat.lat);
                setWizardData(prev => ({
                    ...prev,
                    location: address
                }));
                
                // Hide loading indicator
                setIsSearching(false);
                setLocationLoading(false);
                
                // Update URL if we're in review state
                if (currentState === 'review-of-selection') {
                    updateReviewURL();
                }
            });

            // Get address for the current location
            setLocationLoading(true);
            const address = await reverseGeocode(lng, lat);
            setLocationLoading(false);
            
            // Update the input field with the address
            setWizardData(prev => ({
                ...prev,
                location: address
            }));

            // Create location object for selectedLocation
            setSelectedLocation({
                lat: lat.toString(),
                lon: lng.toString(),
                display_name: address
            });

            // Clear search results
            setShowResults(false);
            setSearchResults([]);
            
            // Update URL if we're in review state
            if (currentState === 'review-of-selection') {
                updateReviewURL();
            }
        } else {
            console.warn('Map instance not available');
        }
    };

    // Handle clear input
    const handleClearInput = () => {
        setWizardData(prev => ({
            ...prev,
            location: ''
        }));
        setSelectedLocation(null);
        setShowResults(false);
        setSearchResults([]);
        setIsSearching(false);
        
        // Clear any pending search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Remove marker from map
        if (window.businessMarker) {
            window.businessMarker.remove();
            window.businessMarker = null;
        }
    };

    // Handle close button click
    const handleClose = () => {
        // Clear search timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Remove marker from map
        if (window.businessMarker) {
            window.businessMarker.remove();
            window.businessMarker = null;
        }

        // Remove radius circle
        removeRadiusCircle();

        if (onClose) {
            onClose();
        }
    };

    // Handle clicks outside the search results
    const handleInputBlur = () => {
        // Delay hiding results to allow for clicks on results
        setTimeout(() => {
            setShowResults(false);
        }, 300);
    };

    // Handle input focus
    const handleInputFocus = () => {
        if (searchResults.length > 0 && wizardData.location.length >= 3) {
            setShowResults(true);
        }
    };

    // Render location selection state
    const renderLocationSelection = () => {
        return (
            <div className="business-wizard-state">
                <div className="wizard-content">
                    <div className="wizard-text-section">
                        <div className="wizard-step-number">1</div>
                        <h2 className="wizard-title">📍 Selecciona tu ubicación</h2>
                        <p className="wizard-instruction">
                            Indica la dirección o zona donde planeas establecer tu negocio para obtener análisis precisos.
                        </p>
                        
                        <div className="wizard-search-container location-selection">
                            <div className="wizard-input-container">
                                <button 
                                    className="wizard-pin-button"
                                    onClick={handlePinClick}
                                    type="button"
                                >
                                    <svg 
                                        className="pin-icon" 
                                        width="16" 
                                        height="16" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                    >
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                </button>
                                <input 
                                    type="text"
                                    className="wizard-location-input"
                                    placeholder="Ingresa una dirección o colonia"
                                    value={wizardData.location}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                    onFocus={handleInputFocus}
                                    onBlur={handleInputBlur}
                                    autoComplete="off"
                                />
                                {isSearching ? (
                                    <div className="wizard-loading-indicator">
                                        <svg 
                                            className="spinner" 
                                            width="16" 
                                            height="16" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2"
                                        >
                                            <circle cx="12" cy="12" r="10" opacity="0.3"/>
                                            <path d="M12 2a10 10 0 0 1 10 10" opacity="1"/>
                                        </svg>
                                    </div>
                                ) : wizardData.location.trim() ? (
                                    <button 
                                        className="wizard-clear-button"
                                        onClick={handleClearInput}
                                        type="button"
                                    >
                                        <svg 
                                            width="16" 
                                            height="16" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2"
                                        >
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                                                ) : null}

                                {showResults && searchResults.length > 0 && (
                                    <div className="wizard-search-results">
                                        {searchResults.map((result, index) => (
                                            <div 
                                                key={index}
                                                className="wizard-search-result-item"
                                                onClick={() => handleLocationSelect(result)}
                                            >
                                                <div className="result-name">
                                                    {result.display_name.split(',')[0]}
                                                    {result.distance && (
                                                        <span className="result-distance">
                                                            {result.distance.toFixed(1)} km
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="result-address">
                                                    {result.display_name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                className="wizard-external-next-button"
                                onClick={handleNext}
                                disabled={!wizardData.location.trim() || !selectedLocation}
                                type="button"
                            >
                                Siguiente
                                <svg 
                                    className="chevron-right" 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render category selection state
    const renderCategorySelection = () => {
        return (
            <div className="business-wizard-state">
                <div className="wizard-content">
                    <div className="wizard-text-section">
                        <div className="wizard-step-number">2</div>
                        <h2 className="wizard-title">🗂️ Clasifica tu establecimiento</h2>
                        <p className="wizard-instruction">
                            Puedes buscar y seleccionar hasta tres tipos de categorías.
                        </p>
                        
                        {/* Selected Categories */}
                        {wizardData.selectedCategories.length > 0 && (
                            <div className="selected-categories">
                                {wizardData.selectedCategories.map((category, index) => {
                                    const categoryColor = categoryColorMapping[category.codigo_act];
                                    return (
                                        <div 
                                            key={category.codigo_act} 
                                            className="selected-category-item"
                                            style={{ 
                                                backgroundColor: categoryColor || 'var(--color-primary)',
                                                color: categoryColor ? '#ffffff' : 'white'
                                            }}
                                        >
                                            <span className="category-code">{category.codigo_act}</span>
                                            <span className="category-name">{category.nombre_act}</span>
                                            <button 
                                                className="category-remove-button"
                                                onClick={() => handleCategoryRemove(category)}
                                                type="button"
                                            >
                                                <svg 
                                                    width="14" 
                                                    height="14" 
                                                    viewBox="0 0 24 24" 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    strokeWidth="2"
                                                >
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        <div className="wizard-search-container">
                            <div className="wizard-input-container">
                                <input 
                                    type="text"
                                    className="wizard-location-input"
                                    placeholder={
                                        wizardData.selectedCategories.length >= 3 
                                            ? "Máximo 3 categorías seleccionadas"
                                            : "Buscar categoría de negocio..."
                                    }
                                    value={categorySearchQuery}
                                    onChange={(e) => handleCategoryInputChange(e.target.value)}
                                    onFocus={handleCategoryInputFocus}
                                    onBlur={handleCategoryInputBlur}
                                    disabled={wizardData.selectedCategories.length >= 3}
                                    autoComplete="off"
                                />
                                
                                {categorySearchQuery.trim() && (
                                    <button 
                                        className="wizard-clear-button"
                                        onClick={() => {
                                            setCategorySearchQuery('');
                                            setCategorySearchResults([]);
                                            setShowCategoryResults(false);
                                        }}
                                        type="button"
                                    >
                                        <svg 
                                            width="16" 
                                            height="16" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2"
                                        >
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                )}

                                {showCategoryResults && categorySearchResults.length > 0 && (
                                    <div className="wizard-search-results">
                                        {categorySearchResults.map((result, index) => {
                                            const isSelected = wizardData.selectedCategories.find(c => c.codigo_act === result.codigo_act);
                                            const categoryColor = categoryColorMapping[result.codigo_act];
                                            
                                            return (
                                                <div 
                                                    key={result.codigo_act}
                                                    className={`wizard-search-result-item ${
                                                        isSelected ? 'disabled' : ''
                                                    }`}
                                                    onClick={() => !isSelected && handleCategorySelect(result)}
                                                >
                                                    <div className="result-name">
                                                        <span className="category-code">{result.codigo_act}</span>
                                                        <span className="category-name">{result.nombre_act}</span>
                                                        {isSelected && categoryColor && (
                                                            <div 
                                                                className="category-color-dot" 
                                                                style={{ backgroundColor: categoryColor }}
                                                            ></div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            <div className="wizard-button-group">
                                <button 
                                    className="wizard-back-button"
                                    onClick={handleBack}
                                    type="button"
                                >
                                    <svg 
                                        className="chevron-left" 
                                        width="16" 
                                        height="16" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                    >
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                    Atrás
                                </button>
                                
                                <button 
                                    className="wizard-external-next-button"
                                    onClick={handleNext}
                                    disabled={wizardData.selectedCategories.length === 0}
                                    type="button"
                                >
                                    Siguiente
                                    <svg 
                                        className="chevron-right" 
                                        width="16" 
                                        height="16" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                    >
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render radius selection state
    const renderRadiusSelection = () => {
        return (
            <div className="business-wizard-state">
                <div className="wizard-content">
                    <div className="wizard-text-section">
                        <div className="wizard-step-number">3</div>
                        <h2 className="wizard-title">🔘 Radio de Alcance</h2>
                        <p className="wizard-instruction">
                            Selecciona el área de influencia que deseas analizar en la vecindad de tu negocio
                        </p>
                        
                        <div className="wizard-radius-and-navigation">
                            <div className="wizard-radius-buttons">
                                <button 
                                    className={`wizard-radius-button ${wizardData.selectedRadius === 100 ? 'selected' : ''}`}
                                    onClick={() => handleRadiusSelect(100)}
                                    type="button"
                                >
                                    100 m
                                </button>
                                <button 
                                    className={`wizard-radius-button ${wizardData.selectedRadius === 350 ? 'selected' : ''}`}
                                    onClick={() => handleRadiusSelect(350)}
                                    type="button"
                                >
                                    350 m
                                </button>
                                <button 
                                    className={`wizard-radius-button ${wizardData.selectedRadius === 800 ? 'selected' : ''}`}
                                    onClick={() => handleRadiusSelect(800)}
                                    type="button"
                                >
                                    800 m
                                </button>
                            </div>
                            
                            <div className="wizard-button-group">
                                <button 
                                    className="wizard-back-button"
                                    onClick={handleBack}
                                    type="button"
                                >
                                    <svg 
                                        className="chevron-left" 
                                        width="16" 
                                        height="16" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                    >
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                    Atrás
                                </button>
                                
                                <button 
                                    className="wizard-external-next-button"
                                    onClick={handleNext}
                                    disabled={!wizardData.selectedRadius}
                                    type="button"
                                >
                                    Resumen
                                    <svg 
                                        className="chevron-right" 
                                        width="16" 
                                        height="16" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                    >
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render review state
    const renderReviewSelection = () => {
        return (
            <div className="business-wizard-state">
                <div className="wizard-content">
                    <div className="wizard-text-section">
                        <div className="wizard-step-number">4</div>
                        <h2 className="wizard-title">📋 Resumen de selección</h2>
                        <p className="wizard-instruction">
                            Revisa y modifica los parámetros seleccionados antes de ver los resultados.
                        </p>
                        
                        <div className="wizard-review-sections">
                            {/* Ubicación Section */}
                            <div className="wizard-review-section">
                                <div className="wizard-review-section-header">
                                    <h3 className="wizard-review-section-title">📍 Ubicación</h3>
                                    {locationLoading ? (
                                        <div className="wizard-loading-indicator-small">
                                            <svg 
                                                className="spinner" 
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
                                        </div>
                                    ) : (
                                        <button 
                                            className="wizard-change-link"
                                            onClick={() => handleGoToSection('location')}
                                            type="button"
                                        >
                                            Cambiar
                                        </button>
                                    )}
                                </div>
                                <div className="wizard-review-section-content">
                                    <p className="wizard-review-text">
                                        {selectedLocation ? selectedLocation.display_name : 'No seleccionada'}
                                    </p>
                                </div>
                            </div>

                            {/* Categoría(s) Section */}
                            <div className="wizard-review-section">
                                <div className="wizard-review-section-header">
                                    <h3 className="wizard-review-section-title">🗂️ Clasificación elegida</h3>
                                    <div className="wizard-review-section-actions">
                                        {categoriesLoading ? (
                                            <div className="wizard-loading-indicator-small">
                                                <svg 
                                                    className="spinner" 
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
                                            </div>
                                        ) : (
                                            <button 
                                                className="wizard-change-link"
                                                onClick={() => handleGoToSection('category')}
                                                type="button"
                                            >
                                                Cambiar
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="wizard-review-section-content">
                                    {wizardData.selectedCategories.length > 0 ? (
                                        <div className={`wizard-review-categories ${isMobile() && !categoriesExpanded ? 'collapsed' : 'expanded'}`}>
                                            {isMobile() && !categoriesExpanded ? (
                                                <div className="wizard-review-categories-summary">
                                                    <button 
                                                        className="categories-count-button"
                                                        onClick={handleCategoriesToggle}
                                                        type="button"
                                                    >
                                                        <span className="categories-count">
                                                            {wizardData.selectedCategories.length} categoría{wizardData.selectedCategories.length !== 1 ? 's' : ''} seleccionada{wizardData.selectedCategories.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    {wizardData.selectedCategories.map((category, index) => (
                                                        <div key={category.codigo_act} className="wizard-review-category-item">
                                                            <span className="category-code">{category.codigo_act}</span>
                                                            <span className="category-name">{category.nombre_act}</span>
                                                            <div 
                                                                className="category-color-dot" 
                                                                style={{ backgroundColor: categoryColorMapping[category.codigo_act] }}
                                                            ></div>
                                                        </div>
                                                    ))}
                                                    {isMobile() && (
                                                        <div className="wizard-review-categories-collapse">
                                                            <button 
                                                                className="wizard-toggle-link"
                                                                onClick={handleCategoriesToggle}
                                                                type="button"
                                                            >
                                                                Colapsar lista
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="wizard-review-text">No seleccionadas</p>
                                    )}
                                </div>
                            </div>

                            {/* Radio de alcance Section */}
                            <div className="wizard-review-section">
                                <div className="wizard-review-section-header">
                                    <h3 className="wizard-review-section-title">🔘 Radio de alcance</h3>
                                    <button 
                                        className="wizard-change-link"
                                        onClick={() => handleGoToSection('radius')}
                                        type="button"
                                    >
                                        Cambiar
                                    </button>
                                </div>
                                <div className="wizard-review-section-content">
                                    <p className="wizard-review-text">
                                        {wizardData.selectedRadius ? `${wizardData.selectedRadius} metros` : 'No seleccionado'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="wizard-review-footer">
                            <div className="wizard-review-results-info">
                                {statsLoading ? (
                                    <div className="wizard-loading-stats">
                                        <svg 
                                            className="spinner" 
                                            width="16" 
                                            height="16" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2"
                                        >
                                            <circle cx="12" cy="12" r="10" opacity="0.3"/>
                                            <path d="M12 2a10 10 0 0 1 10 10" opacity="1"/>
                                        </svg>
                                        <span>Analizando zona...</span>
                                    </div>
                                ) : statsError ? (
                                    <p className="wizard-results-text wizard-error">
                                        Error al cargar estadísticas
                                    </p>
                                ) : statsData ? (
                                    <div className="wizard-stats-summary">
                                        <p className="wizard-results-text">
                                            Encontrados {statsData.summary.total_businesses} lugares relacionados
                                        </p>
                                        <p className="wizard-jobs-text">
                                            Estimados en este radio {Math.round(statsData.summary.total_jobs)} empleos
                                        </p>
                                    </div>
                                ) : (
                                    <p className="wizard-results-text">
                                        No hay datos disponibles
                                    </p>
                                )}
                            </div>
                            <button 
                                className="wizard-external-next-button"
                                onClick={handleNext}
                                disabled={statsLoading}
                                type="button"
                            >
                                Ver resultados
                                <svg 
                                    className="chevron-right" 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Main render
    return (
        <div className={`business-wizard-container ${currentState === 'review-of-selection' ? 'review-state' : ''}`}>
            {currentState === 'location-selection' && renderLocationSelection()}
            {currentState === 'category-selection' && renderCategorySelection()}
            {currentState === 'radius-selection' && renderRadiusSelection()}
            {currentState === 'review-of-selection' && renderReviewSelection()}
            {currentState === 'waiting' && null} {/* Show nothing in waiting state */}
        </div>
    );
}

// Make the component available globally
window.BusinessWizard = BusinessWizard; 