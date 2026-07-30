// Cookie utility functions
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

const setCookie = (name, value, days = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

// Introduction component for the transport section
function TransportIntroduction({ onComplete }) {
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    const handleComplete = () => {
        if (dontShowAgain) {
            setCookie('transportSectionIntro', 'completed');
        }
        onComplete();
    };

    return (
        <div className="transport-introduction-overlay">
            <div className="transport-introduction-container">
                <div className="transport-introduction-content">
                    <div className="transport-intro-image">
                        <img 
                            src="/static/images/cablebus-logo.png" 
                            alt="Transporte público sección" 
                            className="intro-image"
                        />
                    </div>
                    <div className="transport-intro-text">
                        <h2 className="intro-title">Distritos MX <br /> <span className="intro-emphasis">Sistemas de Transporte</span></h2>
                        <p className="intro-description">
                            En esta sección mostramos diferentes data sets para entender mejor la movilidad en tu ciudad.
                        </p>
                        <div className="intro-actions-container">
                            <div className="intro-checkbox-container">
                                <input 
                                    type="checkbox" 
                                    id="dont-show-intro" 
                                    className="intro-checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                />
                                <label htmlFor="dont-show-intro" className="intro-checkbox-label">
                                    No mostrar de nuevo
                                </label>
                            </div>
                            
                            <button 
                                className="empezar-button"
                                onClick={handleComplete}
                            >
                                Explorar Transporte
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
}

// TransportPageWelcomeIntro component - Wraps the existing MapAdminApp for the /transporte route
function TransportPageWelcomeIntro() {
    const [showIntro, setShowIntro] = React.useState(false);
    const [showHelpPanel, setShowHelpPanel] = React.useState(false);
    const [isHelpPanelAutomatic, setIsHelpPanelAutomatic] = React.useState(false);
    const [dataLoading, setDataLoading] = React.useState(false);
    const [dataError, setDataError] = React.useState(null);
    const [geojsonLayers, setGeojsonLayers] = React.useState([]);
    const [visibleLayers, setVisibleLayers] = React.useState(new Set());
    const [loadingProgress, setLoadingProgress] = React.useState({ stage: '', progress: 0, detail: '' });
    const [zipFileSize, setZipFileSize] = React.useState(0);
    const [downloadedBytes, setDownloadedBytes] = React.useState(0);
    const [dataDate, setDataDate] = React.useState(null);

    // Function to humanize timestamp
    const humanizeTimestamp = (timestamp) => {
        if (!timestamp) return 'Fecha no disponible';
        
        try {
            // If timestamp is in milliseconds, convert to seconds
            const ts = timestamp > 10000000000 ? timestamp / 1000 : timestamp;
            const date = new Date(ts * 1000);
            
            // Format date and time in Spanish
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Mexico_City'
            };
            
            return date.toLocaleDateString('es-MX', options);
        } catch (error) {
            // Fallback: try to parse as ISO string
            try {
                const date = new Date(timestamp);
                const options = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Mexico_City'
                };
                return date.toLocaleDateString('es-MX', options);
            } catch (fallbackError) {
                return 'Fecha no disponible';
            }
        }
    };

    // Function to clear all geojson layers
    const clearAllGeojsonLayers = () => {
        if (!window.map || !window.map.isStyleLoaded) return;
        
        const map = window.map;
        
        // Remove all geojson layers and sources
        geojsonLayers.forEach((layer, index) => {
            const layerId = `geojson-layer-${index}`;
            const sourceId = `geojson-source-${index}`;
            
            try {
                if (map.getLayer && map.getLayer(layerId)) {
                    map.removeLayer(layerId);
                }
                if (map.getSource && map.getSource(sourceId)) {
                    map.removeSource(sourceId);
                }
            } catch (error) {
                console.warn(`Error removing layer/source ${layerId}:`, error);
            }
        });
        
        console.log('Cleared all geojson layers');
    };

    // Function to add a GeoJSON layer to the map
    const addGeojsonLayerToMap = (data, layerName, index) => {
        if (!window.map || !window.map.isStyleLoaded || !data || !data.features) {
            console.error('Map not ready or invalid data');
            return;
        }
        
        const map = window.map;
        const layerId = `geojson-layer-${index}`;
        const sourceId = `geojson-source-${index}`;
        
        // Remove existing layer and source if they exist
        try {
            if (map.getLayer && map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
            if (map.getSource && map.getSource(sourceId)) {
                map.removeSource(sourceId);
            }
        } catch (error) {
            console.warn(`Error removing existing layer/source for ${layerName}:`, error);
        }
        
        // Generate color based on layer index
        const colors = [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
            '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
            '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d2', '#c7c7c7',
            '#dbdb8d', '#9edae5', '#393b79', '#637939', '#8c6d31', '#843c39'
        ];
        
        const color = colors[index % colors.length];
        
        // Determine layer type based on geometry
        let layerType = 'circle';
        let layerPaint = {
            'circle-radius': 4,
            'circle-color': color,
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
        };
        
        // Check if we have different geometry types
        if (data.features && data.features.length > 0) {
            const firstGeometry = data.features[0].geometry;
            if (firstGeometry.type === 'LineString' || firstGeometry.type === 'MultiLineString') {
                layerType = 'line';
                layerPaint = {
                    'line-color': color,
                    'line-width': 3,
                    'line-opacity': 0.8
                };
            } else if (firstGeometry.type === 'Polygon' || firstGeometry.type === 'MultiPolygon') {
                layerType = 'fill';
                layerPaint = {
                    'fill-color': color,
                    'fill-opacity': 0.6,
                    'fill-outline-color': color
                };
            }
        }
        
        // Add the geojson source
        try {
            map.addSource(sourceId, {
                type: 'geojson',
                data: data
            });
            
            // Add the layer
            map.addLayer({
                id: layerId,
                type: layerType,
                source: sourceId,
                paint: layerPaint
            });
        } catch (error) {
            console.error(`Error adding source/layer for ${layerName}:`, error);
            return;
        }
        
        // Add click event for popup
        try {
            map.on('click', layerId, (e) => {
                if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    const coordinates = feature.geometry.type === 'Point' 
                        ? feature.geometry.coordinates.slice()
                        : e.lngLat;
                    const properties = feature.properties;
                    
                    // Get timestamp for title - check multiple possible timestamp fields
                    let timestamp = (properties && properties.timestamp) || 
                                  (properties && properties.timestamp_datetime) || 
                                  (properties && properties.mexico_time) || 
                                  (properties && properties.created_at);
                    
                    // Create humanized title
                    const humanizedTitle = humanizeTimestamp(timestamp);
                    
                    // Create popup content with humanized timestamp as title
                    let popupContent = `
                        <div style="padding: 12px; min-width: 200px;">
                            <h3 style="margin: 0 0 12px 0; color: #333; font-size: 16px; font-weight: 600; border-bottom: 1px solid #eee; padding-bottom: 8px;">${humanizedTitle}</h3>
                            <p style="margin: 6px 0; font-size: 14px;"><strong>Tipo:</strong> ${feature.geometry.type}</p>
                    `;
                    
                    // Add feature properties (excluding timestamp fields we already used)
                    if (properties) {
                        const excludeKeys = ['timestamp', 'timestamp_datetime', 'mexico_time', 'created_at'];
                        const filteredKeys = Object.keys(properties)
                            .filter(key => !excludeKeys.includes(key))
                            .slice(0, 4); // Show max 4 additional properties
                        
                        filteredKeys.forEach(key => {
                            const value = properties[key];
                            if (value !== null && value !== undefined && value !== '') {
                                // Format the key name nicely
                                const formattedKey = key.replace(/_/g, ' ')
                                    .replace(/\b\w/g, l => l.toUpperCase());
                                
                                popupContent += `<p style="margin: 6px 0; font-size: 14px;"><strong>${formattedKey}:</strong> ${value}</p>`;
                            }
                        });
                    }
                    
                    popupContent += `</div>`;
                    
                    // Create and show popup
                    new mapboxgl.Popup()
                        .setLngLat(coordinates)
                        .setHTML(popupContent)
                        .addTo(map);
                }
            });
            
            // Change cursor on hover
            map.on('mouseenter', layerId, () => {
                if (map.getCanvas()) {
                    map.getCanvas().style.cursor = 'pointer';
                }
            });
            
            map.on('mouseleave', layerId, () => {
                if (map.getCanvas()) {
                    map.getCanvas().style.cursor = '';
                }
            });
        } catch (error) {
            console.warn(`Error adding events for layer ${layerId}:`, error);
        }
        
        console.log(`GeoJSON layer ${layerName} added to map with ${data.features.length} features`);
    };

    // Function to fetch and display GeoJSON data from S3 ZIP file
    const fetchAndDisplayGeojsonData = async () => {
        try {
            setDataLoading(true);
            setDataError(null);
            console.log('Fetching GeoJSON data from S3 ZIP file...');
            
            const zipUrl = 'https://distritosmexico.s3.us-east-2.amazonaws.com/2025-01-07.zip';
            
            // Wait for the map to be ready
            const waitForMap = () => {
                if (window.map && window.map.isStyleLoaded && typeof window.map.isStyleLoaded === 'function' && window.map.isStyleLoaded()) {
                    console.log('Map is ready for data processing');
                    downloadAndProcessZip(zipUrl);
                } else {
                    console.log('Map not ready for data processing, retrying in 200ms');
                    setTimeout(waitForMap, 200);
                }
            };
            
            waitForMap();
            
        } catch (error) {
            console.error('Error setting up GeoJSON data fetch:', error);
            setDataError(error.message);
            setDataLoading(false);
        }
    };

    // Function to download and process ZIP file from S3
    const downloadAndProcessZip = async (zipUrl) => {
        try {
            console.log('Downloading ZIP file from:', zipUrl);
            
            // Reset states and clear any existing layers
            setGeojsonLayers([]);
            setVisibleLayers(new Set());
            setDataDate(null); // Clear previous date
            clearAllGeojsonLayers(); // Clear map layers
            
            // Progress allocation: 60% download, 10% extract, 30% process
            const DOWNLOAD_WEIGHT = 0.6;
            const EXTRACT_WEIGHT = 0.1;
            const PROCESS_WEIGHT = 0.3;
            
            setLoadingProgress({ stage: 'downloading', progress: 0, detail: 'Iniciando descarga...' });
            
            // Check if the browser supports fetch with progress tracking
            const response = await fetch(zipUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Get file size for progress tracking
            const contentLength = response.headers.get('content-length');
            const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
            setZipFileSize(totalSize);
            
            // Read response with progress tracking
            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;
            
            setLoadingProgress({ 
                stage: 'downloading', 
                progress: 0, 
                detail: `Descargando archivo ZIP${totalSize > 0 ? ` (${(totalSize / 1024 / 1024).toFixed(1)} MB)` : ''}...` 
            });
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                setDownloadedBytes(receivedLength);
                
                if (totalSize > 0) {
                    const downloadProgress = receivedLength / totalSize;
                    const totalProgress = Math.round(downloadProgress * DOWNLOAD_WEIGHT * 100);
                    setLoadingProgress({ 
                        stage: 'downloading', 
                        progress: totalProgress, 
                        detail: `Descargado ${(receivedLength / 1024 / 1024).toFixed(1)} MB de ${(totalSize / 1024 / 1024).toFixed(1)} MB` 
                    });
                }
            }
            
            // Combine chunks into single array buffer
            const zipData = new Uint8Array(receivedLength);
            let offset = 0;
            for (const chunk of chunks) {
                zipData.set(chunk, offset);
                offset += chunk.length;
            }
            
            console.log('ZIP file downloaded, size:', zipData.byteLength, 'bytes');
            
            // Start extraction phase - progress continues from where download left off
            const extractStartProgress = Math.round(DOWNLOAD_WEIGHT * 100);
            setLoadingProgress({ 
                stage: 'extracting', 
                progress: extractStartProgress, 
                detail: 'Extrayendo contenido del archivo ZIP...' 
            });
            
            // Load ZIP file using JSZip
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(zipData.buffer);
            
            console.log('ZIP file loaded, contents:', Object.keys(zipContent.files));
            
            // Extract only GeoJSON files (ignore other formats)
            const geojsonFiles = Object.keys(zipContent.files).filter(filename => 
                filename.toLowerCase().endsWith('.geojson')
            );
            
            console.log('Found GeoJSON files:', geojsonFiles);
            
            if (geojsonFiles.length === 0) {
                throw new Error('No se encontraron archivos GeoJSON en el ZIP');
            }
            
            // Start processing phase - progress continues from extraction end
            const processStartProgress = Math.round((DOWNLOAD_WEIGHT + EXTRACT_WEIGHT) * 100);
            setLoadingProgress({ 
                stage: 'processing', 
                progress: processStartProgress, 
                detail: `Procesando ${geojsonFiles.length} archivos GeoJSON...` 
            });
            
            // Process each GeoJSON file progressively
            for (let i = 0; i < geojsonFiles.length; i++) {
                const filename = geojsonFiles[i];
                try {
                    console.log(`Processing file ${i + 1}/${geojsonFiles.length}: ${filename}`);
                    
                    // Calculate cumulative progress
                    const processProgress = i / geojsonFiles.length;
                    const totalProgress = Math.round((DOWNLOAD_WEIGHT + EXTRACT_WEIGHT + (processProgress * PROCESS_WEIGHT)) * 100);
                    
                    setLoadingProgress({ 
                        stage: 'processing', 
                        progress: totalProgress, 
                        detail: `Procesando ${filename} (${i + 1}/${geojsonFiles.length})...` 
                    });
                    
                    const fileContent = await zipContent.files[filename].async('string');
                    const geojsonData = JSON.parse(fileContent);
                    
                    // Parse filename to extract date/time info
                    const fileInfo = parseBatchFilename(filename);
                    
                    // Create layer object - NOT visible by default, only when user clicks
                    const layer = {
                        name: filename.replace(/\.geojson$/i, ''),
                        filename: filename,
                        data: geojsonData,
                        featureCount: geojsonData.features ? geojsonData.features.length : 0,
                        index: i,
                        visible: false, // Layers are hidden by default, only shown when user clicks
                        // Add parsed info
                        batchInfo: fileInfo
                    };
                    
                    // Add layer progressively to the UI
                    addLayerProgressively(layer);
                    console.log(`Layer processed: ${layer.name} with ${layer.featureCount} features`);
                    
                    // Small delay to allow UI to update
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                } catch (error) {
                    console.error(`Error processing file ${filename}:`, error);
                }
            }
            
            // Finished processing - ensure we hit 100%
            setLoadingProgress({ 
                stage: 'completed', 
                progress: 100, 
                detail: `Completado: ${geojsonFiles.length} capas procesadas` 
            });
            setDataLoading(false);
            
            console.log(`Successfully processed ${geojsonFiles.length} GeoJSON layers`);
            
        } catch (error) {
            console.error('Error downloading or processing ZIP file:', error);
            setDataError(error.message);
            setDataLoading(false);
            setLoadingProgress({ stage: 'error', progress: 0, detail: error.message });
        }
    };
    
    // Function to toggle layer visibility - only add/remove when user clicks (max 3 layers)
    const toggleLayerVisibility = (layerIndex) => {
        const layer = geojsonLayers[layerIndex];
        if (!layer) return;
        
        const isVisible = visibleLayers.has(layerIndex);
        const newVisibleLayers = new Set(visibleLayers);
        
        if (isVisible) {
            // Hide layer
            newVisibleLayers.delete(layerIndex);
            
            // Remove from map
            if (window.map && window.map.isStyleLoaded) {
                const map = window.map;
                const layerId = `geojson-layer-${layerIndex}`;
                const sourceId = `geojson-source-${layerIndex}`;
                
                try {
                    if (map.getLayer && map.getLayer(layerId)) {
                        map.removeLayer(layerId);
                    }
                    if (map.getSource && map.getSource(sourceId)) {
                        map.removeSource(sourceId);
                    }
                    console.log(`Layer ${layer.name} hidden`);
                } catch (error) {
                    console.warn(`Error hiding layer ${layer.name}:`, error);
                }
            }
        } else {
            // Check if we've reached the maximum of 2 layers
            if (visibleLayers.size >= 2) {
                console.warn('Maximum of 2 layers can be selected at once');
                return; // Don't allow more than 2 layers
            }
            
            // Show layer - only add to map when user manually clicks
            newVisibleLayers.add(layerIndex);
            
            // Add to map
            if (window.map && window.map.isStyleLoaded) {
                addGeojsonLayerToMap(layer.data, layer.name, layerIndex);
                console.log(`Layer ${layer.name} manually added to map`);
            } else {
                console.warn('Map not ready, cannot add layer');
            }
        }
        
        setVisibleLayers(newVisibleLayers);
    };
    
    // Function to parse batch filename and extract date/time info (GeoJSON only)
    const parseBatchFilename = (filename) => {
        // Extract name without extension (only .geojson files)
        const nameWithoutExt = filename.replace(/\.geojson$/i, '');
        
        // Pattern: batch_001_20250701_0000_to_20250701_0200
        const batchPattern = /batch_(\d+)_(\d{8})_(\d{4})_to_(\d{8})_(\d{4})/;
        const match = nameWithoutExt.match(batchPattern);
        
        if (match) {
            const [, batchNum, startDate, startTime, endDate, endTime] = match;
            
            // Parse dates
            const startYear = startDate.substring(0, 4);
            const startMonth = startDate.substring(4, 6);
            const startDay = startDate.substring(6, 8);
            
            // Parse times
            const startHour = parseInt(startTime.substring(0, 2));
            const endHour = parseInt(endTime.substring(0, 2));
            
            // Format date
            const formattedDate = `${startYear}-${startMonth}-${startDay}`;
            
            // Format hour range
            const hourRange = `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
            
            return {
                batchNumber: parseInt(batchNum),
                date: formattedDate,
                startHour,
                endHour,
                hourRange,
                displayName: `Batch ${batchNum} (${hourRange})`
            };
        }
        
        // Fallback for non-batch files
        return {
            batchNumber: null,
            date: null,
            startHour: null,
            endHour: null,
            hourRange: null,
            displayName: nameWithoutExt
        };
    };

    // Function to add a layer progressively
    const addLayerProgressively = (layer) => {
        setGeojsonLayers(prevLayers => {
            // Check if layer already exists to prevent duplicates
            const existingLayer = prevLayers.find(l => l.filename === layer.filename);
            if (existingLayer) {
                console.warn(`Layer ${layer.filename} already exists, skipping duplicate`);
                return prevLayers;
            }
            
            // Update data date if this is the first layer with date info
            if (layer.batchInfo && layer.batchInfo.date && !dataDate) {
                setDataDate(layer.batchInfo.date);
            }
            
            return [...prevLayers, layer];
        });
    };

    // Check for cookies on component mount
    React.useEffect(() => {
        const introCompleted = getCookie('transportSectionIntro');
        const helpPanelSeen = getCookie('transportHelpPanelSeen');
        
        console.log('Transport intro check:', { introCompleted, helpPanelSeen });
        
        if (!introCompleted) {
            console.log('Showing transport intro');
            setShowIntro(true);
        } else if (!helpPanelSeen) {
            // If intro was completed but help panel hasn't been seen, show help panel automatically
            console.log('Showing transport help panel');
            setShowHelpPanel(true);
            setIsHelpPanelAutomatic(true);
        }
        
        // Fetch GeoJSON data when component mounts
        fetchAndDisplayGeojsonData();
    }, []);

    const handleIntroComplete = () => {
        setShowIntro(false);
        // After intro completion, check if help panel should be shown automatically
        const helpPanelSeen = getCookie('transportHelpPanelSeen');
        if (!helpPanelSeen) {
            setShowHelpPanel(true);
            setIsHelpPanelAutomatic(true);
        }
        
        // Fetch GeoJSON data after intro is completed
        fetchAndDisplayGeojsonData();
    };

    const handleHelpClick = () => {
        if (showHelpPanel) {
            // If help panel is already visible, close it
            setShowHelpPanel(false);
            setIsHelpPanelAutomatic(false);
        } else {
            // Manual help click - don't hide VerticalPanel
            setShowHelpPanel(true);
            setIsHelpPanelAutomatic(false);
        }
    };

    const handleHelpPanelClose = () => {
        setShowHelpPanel(false);
        setIsHelpPanelAutomatic(false);
        // Cookie setting is now handled by ContextualHelpPanel
    };

    // Effect to fetch phone locations when map is ready
    React.useEffect(() => {
        if (!showIntro) {
            // Check if map is ready
            const checkMapReady = () => {
                if (window.map && window.map.isStyleLoaded && typeof window.map.isStyleLoaded === 'function') {
                    console.log('Map is ready, starting GeoJSON data fetch');
                    fetchAndDisplayGeojsonData();
                } else {
                    console.log('Map not ready yet, retrying in 500ms');
                    setTimeout(checkMapReady, 500);
                }
            };
            
            // Start checking for map readiness
            const timer = setTimeout(checkMapReady, 1000);
            
            return () => clearTimeout(timer);
        } else if (showIntro) {
            // Clear layers when intro is shown
            clearAllGeojsonLayers();
        }
    }, [showIntro]);

    // Cleanup effect when component unmounts
    React.useEffect(() => {
        return () => {
            // Only clear layers if map is available
            if (window.map && window.map.isStyleLoaded && typeof window.map.isStyleLoaded === 'function') {
                clearAllGeojsonLayers();
            }
        };
    }, []);

    console.log('TransportPageWelcomeIntro render:', { showIntro, showHelpPanel });
    
    return (
        <div className="transport-page">
            {showIntro ? (
                <TransportIntroduction onComplete={handleIntroComplete} />
            ) : (
                <div>
                    <MapAdminApp 
                        onHelpClick={handleHelpClick} 
                        hideVerticalPanel={showHelpPanel && isHelpPanelAutomatic}
                        hideLoadingModal={true}
                    />
                    <ContextualHelpPanel 
                        isVisible={showHelpPanel} 
                        onClose={handleHelpPanelClose}
                        routeType="transport"
                        cookieName="transportHelpPanelSeen"
                    />
                    
                    {/* GeoJSON Layers Panel */}
                    <div className="floating-actions-container" style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        zIndex: 1000,
                        maxWidth: '380px',
                        maxHeight: 'calc(100vh - 120px)',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div className="floating-actions-header" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            textAlign: 'left'
                        }}>
                            <h3 style={{ margin: '0 0 4px 0' }}>🗺️ Capas de Transporte</h3>
                            {dataDate && (
                                <p style={{ 
                                    margin: '0', 
                                    fontSize: '16px', 
                                    color: 'var(--color-text-secondary)',
                                    fontWeight: 'var(--font-weight-normal)'
                                }}>
                                    Mostrando eventos para {dataDate}
                                </p>
                            )}
                        </div>
                        
                        {dataLoading && (
                            <div className="floating-action-button disabled" style={{ 
                                marginBottom: '12px',
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                padding: '16px'
                            }}>
                                {/* Loading stage indicator */}
                                <div style={{ 
                                    fontSize: '14px', 
                                    color: 'var(--color-text-primary)', 
                                    marginBottom: '8px', 
                                    fontWeight: 'var(--font-weight-medium)',
                                    textAlign: 'center'
                                }}>
                                    {loadingProgress.stage === 'downloading' && `📥 Descargando ZIP (${loadingProgress.progress}%)`}
                                    {loadingProgress.stage === 'extracting' && `📦 Extrayendo contenido (${loadingProgress.progress}%)`}
                                    {loadingProgress.stage === 'processing' && `⚙️ Procesando capas (${loadingProgress.progress}%)`}
                                    {loadingProgress.stage === 'completed' && '✅ Completado'}
                                </div>
                                
                                {/* Progress bar - show for all stages except completed and error */}
                                {(loadingProgress.stage === 'downloading' || loadingProgress.stage === 'extracting' || loadingProgress.stage === 'processing') && (
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        backgroundColor: '#e9ecef',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{
                                            width: `${loadingProgress.progress}%`,
                                            height: '100%',
                                            backgroundColor: (() => {
                                                if (loadingProgress.stage === 'downloading') return '#007bff';
                                                if (loadingProgress.stage === 'extracting') return '#17a2b8';
                                                if (loadingProgress.stage === 'processing') return '#28a745';
                                                return '#007bff';
                                            })(),
                                            borderRadius: '4px',
                                            transition: 'width 0.3s ease, background-color 0.3s ease'
                                        }}></div>
                                    </div>
                                )}
                                
                                {/* Progress detail */}
                                <div style={{ 
                                    fontSize: '12px', 
                                    color: 'var(--color-text-secondary)',
                                    textAlign: 'center'
                                }}>
                                    {loadingProgress.detail}
                                </div>
                            </div>
                        )}
                        
                        {dataError && (
                            <div className="floating-action-button" style={{ 
                                backgroundColor: 'var(--color-status-error-background)',
                                borderColor: 'var(--color-status-error)',
                                color: 'var(--color-status-error)',
                                marginBottom: '12px',
                                cursor: 'default'
                            }}>
                                <span>❌ Error al cargar datos: {dataError}</span>
                            </div>
                        )}
                        
                        {(geojsonLayers.length > 0 || (dataLoading && loadingProgress.stage === 'processing')) && (
                            <div>
                                {/* Layers list - Scrollable */}
                                <div style={{ 
                                    marginBottom: '8px',
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: 'auto',
                                    maxHeight: '300px'
                                }}>
                                    {geojsonLayers
                                        .sort((a, b) => {
                                            // Sort by batch number if available, otherwise by filename
                                            if (a.batchInfo && b.batchInfo && a.batchInfo.batchNumber && b.batchInfo.batchNumber) {
                                                return a.batchInfo.batchNumber - b.batchInfo.batchNumber;
                                            }
                                            return a.filename.localeCompare(b.filename);
                                        })
                                        .map((layer, sortedIndex) => {
                                        const colors = [
                                            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
                                            '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
                                            '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d2', '#c7c7c7',
                                            '#dbdb8d', '#9edae5', '#393b79', '#637939', '#8c6d31', '#843c39'
                                        ];
                                        const originalIndex = layer.index;
                                        const color = colors[originalIndex % colors.length];
                                        const isVisible = visibleLayers.has(originalIndex);
                                        const isDisabled = !isVisible && visibleLayers.size >= 2;
                                        
                                        return (
                                            <div 
                                                key={originalIndex} 
                                                className={`floating-action-button ${isDisabled ? 'disabled' : ''}`}
                                                style={{
                                                    marginBottom: '8px',
                                                    marginLeft: '8px',
                                                    marginRight: '8px',
                                                    animation: 'fadeInLayer 0.5s ease-in-out',
                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                    border: `4px solid ${isVisible ? color : 'rgba(166, 166, 166, 0.1)'}`,
                                                    backgroundColor: isVisible ? 'rgba(128, 128, 128, 0.1)' : 'var(--color-background)',
                                                    opacity: isDisabled ? 0.5 : 1
                                                }}
                                                onClick={() => !isDisabled && toggleLayerVisibility(originalIndex)}
                                            >

                                                <div style={{ 
                                                    flex: 1, 
                                                    minWidth: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <div style={{ 
                                                        fontSize: '14px',
                                                        fontWeight: 'var(--font-weight-medium)',
                                                        color: 'var(--color-text-primary)',
                                                        textOverflow: 'ellipsis',
                                                        overflow: 'hidden',
                                                        whiteSpace: 'nowrap',
                                                        marginRight: '12px'
                                                    }}>
                                                        {layer.batchInfo && layer.batchInfo.hourRange 
                                                            ? layer.batchInfo.hourRange 
                                                            : layer.name}
                                                    </div>
                                                    <div style={{ 
                                                        fontSize: '14px',
                                                        color: 'var(--color-text-secondary)',
                                                        flexShrink: 0
                                                    }}>
                                                        {layer.featureCount.toLocaleString()} elementos
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    

                                </div>
                                
                                <div className="floating-action-button disabled" style={{ 
                                    margin: '8px 8px 0 8px',
                                    cursor: 'default',
                                    justifyContent: 'center'
                                }}>
                                    <span style={{ 
                                        fontSize: '14px', 
                                        color: 'black',
                                        fontStyle: 'italic'
                                    }}>
                                        Haz clic en las capas para activar/desactivar (máximo 2)
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {!dataLoading && !dataError && geojsonLayers.length === 0 && (
                            <div className="floating-action-button disabled" style={{ 
                                cursor: 'default',
                                justifyContent: 'center',
                                marginLeft: '8px',
                                marginRight: '8px'
                            }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>
                                    No se encontraron capas GeoJSON en el archivo
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Make the component available globally
window.TransportPageWelcomeIntro = TransportPageWelcomeIntro;
