// StateShowcaser component - Alternates between different states every 10 seconds
function StateShowcaser({ onStateChange, initialStateIndex = 0, onShowCatchLead }) {
    const mapContainer = React.useRef(null);
    const map = React.useRef(null);
    const animationFrame = React.useRef(null);
    const [currentStateIndex, setCurrentStateIndex] = React.useState(initialStateIndex);
    const [isTransitioning, setIsTransitioning] = React.useState(false);
    const [rotationSpeed, setRotationSpeed] = React.useState(6); // Slower, more pleasant speed
    const [currentGeoWordIndex, setCurrentGeoWordIndex] = React.useState(0);
    const [currentActionWordIndex, setCurrentActionWordIndex] = React.useState(0);
    const [currentQuestionBodyIndex, setCurrentQuestionBodyIndex] = React.useState(0);
    const [currentWordColor, setCurrentWordColor] = React.useState('#FFD700'); // Default gold color
    
    // New state for AGEBS functionality
    const [agebsData, setAgebsData] = React.useState(null);
    const [highlightedAgebs, setHighlightedAgebs] = React.useState([]);
    const [agebsLoading, setAgebsLoading] = React.useState(false);
    const [mapReady, setMapReady] = React.useState(false);
    
    // New state for Metro transport functionality
    const [metroData, setMetroData] = React.useState(null);
    const [metroLoading, setMetroLoading] = React.useState(false);
    
    // Metro line colors (same as in line_colors.py)
    const METRO_COLORS = {
        '1': '#ec4682',  // Red (Rosa)
        '2': '#0262a6',  // Blue (Azul)
        '3': '#a4a837',  // Green (Verde Olivo)
        '4': '#6fb3b2',  // Yellow (Cian)
        '5': '#f4d621',  // Orange (Amarillo)
        '6': '#e72428',  // Purple (Rojo)
        '7': '#f07c2c',  // Pink (Naranja)
        '8': '#01a163',  // Cyan (Verde)
        '9': '#561b00',  // Brown (Café)
        'A': '#8f268e',  // Gray (Morado)
        'B': '#008080',  // Teal (Verde y Blanco)
        '12': '#b8880b', // Gold (Oro)
        '12-A': '#b8880b' // Gold (Oro)
    };
    
    // Define the states
    const states = [
        {
            title: "Te ayudamos a entender mejor <geo> <action>",
            description: "Respuestas basadas en datos a preguntas que todos nos hacemos",
            center: [-99.142960, 19.435520],
            type: "intro",
            geoWords: ["el barrio", "el municipio", "la ciudad", "la colonia", "la cuadra", "la periferia", "el suburbio"],
            actionWords: ["en donde vives", "en donde trabajas", "en donde estudias", "que amas", "en donde naciste", "en donde creciste", "donde eres feliz", "que caminas", "en donde manejas", "que pedaleas", "de tus sueños", "que te vió crecer", "de tus abuelos", "de tus padres"]
        },
        {
            title: "¿Me conviene comprar/rentar aquí?",
            description: "Consulta los principales indicadores de calidad de vida en tu zona",
            center: [-99.142960, 19.435520],
            image: "🏠",
            textColor: "#fff",
            sliderColor: "#667eea",
            type: "case-study",
            buttonURL: "/vivienda",
            enabled: false,
            buttonTitle: "Encuentra la mejor zona",
            locations: [
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/density-high-level.png",
                    coordinate: [-99.136627, 19.451777],
                    iconSize: 0.6
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/barrio-level.png",
                    coordinate: [-99.132106, 19.447812],
                    iconSize: 0.5
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/thefts-houses.png",
                    coordinate: [-99.140960, 19.437520],
                    iconSize: 0.7
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/connectivity-transport.png",
                    coordinate: [-99.141554, 19.430585],
                    iconSize: 0.5
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/park-level.png",
                    coordinate: [-99.144389, 19.433149],
                    iconSize: 0.3
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/ranking-hood.png",
                    coordinate: [-99.146333, 19.435523],
                    iconSize: 0.5
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/school-level.png",
                    coordinate: [-99.135345, 19.431803],
                    iconSize: 0.6
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/airbnbs-level.png",
                    coordinate: [-99.133663, 19.434503],
                    iconSize: 0.3
                },
                
            ]
        },
        {
            title: "¿Cómo le iría a mi negocio aquí?",
            description: "Te mostramos datos detallados del perímetro de influencia de tu negocio",
            center: [-99.1765911, 19.3946846],
            image: "💸",
            textColor: "#fff",
            sliderColor: "#667eea",
            type: "case-study",
            buttonURL: "/negocios",
            enabled: true,
            buttonTitle: "Soluciones para tu negocio",
            locations: [
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/safety-zone.png",
                    coordinate: [-99.173087, 19.390271],
                    iconSize: 0.5
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/water-ok.png",
                    coordinate: [-99.173811, 19.394046],
                    iconSize: 0.6
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/business-type-three.png",
                    coordinate: [-99.1765911, 19.3946846],
                    iconSize: 0.4
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/business-type-two.png",
                    coordinate: [-99.1605911, 19.3936846],
                    iconSize: 0.3
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/airbnbs-level-big.png",
                    coordinate: [-99.176483, 19.401214],
                    iconSize: 0.3
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/flux-panel.png",
                    coordinate: [-99.1793469, 19.3917743],
                    iconSize: 0.6
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/business-type-one.png",
                    coordinate: [-99.173204, 19.402576],
                    iconSize: 0.2
                }
            ]
        },
        {
            title: "¿Por qué <question_body>?",
            description: "Te mostramos los datos de la infraestructura de transporte público",
            center: [-99.153264, 19.340816],
            image: "🎨",
            textColor: "#fff",
            sliderColor: "#667eea",
            type: "case-study-transport",
            buttonURL: "/transporte",
            enabled: false,
            buttonTitle: "Explorar transporte",
            zoom: 14,
            locations: [],
            questionBodies: [
                "el metro está tan lleno",
                "no hay suficientes buses",
                "el transporte es tan lento",
                "las rutas no conectan bien",
                "el servicio es tan irregular",
                "no hay opciones de transporte",
                "el tráfico está tan mal",
                "las estaciones están tan lejos",
                "no hay transporte nocturno",
                "las líneas no llegan a mi zona"
            ],
            locations: [
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/copilco-station.png",
                    coordinate: [-99.1798305, 19.3359496],
                    iconSize: 0.6
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/via-lactea-station.png",
                    coordinate: [-99.129910, 19.358647],
                    iconSize: 0.3
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/transit-ranking-hood.png",
                    coordinate: [-99.136624, 19.330152],
                    iconSize: 0.6
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/motor-level.png",
                    coordinate: [-99.125123, 19.315554],
                    iconSize: 0.3
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/urban-barrier.png",
                    coordinate: [-99.138735, 19.388845],
                    iconSize: 0.3
                },
                {
                    imageURL: "https://distritosmexico.s3.us-east-2.amazonaws.com/safety-street.png",
                    coordinate: [-99.162232, 19.320649],
                    iconSize: 0.5
                }
            ]
        }
    ];
    
    const currentState = states[currentStateIndex];
    
    // Function to fetch AGEBS data
    const fetchAgebsData = React.useCallback(async (forceRefresh = false) => {
        try {
            setAgebsLoading(true);
            
            // Use the same URL utility as MapAdminApp
            const agebsUrl = UrlUtils.getAgebsUrl();
            
            // Add cache-busting parameter if force refresh is requested
            const url = forceRefresh ? `${agebsUrl}?t=${Date.now()}` : agebsUrl;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setAgebsData(data);
            
        } catch (error) {
            console.error('Error fetching AGEBS data:', error);
        } finally {
            setAgebsLoading(false);
        }
    }, []);
    
    // Function to force refresh AGEBS data
    const forceRefreshAgebsData = React.useCallback(() => {
        setAgebsData(null); // Clear existing data
        fetchAgebsData(true);
    }, [fetchAgebsData]);
    
    // Function to fetch Metro transport data
    const fetchMetroData = React.useCallback(async (forceRefresh = false) => {
        try {
            setMetroLoading(true);
            
            // Use the same URL utility as TransportSystemsPanel
            if (!window.UrlUtils) {
                console.warn('UrlUtils not available');
                return;
            }
            
            const metroUrl = window.UrlUtils.getTransportUrl('metro');
            
            // Add cache-busting parameter if force refresh is requested
            const url = forceRefresh ? `${metroUrl}?t=${Date.now()}` : metroUrl;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setMetroData(data);
            
        } catch (error) {
            console.error('Error fetching Metro data:', error);
        } finally {
            setMetroLoading(false);
        }
    }, []);
    
    // Function to force refresh Metro data
    const forceRefreshMetroData = React.useCallback(() => {
        setMetroData(null); // Clear existing data
        fetchMetroData(true);
    }, [fetchMetroData]);
    
    // Function to randomly highlight AGEBS
    const highlightRandomAgebs = React.useCallback((color) => {
        if (!agebsData || !agebsData.features || agebsData.features.length === 0) {
            return;
        }
        
        // Randomly select 1 AGEB
        const randomIndex = Math.floor(Math.random() * agebsData.features.length);
        const selectedAgeb = agebsData.features[randomIndex];
        
        // Create highlighted AGEB with the current color
        const newHighlightedAgebs = [{
            type: 'Feature',
            geometry: selectedAgeb.geometry,
            properties: {
                ...selectedAgeb.properties,
                highlightColor: color
            }
        }];
        
        setHighlightedAgebs(newHighlightedAgebs);
        
        // Update the border color of all AGEBS to match the current color
        if (map.current && map.current.getLayer && map.current.getLayer('agebs-layer')) {
            // Use requestAnimationFrame to batch updates
            requestAnimationFrame(() => {
                if (map.current && map.current.getLayer && map.current.getLayer('agebs-layer')) {
                    map.current.setPaintProperty('agebs-layer', 'line-color', color);
                    map.current.setPaintProperty('agebs-layer', 'line-opacity', 0.6);
                }
            });
        }
        
        // Fly to the centroid of the selected AGEB
        flyToAgebCentroid(selectedAgeb);
    }, [agebsData]);
    
    // Function to fly to AGEB centroid
    const flyToAgebCentroid = React.useCallback((ageb) => {
        if (!map.current || !ageb.geometry) {
            return;
        }
        
        try {
            // Calculate centroid using turf.js if available, otherwise use a simple approach
            let centroid;
            if (window.turf) {
                centroid = window.turf.center(ageb);
            } else {
                // Simple centroid calculation for polygon
                const coordinates = ageb.geometry.coordinates[0]; // First ring of polygon
                let sumLng = 0, sumLat = 0;
                coordinates.forEach(coord => {
                    sumLng += coord[0];
                    sumLat += coord[1];
                });
                centroid = {
                    geometry: {
                        coordinates: [sumLng / coordinates.length, sumLat / coordinates.length]
                    }
                };
            }
            
            const [lng, lat] = centroid.geometry.coordinates;
            
            // Use a more gentle animation with shorter duration
            if (map.current && map.current.flyTo) {
                map.current.flyTo({
                    center: [lng, lat],
                    zoom: 12,
                    pitch: 30,
                    bearing: 0,
                    duration: 1500 // Reduced duration
                });
            }
            
        } catch (error) {
            console.error('Error flying to AGEB centroid:', error);
        }
    }, []);
    
    // Function to add AGEBS to map
    const addAgebsToMap = React.useCallback(() => {
        if (!map.current || !mapReady || !agebsData) {
            return;
        }
        
        try {
            // Remove existing AGEBS layers and sources
            const layersToRemove = ['agebs-layer', 'highlighted-agebs-layer', 'highlighted-agebs-outline-layer'];
            const sourcesToRemove = ['agebs-source', 'highlighted-agebs-source'];
            
            // Remove layers first
            layersToRemove.forEach(layerId => {
                if (map.current && map.current.getLayer && map.current.getLayer(layerId)) {
                    map.current.removeLayer(layerId);
                }
            });
            
            // Remove sources
            sourcesToRemove.forEach(sourceId => {
                if (map.current && map.current.getSource && map.current.getSource(sourceId)) {
                    map.current.removeSource(sourceId);
                }
            });
            
            // Add AGEBS source
            map.current.addSource('agebs-source', {
                type: 'geojson',
                data: agebsData
            });
            
            // Add AGEBS border layer (subtle)
            map.current.addLayer({
                id: 'agebs-layer',
                type: 'line',
                source: 'agebs-source',
                paint: {
                    'line-color': '#FF0000',
                    'line-width': 2,
                    'line-opacity': 0.8
                }
            });
            
            // Set initial border color and opacity based on current state
            if (map.current && map.current.getLayer && map.current.getLayer('agebs-layer')) {
                map.current.setPaintProperty('agebs-layer', 'line-color', currentWordColor);
                let opacity = 0.6; // Default for intro
                if (currentState.type === 'case-study' || currentState.type === 'case-study-transport') {
                    opacity = 0.3;
                }
                map.current.setPaintProperty('agebs-layer', 'line-opacity', opacity);
            }
            
        } catch (error) {
            console.error('Error adding AGEBS to map:', error);
        }
    }, [agebsData, currentWordColor, mapReady]);
    
    // Function to update highlighted AGEBS on map
    const updateHighlightedAgebs = React.useCallback(() => {
        if (!map.current || !map.current.getSource || !map.current.getSource('highlighted-agebs-source')) {
            return;
        }
        
        try {
            const source = map.current.getSource('highlighted-agebs-source');
            source.setData({
                type: 'FeatureCollection',
                features: highlightedAgebs
            });
            
            // Also update the layer color if we have a highlighted AGEB
            if (highlightedAgebs.length > 0 && highlightedAgebs[0].properties.highlightColor) {
                const color = highlightedAgebs[0].properties.highlightColor;
                if (map.current && map.current.setPaintProperty) {
                    map.current.setPaintProperty('highlighted-agebs-layer', 'fill-color', color);
                    
                    // Update the border color of all AGEBS to match the current text color
                    map.current.setPaintProperty('agebs-layer', 'line-color', color);
                    map.current.setPaintProperty('agebs-layer', 'line-opacity', 0.6);
                }
            }
        } catch (error) {
            console.warn('Error updating highlighted AGEBS:', error);
        }
    }, [highlightedAgebs]);
    
    // Function to add highlighted AGEBS layer
    const addHighlightedAgebsLayer = React.useCallback(() => {
        if (!map.current || !mapReady) {
            return;
        }
        
    }, [mapReady]);
    
    // Function to add Metro layers to map
    const addMetroToMap = React.useCallback(() => {
        if (!map.current || !mapReady || !metroData) {
            return;
        }
        
        try {
            const mapInstance = map.current;
            
            // Remove existing Metro layers and sources
            const layersToRemove = ['metro-lines-layer', 'metro-stations-layer'];
            const sourcesToRemove = ['metro-source'];
            
            // Remove layers first
            layersToRemove.forEach(layerId => {
                if (mapInstance && mapInstance.getLayer && mapInstance.getLayer(layerId)) {
                    mapInstance.removeLayer(layerId);
                }
            });
            
            // Remove sources
            sourcesToRemove.forEach(sourceId => {
                if (mapInstance && mapInstance.getSource && mapInstance.getSource(sourceId)) {
                    mapInstance.removeSource(sourceId);
                }
            });
            
            // Add Metro source
            mapInstance.addSource('metro-source', {
                type: 'geojson',
                data: metroData
            });
            
            // Add Metro lines layer using the same logic as TransportSystemsPanel
            mapInstance.addLayer({
                id: 'metro-lines-layer',
                type: 'line',
                source: 'metro-source',
                filter: ['==', 'type', 'line'],
                paint: {
                    'line-color': ['get', 'color'],
                    'line-width': ['get', 'stroke']
                }
            });
            
            // Add Metro stations layer
            mapInstance.addLayer({
                id: 'metro-stations-layer',
                type: 'circle',
                source: 'metro-source',
                filter: ['==', 'type', 'station'],
                paint: {
                    'circle-color': ['get', 'color'],
                    'circle-radius': 4,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
            
        } catch (error) {
            console.error('Error adding Metro to map:', error);
        }
    }, [metroData, mapReady]);
    
    // Function to remove Metro layers from map
    const removeMetroFromMap = React.useCallback(() => {
        if (!map.current) {
            return;
        }
        
        try {
            const mapInstance = map.current;
            
            // Remove Metro layers and sources
            const layersToRemove = ['metro-lines-layer', 'metro-stations-layer'];
            const sourcesToRemove = ['metro-source'];
            
            // Remove layers first
            layersToRemove.forEach(layerId => {
                if (mapInstance && mapInstance.getLayer && mapInstance.getLayer(layerId)) {
                    mapInstance.removeLayer(layerId);
                }
            });
            
            // Remove sources
            sourcesToRemove.forEach(sourceId => {
                if (mapInstance && mapInstance.getSource && mapInstance.getSource(sourceId)) {
                    mapInstance.removeSource(sourceId);
                }
            });
            
        } catch (error) {
            console.error('Error removing Metro from map:', error);
        }
    }, []);
    
    // Function to remove AGEBS layers from map
    const removeAgebsFromMap = React.useCallback(() => {
        if (!map.current) {
            return;
        }
        
        try {
            const mapInstance = map.current;
            
            // Remove AGEBS layers and sources
            const layersToRemove = ['agebs-layer', 'highlighted-agebs-layer', 'highlighted-agebs-outline-layer'];
            const sourcesToRemove = ['agebs-source', 'highlighted-agebs-source'];
            
            // Remove layers first
            layersToRemove.forEach(layerId => {
                if (mapInstance && mapInstance.getLayer && mapInstance.getLayer(layerId)) {
                    mapInstance.removeLayer(layerId);
                }
            });
            
            // Remove sources
            sourcesToRemove.forEach(sourceId => {
                if (mapInstance && mapInstance.getSource && mapInstance.getSource(sourceId)) {
                    mapInstance.removeSource(sourceId);
                }
            });
            
        } catch (error) {
            console.error('Error removing AGEBS from map:', error);
        }
    }, []);
    
    // Function to update AGEB layer opacity based on current state
    const updateAgebLayerOpacity = React.useCallback(() => {
        if (!map.current || !mapReady) {
            return;
        }
        
        try {
            const mapInstance = map.current;
            
            // Check if AGEB layer exists
            if (mapInstance && mapInstance.getLayer && mapInstance.getLayer('agebs-layer')) {
                let opacity = 0.6; // Default for intro
                if (currentState.type === 'case-study' || currentState.type === 'case-study-transport') {
                    opacity = 0.3;
                }
                mapInstance.setPaintProperty('agebs-layer', 'line-opacity', opacity);
                
                // For transport state, also update the color to match current word color
                if (currentState.type === 'case-study-transport') {
                    mapInstance.setPaintProperty('agebs-layer', 'line-color', currentWordColor);
                }
            }
            
        } catch (error) {
            console.error('Error updating AGEB layer opacity:', error);
        }
    }, [currentState.type, mapReady, currentWordColor]);
    
    // Fetch AGEBS data on component mount
    React.useEffect(() => {
        // Only fetch if we don't have data already (to avoid unnecessary refetches)
        if (!agebsData) {
            fetchAgebsData();
        }
    }, [fetchAgebsData, agebsData]);
    
    // Fetch Metro data when needed
    React.useEffect(() => {
        // Only fetch Metro data if we're on the transport state and don't have data already
        if (currentState.type === 'case-study-transport' && !metroData) {
            fetchMetroData();
        }
    }, [fetchMetroData, metroData, currentState.type]);
    
    // Add AGEBS to map when data is loaded
    React.useEffect(() => {
        if (agebsData && (currentState.type === 'intro' || currentState.type === 'case-study')) {
            addAgebsToMap();
            // Add highlighted layer after a short delay to ensure base layer is loaded
            setTimeout(() => {
                addHighlightedAgebsLayer();
            }, 100);
        }
    }, [agebsData, currentState.type, addAgebsToMap, addHighlightedAgebsLayer]);
    
    // Add Metro to map when data is loaded for transport state
    React.useEffect(() => {
        if (metroData && currentState.type === 'case-study-transport') {
            addMetroToMap();
        } else if (currentState.type !== 'case-study-transport') {
            // Remove Metro layers when not in transport state
            removeMetroFromMap();
        }
    }, [metroData, currentState.type, addMetroToMap, removeMetroFromMap]);
    
    // Add AGEBS with yellow color for transport state
    React.useEffect(() => {
        if (currentState.type === 'case-study-transport' && agebsData && map.current && mapReady) {
            // Remove existing AGEBS first
            removeAgebsFromMap();
            
            // Add AGEBS with yellow color and 0.7 opacity for transport state
            try {
                // Add AGEBS source
                map.current.addSource('agebs-source', {
                    type: 'geojson',
                    data: agebsData
                });
                
                // Add AGEBS border layer with yellow color and 0.7 opacity
                map.current.addLayer({
                    id: 'agebs-layer',
                    type: 'line',
                    source: 'agebs-source',
                    paint: {
                        'line-color': '#FFD700', // Yellow color
                        'line-width': 2,
                        'line-opacity': 0.7
                    }
                });
                
            } catch (error) {
                console.error('Error adding AGEBS for transport state:', error);
            }
        }
    }, [currentState.type, agebsData, mapReady, removeAgebsFromMap]);
    
    // Update highlighted AGEBS when they change
    React.useEffect(() => {
        if (currentState.type === 'intro' && highlightedAgebs.length > 0) {
            updateHighlightedAgebs();
        }
    }, [highlightedAgebs, currentState.type, updateHighlightedAgebs]);
    
    // Function to add location images as Mapbox layers
    const addLocationLayersForState = (state) => {
        if (!map.current || !state.locations || state.type === 'intro') return;
        
        try {
            // Remove existing location layers
            removeLocationLayers();
            
            // Create GeoJSON features for each location
            const features = state.locations.map((location, index) => {
                const imageId = `location-${state.type}-${index}`;
                
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: location.coordinate
                    },
                    properties: {
                        id: imageId,
                        imageURL: location.imageURL,
                        iconSize: location.iconSize || 1,
                        index: index
                    }
                };
            });
            
            const geojson = {
                type: 'FeatureCollection',
                features: features
            };
            
            // Add source
            map.current.addSource(`location-images-${state.type}`, {
                type: 'geojson',
                data: geojson
            });
            
            // Load and add images for each location
            let loadedImagesCount = 0;
            const totalImages = state.locations.length;
            
            // Create a single layer for all images
            const layerId = `location-images-${state.type}`;
            

            
            state.locations.forEach((location, index) => {
                const imageId = `location-${state.type}-${index}`;
                
                // Load image using Mapbox's loadImage method
                map.current.loadImage(location.imageURL, (error, image) => {
                    if (error) {
                        console.error(`Error loading image ${imageId}:`, error);
                        loadedImagesCount++;
                        return;
                    }
                    
                    // Remove existing image if it exists
                    if (map.current && map.current.hasImage && map.current.hasImage(imageId)) {
                        map.current.removeImage(imageId);
                    }
                    
                    // Add the image to the map style
                    if (map.current && map.current.addImage) {
                        map.current.addImage(imageId, image);
                    }
                    
                    loadedImagesCount++;
                    
                    // Add the layer after all images are loaded
                    if (loadedImagesCount === totalImages) {
                        
                        if (map.current && map.current.getLayer && !map.current.getLayer(layerId)) {
                            map.current.addLayer({
                                id: layerId,
                                type: 'symbol',
                                source: `location-images-${state.type}`,
                                layout: {
                                    'icon-image': ['get', 'id'],
                                    'icon-size': ['get', 'iconSize'],
                                    'icon-allow-overlap': true,
                                    'icon-anchor': 'bottom'
                                },
                                paint: {
                                    'icon-opacity': 1
                                }
                            });

                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error adding location layers for state:', error);
        }
    };
    
    // Function to remove location layers
    const removeLocationLayers = () => {
        if (!map.current) return;
        
        try {
            // Remove all location image layers and sources
            const layerTypes = ['case-study', 'case-study-transport'];
            
            layerTypes.forEach(type => {
                const sourceId = `location-images-${type}`;
                
                // Remove layer for this source
                const layerId = `location-images-${type}`;
                if (map.current && map.current.getLayer && map.current.getLayer(layerId)) {
                    map.current.removeLayer(layerId);
                }
                
                // Remove source
                if (map.current && map.current.getSource && map.current.getSource(sourceId)) {
                    map.current.removeSource(sourceId);
                }
                
                // Remove images
                for (let i = 0; i < 10; i++) {
                    const imageId = `location-${type}-${i}`;
                    if (map.current && map.current.hasImage && map.current.hasImage(imageId)) {
                        map.current.removeImage(imageId);
                    }
                }
            });
        } catch (error) {
            console.warn('Error removing location layers:', error);
        }
    };
    
    // Notify parent of initial state on mount
    React.useEffect(() => {
        if (onStateChange) {
            onStateChange(currentState);
        }
    }, []); // Empty dependency array means this runs only on mount
    
    // Function to transition to a specific state
    const transitionToState = (newIndex) => {
        if (newIndex === currentStateIndex || isTransitioning) return;
        
        setIsTransitioning(true);
        
        // Stop any existing rotation animation
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
            animationFrame.current = null;
        }
        
        // Instant state change
        setCurrentStateIndex(newIndex);
        
        // Notify parent of state change
        if (onStateChange) {
            onStateChange(states[newIndex]);
        }
        
        // Update map center and view instantly for states with center coordinates
        if (map.current && map.current.flyTo && states[newIndex].center) {
            let zoom = 17; // Default zoom for case studies
            if (states[newIndex].type === 'intro') {
                zoom = 11;
            } else if (states[newIndex].type === 'case-study-transport' && states[newIndex].zoom) {
                zoom = states[newIndex].zoom;
            }
            
            map.current.flyTo({
                center: states[newIndex].center,
                zoom: zoom,
                pitch: states[newIndex].type === 'intro' ? 0 : 75,
                bearing: states[newIndex].type === 'intro' ? 0 : 50,
                duration: 0 // Instant transition
            });
        }
        
        // Complete transition immediately
        setIsTransitioning(false);
    };
    
    React.useEffect(() => {
        if (!mapContainer.current) return;

        // Reset map ready state
        setMapReady(false);

        // Set Mapbox access token
        mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';

        // Initialize map with fixed style
        if (currentState.center) {
            let initialZoom = 17; // Default zoom for case studies
            if (currentState.type === 'intro') {
                initialZoom = 11;
            } else if (currentState.type === 'case-study-transport' && currentState.zoom) {
                initialZoom = currentState.zoom;
            }
            
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: "mapbox://styles/vidriloco/clwy3ijjn010701qpax1s54hk",
                center: currentState.center,
                zoom: initialZoom,
                pitch: currentState.type === 'intro' ? 0 : 85,
                bearing: currentState.type === 'intro' ? 0 : 50,
                interactive: false
            });



            map.current.on('load', () => {
                setMapReady(true);
                
                if (currentState.type === 'intro' && agebsData) {
                    // Add AGEBS for intro state
                    addAgebsToMap();
                    // Add highlighted layer after a short delay
                    setTimeout(() => {
                        addHighlightedAgebsLayer();
                    }, 100);
                } else if (currentState.type === 'case-study-transport') {
                    // Add Metro for transport state and location layers with yellow AGEBS
                    addLocationLayersForState(currentState);
                    if (metroData) {
                        addMetroToMap();
                    }
                    if (agebsData) {
                        // Add AGEBS with yellow color and 0.7 opacity for transport state
                        try {
                            // Add AGEBS source
                            map.current.addSource('agebs-source', {
                                type: 'geojson',
                                data: agebsData
                            });
                            
                            // Add AGEBS border layer with yellow color and 0.7 opacity
                            map.current.addLayer({
                                id: 'agebs-layer',
                                type: 'line',
                                source: 'agebs-source',
                                paint: {
                                    'line-color': '#FFD700', // Yellow color
                                    'line-width': 2,
                                    'line-opacity': 0.7
                                }
                            });
                            
                        } catch (error) {
                            console.error('Error adding AGEBS for transport state:', error);
                        }
                    }
                } else if (currentState.type === 'case-study') {
                    // Add location layers and AGEB layers for regular case study states
                    addLocationLayersForState(currentState);
                    if (agebsData) {
                        addAgebsToMap();
                        setTimeout(() => {
                            addHighlightedAgebsLayer();
                        }, 100);
                    }
                }
            });
        }

        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
            if (map.current) {
                try {
                    map.current.remove();
                } catch (error) {
                    console.warn('Error removing map:', error);
                }
            }
            // Remove all location layers
            removeLocationLayers();
        };
    }, []); // Only run on mount, not on state changes

    // Handle AGEBS data loading after map is loaded
    React.useEffect(() => {
        if (map.current && mapReady && agebsData && (currentState.type === 'intro' || currentState.type === 'case-study')) {
            addAgebsToMap();
        }
    }, [agebsData, currentState.type, addAgebsToMap, mapReady]);
    
    // Handle Metro data loading after map is loaded
    React.useEffect(() => {
        if (map.current && mapReady && metroData && currentState.type === 'case-study-transport') {
            addMetroToMap();
        }
    }, [metroData, currentState.type, addMetroToMap, mapReady]);
    
    // Update AGEB layer opacity when state changes
    React.useEffect(() => {
        updateAgebLayerOpacity();
    }, [updateAgebLayerOpacity, currentState.type]);
    
    // Ensure AGEBS layers are added when applicable states are active and map is ready
    React.useEffect(() => {
        if ((currentState.type === 'intro' || currentState.type === 'case-study') && map.current && mapReady && agebsData) {
            // Only add AGEBS layers if they don't already exist
            if (!map.current.getLayer('agebs-layer')) {
                addAgebsToMap();
                setTimeout(() => {
                    addHighlightedAgebsLayer();
                }, 100);
            }
        }
    }, [currentStateIndex, currentState.type, agebsData, addAgebsToMap, addHighlightedAgebsLayer, mapReady]);
    
    // Handle rotation and markers for non-intro states
    React.useEffect(() => {
        if (map.current && mapReady && currentState.type !== 'intro') {
            // Clear any existing animation frame
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
            
            // Start rotation for non-intro states
            const rotateMap = () => {
                if (map.current && !isTransitioning && currentState.type !== 'intro') {
                    const bearing = (map.current.getBearing() + rotationSpeed) % 360;
                    map.current.easeTo({
                        bearing: bearing,
                        duration: 1000 // Smooth rotation
                    });
                }
                animationFrame.current = requestAnimationFrame(rotateMap);
            };
            
            // Start rotation
            rotateMap();
            
            // Add location layers for non-intro states
            addLocationLayersForState(currentState);
        } else if (map.current && mapReady && currentState.type === 'intro') {
            // Stop rotation for intro states
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
                animationFrame.current = null;
            }
        }
    }, [currentStateIndex, currentState.type, mapReady, rotationSpeed, isTransitioning]);

    // Handle state transitions
    React.useEffect(() => {
        // Notify parent of initial state
        if (onStateChange) {
            onStateChange(currentState);
        }
    }, [currentStateIndex]);

    // Animate geo words and action words for intro state
    React.useEffect(() => {
        if (currentState.type === 'intro' && currentState.geoWords) {
            const interval = setInterval(() => {
                setCurrentGeoWordIndex((prevIndex) => 
                    (prevIndex + 1) % currentState.geoWords.length
                );
                
                // Also cycle through action words
                setCurrentActionWordIndex((prevIndex) => 
                    (prevIndex + 1) % currentState.actionWords.length
                );
                
                // Generate vibrant random color for the new word
                const vibrantColors = [
                    '#FF1744', // Bright Red
                    '#00E676', // Bright Green
                    '#2196F3', // Bright Blue
                    '#FF9800', // Bright Orange
                    '#9C27B0', // Bright Purple
                    '#FFEB3B', // Bright Yellow
                    '#00BCD4', // Bright Cyan
                    '#FF5722', // Bright Deep Orange
                    '#4CAF50', // Bright Green
                    '#E91E63', // Bright Pink
                    '#3F51B5', // Bright Indigo
                    '#FFC107', // Bright Amber
                    '#009688', // Bright Teal
                    '#FF4081', // Bright Pink
                    '#8BC34A'  // Bright Light Green
                ];
                
                // Ensure we get a different color than the current one
                let newColor;
                do {
                    newColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
                } while (newColor === currentWordColor && vibrantColors.length > 1);
                
                setCurrentWordColor(newColor);
                
                // Highlight random AGEBS with the new color
                highlightRandomAgebs(newColor);
            }, 5000); // Increased to 5 seconds to reduce frequency

            return () => clearInterval(interval);
        }
    }, [currentStateIndex, currentState.type, currentState.geoWords, currentState.actionWords, highlightRandomAgebs]);

    // Animate question bodies for case-study-transport state
    React.useEffect(() => {
        if (currentState.type === 'case-study-transport' && currentState.questionBodies) {
            const interval = setInterval(() => {
                setCurrentQuestionBodyIndex((prevIndex) => 
                    (prevIndex + 1) % currentState.questionBodies.length
                );
                
                // Generate vibrant random color for the new question body
                const vibrantColors = [
                    '#FF1744', // Bright Red
                    '#00E676', // Bright Green
                    '#2196F3', // Bright Blue
                    '#FF9800', // Bright Orange
                    '#9C27B0', // Bright Purple
                    '#FFEB3B', // Bright Yellow
                    '#00BCD4', // Bright Cyan
                    '#FF5722', // Bright Deep Orange
                    '#4CAF50', // Bright Green
                    '#E91E63', // Bright Pink
                    '#3F51B5', // Bright Indigo
                    '#FFC107', // Bright Amber
                    '#009688', // Bright Teal
                    '#FF4081', // Bright Pink
                    '#8BC34A'  // Bright Light Green
                ];
                
                // Ensure we get a different color than the current one
                let newColor;
                do {
                    newColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
                } while (newColor === currentWordColor && vibrantColors.length > 1);
                
                setCurrentWordColor(newColor);
                
            }, 6000); // Increased to 6 seconds to reduce frequency

            return () => clearInterval(interval);
        }
    }, [currentStateIndex, currentState.type, currentState.questionBodies, currentWordColor]);

    // Highlight AGEBS when intro state starts (only for intro, not for case studies)
    React.useEffect(() => {
        if (currentState.type === 'intro' && agebsData && agebsData.features) {
            // Initial highlighting with current word color
            // Add a small delay to prevent immediate updates
            const timeoutId = setTimeout(() => {
                highlightRandomAgebs(currentWordColor);
            }, 100);
            
            return () => clearTimeout(timeoutId);
        }
    }, [currentStateIndex, agebsData, currentWordColor, highlightRandomAgebs]);

    // Store component instance for debugging
    React.useEffect(() => {
        window.currentStateShowcaserInstance = {
            forceRefreshAgebsData,
            forceRefreshMetroData,
            agebsData,
            metroData,
            currentState,
            map: map.current
        };
    }, [forceRefreshAgebsData, forceRefreshMetroData, agebsData, metroData, currentState]);

    return (
        <div className="state-showcaser">
            <div className={`map-container ${isTransitioning ? 'fading' : ''}`}>
                <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
                {currentState.type === 'intro' && (
                    <div 
                        className="map-overlay"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#000080',
                            opacity: 0.2,
                            pointerEvents: 'none',
                            zIndex: 1
                        }}
                    />
                )}
            </div>
            
            {currentState.type === 'intro' ? (
                <div 
                    className={`state-info intro ${isTransitioning ? 'fading' : ''}`}
                    style={{ 
                        zIndex: 9999,
                        color: '#fff'
                    }}
                >
                    <div className="state-content">
                        <div className="state-text" style={{ display: 'flex', flexDirection: 'column' }}>
                            <h2 
                                className="state-title" 
                                style={{ color: '#fff' }}
                                dangerouslySetInnerHTML={{
                                    __html: currentState.title
                                        .replace('<geo>', 
                                            `<span style="color: ${currentWordColor}; font-weight: bold; background-color: #000; padding: 2px 6px; border-radius: 4px;">${
                                                currentState.geoWords ? currentState.geoWords[currentGeoWordIndex] : 'barrio'
                                            }</span>`
                                        )
                                        .replace('<action>', 
                                            `<span style="color: #fff; font-weight: bold;">${
                                                currentState.actionWords ? currentState.actionWords[currentActionWordIndex] : 'vives'
                                            }</span>`
                                        )
                                }}
                            />
                            <p className="state-description" style={{ color: '#fff' }}>{currentState.description}</p>
                            <a 
                                href="#" 
                                className="explorar-link"
                                onClick={(e) => {
                                    e.preventDefault();
                                    
                                    // Track analytics event
                                    if (window.analyticsService) {
                                        window.analyticsService.track('TO_USE_CASES', {
                                            button_text: 'Conocer más',
                                            button_location: 'landing_hero',
                                            current_state: 'intro'
                                        });
                                    }
                                    
                                    transitionToState(1); // Go to first case study
                                }}
                            >
                                Conocer más <span className="chevron-right">→</span>
                            </a>
                        </div>
                    </div>
                </div>
            ) : (
                <div 
                    className={`state-info ${isTransitioning ? 'fading' : ''}`}
                    style={{ 
                        zIndex: 9999
                    }}
                >
                    {/* Navigation Arrows */}
                    <div className="state-nav-arrows">
                        <button 
                            className="state-nav-arrow prev"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const prevIndex = currentStateIndex > 1 ? currentStateIndex - 1 : states.length - 1;
                                transitionToState(prevIndex);
                            }}
                            aria-label="Previous state"
                        >
                            ←
                        </button>
                        <button 
                            className="state-nav-arrow next"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const nextIndex = currentStateIndex < states.length - 1 ? currentStateIndex + 1 : 1;
                                transitionToState(nextIndex);
                            }}
                            aria-label="Next state"
                        >
                            →
                        </button>
                    </div>
                    <div className="state-content">
                        <div className="state-icon" style={{ color: currentState.textColor }}>{currentState.image}</div>
                        <div className="state-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h2 
                                className="state-title" 
                                style={{ color: currentState.textColor }}
                                dangerouslySetInnerHTML={{
                                    __html: currentState.type === 'case-study-transport' && currentState.questionBodies
                                        ? currentState.title.replace('<question_body>', 
                                            `<span style="color: ${currentWordColor}; font-weight: bold;">${
                                                currentState.questionBodies[currentQuestionBodyIndex]
                                            }</span>`
                                        )
                                        : currentState.title
                                }}
                            />
                            <p className="state-description" style={{ color: currentState.textColor }}>{currentState.description}</p>
                            <a 
                                href={currentState.buttonURL || '/explorar'}
                                className="explorar-link-case" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    
                                    // Track analytics event based on button type
                                    if (window.analyticsService) {
                                        let eventKey = 'BUTTON_CLICK';
                                        let properties = {
                                            button_text: currentState.buttonTitle || 'Explorar',
                                            button_location: 'state_showcase',
                                            current_state: currentState.type,
                                            button_url: currentState.buttonURL
                                        };
                                        
                                        // Map specific buttons to their events
                                        if (currentState.buttonTitle === 'Encuentra la mejor zona') {
                                            eventKey = 'INTEREST_HOUSING';
                                        } else if (currentState.buttonTitle === 'Soluciones para tu negocio') {
                                            eventKey = 'TO_BUSINESS';
                                        } else if (currentState.buttonTitle === 'Explorar transporte') {
                                            eventKey = 'INTEREST_TRANSPORT';
                                        }
                                        
                                        window.analyticsService.track(eventKey, properties);
                                    }
                                    
                                    // Check if the state is enabled
                                    if (currentState.enabled === true) {
                                        // Navigate to the URL directly
                                        if (window.navigate) {
                                            window.navigate(currentState.buttonURL || '/explorar');
                                        } else {
                                            window.location.href = currentState.buttonURL || '/explorar';
                                        }
                                    } else {
                                        // Current behavior for disabled states
                                        // Update URL without triggering navigation
                                        if (window.history && window.history.pushState) {
                                            window.history.pushState({}, '', currentState.buttonURL || '/explorar');
                                        }
                                        
                                        // Show CatchLead panel if URL is /vivienda
                                        if (currentState.buttonURL === '/vivienda' && onShowCatchLead) {
                                            onShowCatchLead();
                                        }
                                    }
                                }}
                            >
                                {currentState.buttonTitle || 'Explorar'} <span className="chevron-right">→</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}
            
            {currentState.type !== 'intro' && (
                <div className="state-indicator">
                    {states.map((state, index) => (
                        // Skip the first state (intro) when not in intro state
                        index === 0 ? null : (
                            <button 
                                key={index} 
                                className={`indicator-dot ${index === currentStateIndex ? 'active' : ''}`}
                                onClick={() => transitionToState(index)}
                                aria-label={`Go to slide ${index + 1}`}
                                style={{
                                    backgroundColor: index === currentStateIndex 
                                        ? (state.type === 'intro' ? '#fff' : currentState.sliderColor)
                                        : (state.type === 'intro' ? 'rgba(255, 255, 255, 0.3)' : `${currentState.sliderColor}4d`) // 30% opacity for inactive
                                }}
                            />
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

// Make the component available globally
window.StateShowcaser = StateShowcaser;
