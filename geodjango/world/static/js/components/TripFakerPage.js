function TripFakerPage() {
    const [jsonInput, setJsonInput] = React.useState('{' +
        '\n  "type": "FeatureCollection",' +
        '\n  "features": []\n}');
    const [parsed, setParsed] = React.useState({ type: 'FeatureCollection', features: [] });
    const [error, setError] = React.useState(null);
    // Default range: 31-08-2025 to 04-09-2025
    const [startDateTime, setStartDateTime] = React.useState('2025-08-31T00:00');
    const [endDateTime, setEndDateTime] = React.useState('2025-09-04T23:59');
    const markersRef = React.useRef([]);
    const currentFcRef = React.useRef({ type: 'FeatureCollection', features: [] });
    const currentTimestampRef = React.useRef(Math.floor(new Date('2025-08-31T00:00:00Z').getTime() / 1000));
    const historyRef = React.useRef([]); // History stack for undo functionality
    const textareaRef = React.useRef(null);
    const timeOffsetsSec = React.useRef([
        30,            // 30 seconds
        60,            // 1 minute
        120,           // 2 minutes
        300,           // 5 minutes
        600,           // 10 minutes
        1200,          // 20 minutes
        1800,          // 30 minutes
        2700,          // 45 minutes
        7200,          // 2 hours
        14400          // 4 hours
    ]);
    const timeOffsetIndexRef = React.useRef(0);
    const countryOptions = React.useRef({
        'CA': 'canada',
        'US': 'united states of america',
        'NL': 'netherlands',
        'BE': 'belgium',
        'ES': 'spain',
        'FR': 'france',
        'UK': 'united kingdom',
        'CO': 'colombia',
        'BR': 'brazil'
    });
    const [selectedIso, setSelectedIso] = React.useState('UK');
    const [sessionDeviceId, setSessionDeviceId] = React.useState(null);
    const [timingUnit, setTimingUnit] = React.useState('s'); // 's', 'm', or 'h'
    const [timingRange, setTimingRange] = React.useState('1-5'); // '1-5', '5-10', or '10-20'
    const [mapStyle, setMapStyle] = React.useState('light'); // 'light' or 'dark'
    const [activeTab, setActiveTab] = React.useState('editor'); // 'editor' or 'layers'
    const [historyLength, setHistoryLength] = React.useState(0); // Track history length for undo button state

    const handleChange = (e) => {
        const value = e.target.value;
        setJsonInput(value);
        try {
            const obj = JSON.parse(value);
            setParsed(obj);
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    };

    // Keep a ref of the current FeatureCollection in sync
    React.useEffect(() => {
        if (parsed && parsed.type === 'FeatureCollection') {
            currentFcRef.current = parsed;
        }
    }, [parsed]);

    // Auto-scroll textarea to bottom when new content is added
    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
    }, [jsonInput]);

    // Set initial map style when map is ready and when mapStyle changes
    React.useEffect(() => {
        const checkMapAndSetStyle = () => {
            if (window.map && typeof window.map.setStyle === 'function') {
                const styleUrl = mapStyle === 'light' 
                    ? 'mapbox://styles/mapbox/light-v11' 
                    : 'mapbox://styles/mapbox/dark-v11';
                window.map.setStyle(styleUrl);
            } else {
                // Retry after a short delay if map isn't ready
                setTimeout(checkMapAndSetStyle, 200);
            }
        };
        
        // Small delay to ensure map is initialized
        const timeout = setTimeout(checkMapAndSetStyle, 500);
        return () => clearTimeout(timeout);
    }, [mapStyle]);

    // Function to restore state from history (undo)
    const restoreFromHistory = () => {
        if (historyRef.current.length === 0) return;
        const previousState = historyRef.current.pop();
        const { jsonContent, features } = previousState;
        
        // Update history length state
        setHistoryLength(historyRef.current.length);
        
        // Remove the last marker that was added
        if (markersRef.current.length > 0) {
            const lastMarker = markersRef.current[markersRef.current.length - 1];
            try {
                lastMarker.marker && lastMarker.marker.remove();
            } catch (_) {}
            markersRef.current = markersRef.current.slice(0, -1);
        }

        // Restore JSON and features
        setJsonInput(jsonContent);
        setParsed(features);
        setError(null);
        currentFcRef.current = features;
    };

    const handleDownload = () => {
        // Require explicit device id generation
        const useDeviceId = sessionDeviceId;
        if (!useDeviceId) {
            try { window.alert('Please click "Generate" to create a Device ID before downloading.'); } catch (_) {}
            return;
        }
        const filename = `${useDeviceId}.geojson`;
        let data = jsonInput;
        try {
            // Re-pretty in case user minified/invalidated spacing
            const obj = JSON.parse(jsonInput);
            data = JSON.stringify(obj, null, 2);
        } catch (_) {
            // keep as-is if not valid JSON
        }
        const blob = new Blob([data], { type: 'application/geo+json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    };

    const toggleMapStyle = () => {
        const newStyle = mapStyle === 'light' ? 'dark' : 'light';
        setMapStyle(newStyle);
        
        // Update map style directly if map is available
        if (window.map && typeof window.map.setStyle === 'function') {
            const styleUrl = newStyle === 'light' 
                ? 'mapbox://styles/mapbox/light-v11' 
                : 'mapbox://styles/mapbox/dark-v11';
            window.map.setStyle(styleUrl);
        }
    };

    const clearAll = () => {
        // Clear JSON editor
        const emptyFc = {
            type: 'FeatureCollection',
            features: []
        };
        const emptyJson = JSON.stringify(emptyFc, null, 2);
        setJsonInput(emptyJson);
        setParsed(emptyFc);
        setError(null);
        currentFcRef.current = emptyFc;

        // Clear history
        historyRef.current = [];
        setHistoryLength(0);

        // Remove all markers from map
        markersRef.current.forEach(m => {
            try {
                m.marker && m.marker.remove();
            } catch (_) {}
        });
        markersRef.current = [];

        // Reset timestamp
        if (startDateTime) {
            try {
                const baseMs = new Date(startDateTime).getTime();
                if (!isNaN(baseMs)) {
                    currentTimestampRef.current = Math.floor(baseMs / 1000);
                    timeOffsetIndexRef.current = 0;
                }
            } catch (_) {}
        }
    };

    // Utility: generate UUID v4-like
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Build a GeoJSON feature from lng/lat
    const buildFeature = (lng, lat, deviceIdOverride) => {
        // Determine timestamp based on timing unit and range selection with random increments
        let offsetSeconds = 0;
        // Parse the range (e.g., '1-5' -> [1, 5])
        const [min, max] = timingRange.split('-').map(Number);
        
        // Generate random value within the selected range
        const randomValue = min + Math.random() * (max - min);
        
        // Convert to seconds based on the unit
        if (timingUnit === 's') {
            offsetSeconds = Math.floor(randomValue);
        } else if (timingUnit === 'm') {
            offsetSeconds = Math.floor(randomValue * 60);
        } else if (timingUnit === 'h') {
            offsetSeconds = Math.floor(randomValue * 3600);
        }
        const ts = (currentTimestampRef.current || Math.floor(Date.now() / 1000)) + offsetSeconds;
        currentTimestampRef.current = ts;
        const nowIso = new Date(ts * 1000).toISOString();
        // Random horizontal accuracy between 12 and 65 (inclusive-ish)
        const horizontalAccuracy = 12 + Math.random() * (65 - 12);
        const iso = selectedIso;
        const countryName = countryOptions.current[iso] || 'united kingdom';
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lng, lat]
            },
            properties: {
                device_id: deviceIdOverride || sessionDeviceId || generateUUID(),
                id_type: 'idfa',
                timestamp: ts,
                horizontal_accuracy: horizontalAccuracy,
                ip_address: null,
                device_os: '',
                os_version: null,
                country: countryName,
                iso_country_code: iso,
                phone_location_country: iso,
                geohash: null,
                source_id: null,
                publisher_id: null,
                app_id: null,
                is_within_cdmx: false,
                location_context: null,
                consent: null,
                quad_id: null,
                created_at: nowIso
            }
        };
    };

    // When the startDateTime changes, reset the base timestamp
    React.useEffect(() => {
        if (!startDateTime) return;
        try {
            // Interpret start datetime as local; compute epoch seconds
            const baseMs = new Date(startDateTime).getTime();
            if (!isNaN(baseMs)) {
                currentTimestampRef.current = Math.floor(baseMs / 1000);
            }
        } catch (_) {}
    }, [startDateTime]);

    // Map click handler: add draggable circle marker, update/remove features
    React.useEffect(() => {
        let cleanup = null;
        const attach = () => {
            if (!window.map || typeof mapboxgl === 'undefined') return false;
            const map = window.map;
            const onClick = (e) => {
                const { lng, lat } = e.lngLat;

                // Require an explicit Device ID generation by the user
                const useDeviceId = sessionDeviceId;
                if (!useDeviceId) {
                    try { window.alert('Please click "Generate" to create a Device ID before adding points.'); } catch (_) {}
                    return; // do not add a point without a device id
                }

                // Build new feature with stable device id
                const feature = buildFeature(lng, lat, useDeviceId);
                const uid = feature.properties.device_id;

                // Create a custom circle element for better visibility
                const el = document.createElement('div');
                el.style.width = '14px';
                el.style.height = '14px';
                el.style.borderRadius = '50%';
                el.style.background = '#1b5e20';
                el.style.border = '2px solid #ffffff';
                el.style.boxShadow = '0 0 0 2px rgba(27,94,32,0.3)';
                el.style.cursor = 'pointer';

                const marker = new mapboxgl.Marker({ element: el, draggable: true })
                    .setLngLat([lng, lat])
                    .addTo(map);

                // Drag end updates coordinates in editor
                marker.on('dragend', () => {
                    const pos = marker.getLngLat();
                    const fc = currentFcRef.current || { type: 'FeatureCollection', features: [] };
                    const newFeatures = (fc.features || []).map(f => {
                        if (f && f.properties && f.properties.device_id === uid) {
                            return {
                                ...f,
                                geometry: { ...f.geometry, coordinates: [pos.lng, pos.lat] }
                            };
                        }
                        return f;
                    });
                    const updated = { type: 'FeatureCollection', features: newFeatures };
                    const pretty = JSON.stringify(updated, null, 2);
                    setJsonInput(pretty);
                    setParsed(updated);
                    setError(null);
                });

                // Save current state to history before adding new feature
                const currentFc = currentFcRef.current || { type: 'FeatureCollection', features: [] };
                const currentJson = JSON.stringify(currentFc, null, 2);
                historyRef.current.push({
                    jsonContent: currentJson,
                    features: JSON.parse(JSON.stringify(currentFc)) // Deep copy
                });
                // Update history length state for undo button
                setHistoryLength(historyRef.current.length);

                // Track marker with uid for later cleanup
                markersRef.current.push({ marker, uid });

                // Append feature to FeatureCollection
                const fc = currentFcRef.current || { type: 'FeatureCollection', features: [] };
                const updated = { type: 'FeatureCollection', features: [...(fc.features || []), feature] };
                const pretty = JSON.stringify(updated, null, 2);
                setJsonInput(pretty);
                setParsed(updated);
                setError(null);
            };
            map.on('click', onClick);
            cleanup = () => {
                map.off('click', onClick);
                // Only remove event listeners, NOT the markers themselves when timing unit changes
            };
            return true;
        };

        if (!attach()) {
            const interval = setInterval(() => {
                if (attach()) {
                    clearInterval(interval);
                }
            }, 200);
            return () => {
                clearInterval(interval);
                if (cleanup) cleanup();
            };
        }
        return () => { if (cleanup) cleanup(); };
    }, [selectedIso, sessionDeviceId, timingUnit, timingRange]);

    return (
        <div className="trip-faker-page">
            <NavigationBar />
            <div style={{ height: 'calc(100vh - 60px)' }}>
                <div className="map-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <MapAdminApp hideVerticalPanel={true} mapStyle="mapbox://styles/vidriloco/clwy6gs85010i01qp6127bp3x" />

                    {/* Map style toggle button */}
                    <button
                        onClick={toggleMapStyle}
                        style={{
                            position: 'absolute',
                            top: 70,
                            left: 12,
                            zIndex: 1001,
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                            color: '#333',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                        title={`Switch to ${mapStyle === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {mapStyle === 'light' ? '🌙' : '☀️'}
                        <span>{mapStyle === 'light' ? 'Dark' : 'Light'}</span>
                    </button>

                    {/* Floating right panel: JSON editor, then date picker, then preview */}
                    <div style={{ position: 'absolute', top: 100, right: 12, zIndex: 1002, width: 420, height: 'calc(100% - 90px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Tabs */}
                        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                                <button
                                    onClick={() => setActiveTab('editor')}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        background: activeTab === 'editor' ? '#1b5e20' : 'transparent',
                                        color: activeTab === 'editor' ? '#fff' : '#666',
                                        border: 'none',
                                        borderBottom: activeTab === 'editor' ? '2px solid #1b5e20' : '2px solid transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Text editor
                                </button>
                                <button
                                    onClick={() => setActiveTab('layers')}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        background: activeTab === 'layers' ? '#1b5e20' : 'transparent',
                                        color: activeTab === 'layers' ? '#fff' : '#666',
                                        border: 'none',
                                        borderBottom: activeTab === 'layers' ? '2px solid #1b5e20' : '2px solid transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Contextual Layers
                                </button>
                            </div>
                        </div>

                        {/* Tab Content: Text Editor */}
                        {activeTab === 'editor' && (
                            <React.Fragment>
                                {/* Device ID controls */}
                        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontSize: 12, color: '#555', minWidth: 70 }}>Device ID</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={sessionDeviceId || ''}
                                    placeholder="Click Generate"
                                    style={{ flex: 1, padding: '6px 8px', fontSize: 12, fontFamily: 'monospace' }}
                                />
                                <button
                                    onClick={() => setSessionDeviceId(generateUUID())}
                                    style={{ 
                                        padding: '6px', 
                                        fontSize: 12,
                                        border: '1px solid #ddd',
                                        borderRadius: 4,
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '28px',
                                        height: '28px'
                                    }}
                                    title="Generate Device ID"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 4v6h6"></path>
                                        <path d="M23 20v-6h-6"></path>
                                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                                    </svg>
                                </button>
                                <button
                                    onClick={handleDownload}
                                    style={{ 
                                        padding: '6px', 
                                        fontSize: 12,
                                        border: '1px solid #ddd',
                                        borderRadius: 4,
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '28px',
                                        height: '28px'
                                    }}
                                    title="Download JSON"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <strong>Trip JSON</strong>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button
                                        onClick={restoreFromHistory}
                                        disabled={historyLength === 0}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: 11,
                                            background: 'transparent',
                                            border: '1px solid #ddd',
                                            borderRadius: 4,
                                            cursor: historyLength === 0 ? 'not-allowed' : 'pointer',
                                            color: historyLength === 0 ? '#ccc' : '#666',
                                            opacity: historyLength === 0 ? 0.5 : 1
                                        }}
                                        title="Undo last change"
                                    >
                                        Undo
                                    </button>
                                    <button
                                        onClick={clearAll}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: 11,
                                            background: 'transparent',
                                            border: '1px solid #ddd',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            color: '#666'
                                        }}
                                        title="Clear all data and markers"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                                <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #eee' }}>Editor</div>
                                <textarea
                                    ref={textareaRef}
                                    value={jsonInput}
                                    onChange={handleChange}
                                    style={{ flex: 1, width: '100%', border: 'none', resize: 'none', padding: 12, fontFamily: 'monospace', fontSize: 12, lineHeight: '18px', minHeight: 0, overflowY: 'scroll' }}
                                />
                                {error && (
                                    <div style={{ color: '#b00020', padding: '6px 12px', borderTop: '1px solid #f1c9c9', background: '#ffecec' }}>
                                        Invalid JSON: {error}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontSize: 12, color: '#555', minWidth: 70 }}>Country</label>
                                <select value={selectedIso} onChange={(e) => setSelectedIso(e.target.value)} style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}>
                                    {Object.entries(countryOptions.current).map(([code, name]) => (
                                        <option key={code} value={code}>{code} — {name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Timing</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <label style={{ fontSize: 12, color: '#555', minWidth: 70 }}>Unit</label>
                                    <select 
                                        value={timingUnit} 
                                        onChange={(e) => setTimingUnit(e.target.value)} 
                                        style={{ flex: 1, padding: '6px 8px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4 }}
                                    >
                                        <option value="s">Seconds</option>
                                        <option value="m">Minutes</option>
                                        <option value="h">Hours</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <label style={{ fontSize: 12, color: '#555', minWidth: 70 }}>Range</label>
                                    <select 
                                        value={timingRange} 
                                        onChange={(e) => setTimingRange(e.target.value)} 
                                        style={{ flex: 1, padding: '6px 8px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4 }}
                                    >
                                        <option value="1-5">1-5</option>
                                        <option value="5-10">5-10</option>
                                        <option value="10-20">10-20</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                                <DateTimeRangePicker
                                    isOverlay={false}
                                    containerStyle={{ width: '100%' }}
                                    startDateTime={startDateTime}
                                    endDateTime={endDateTime}
                                    onChange={({ startDateTime: s, endDateTime: e }) => {
                                        setStartDateTime(s);
                                        setEndDateTime(e);
                                    }}
                                />
                            </React.Fragment>
                        )}

                        {/* Tab Content: Contextual Layers */}
                        {activeTab === 'layers' && (
                            <React.Fragment>
                                {/* Interest Polygons Layer */}
                                <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: 12 }}>
                                    <InterestPolygonsComponent shouldShowTooltip={false} />
                                    <PublicTransportList system="metro" title="STC Metro" />
                                    <PublicTransportList system="metrobus" title="Metrobús" />
                                    <PublicTransportList system="tren-ligero" title="Tren Ligero" />
                                    <PublicTransportList system="trolebus" title="Trolebús" />
                                </div>                                
                            </React.Fragment>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

window.TripFakerPage = TripFakerPage;


