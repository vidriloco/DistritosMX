import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import LinesList from './LinesList';

const MapAdmin = () => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [collections, setCollections] = useState([]);
    const [uploadGroups, setUploadGroups] = useState(new Map());
    const [mapInitialized, setMapInitialized] = useState(false);

    useEffect(() => {
        // Ensure the container exists and has dimensions
        if (!mapContainer.current || !mapContainer.current.offsetWidth || !mapContainer.current.offsetHeight) {
            return;
        }

        mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';
        
        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-99.1332, 19.4326],
                zoom: 11
            });

            map.current.on('load', () => {
                setMapInitialized(true);
            });

            return () => {
                if (map.current) {
                    map.current.remove();
                }
            };
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }, []);

    const handleZipUpload = async (file) => {
        try {
            const zip = await JSZip.loadAsync(file);
            const firstFile = Object.keys(zip.files)[0];
            const directoryName = firstFile.split('/')[0];
            const fileName = file.name.replace(/\.[^/.]+$/, "");

            const newUploadGroup = {
                stations: null,
                lines: null,
                timestamp: new Date().getTime()
            };

            setUploadGroups(prev => new Map(prev).set(fileName, newUploadGroup));

            // Process stations
            let stationsFile = zip.file(`${directoryName}/stations.geojson`) || 
                             zip.file(`${directoryName}/Stations.geojson`) || 
                             zip.file(`${directoryName}/STATIONS.geojson`);

            if (stationsFile) {
                const stationsContent = await stationsFile.async('text');
                const stationsGeojson = JSON.parse(stationsContent);
                processStations(stationsGeojson, fileName);
            }

            // Process lines
            let linesFile = zip.file(`${directoryName}/lines.geojson`) || 
                          zip.file(`${directoryName}/Lines.geojson`) || 
                          zip.file(`${directoryName}/LINES.geojson`) ||
                          zip.file('lines.geojson') || 
                          zip.file('Lines.geojson') || 
                          zip.file('LINES.geojson');

            if (linesFile) {
                const linesContent = await linesFile.async('text');
                const linesGeojson = JSON.parse(linesContent);
                processLines(linesGeojson, fileName);
            }

            // Process icons
            const iconsFolder = zip.folder(`${directoryName}/icons`) || 
                              zip.folder(`${directoryName}/Icons`) || 
                              zip.folder(`${directoryName}/ICONS`) ||
                              zip.folder('icons') || 
                              zip.folder('Icons') || 
                              zip.folder('ICONS');

            if (iconsFolder) {
                const iconFiles = iconsFolder.filter((relativePath, file) => {
                    return !file.dir && /\.(png|jpg|jpeg|svg)$/i.test(file.name);
                });

                for (const iconFile of iconFiles) {
                    try {
                        const blob = await iconFile.async('blob');
                        const url = URL.createObjectURL(blob);
                        // Store icons in state or context if needed
                    } catch (iconError) {
                        console.error(`Error loading icon ${iconFile.name}:`, iconError);
                    }
                }
            }

        } catch (error) {
            console.error('Error processing ZIP file:', error);
            alert(`Error processing ZIP file: ${error.message}`);
        }
    };

    const processStations = (geojson, fileName) => {
        const collectionName = `stations-${fileName}`;
        const stations = geojson.features.map(station => ({
            type: 'Feature',
            properties: {
                ...station.properties,
                line_number: station.properties.station_id ? station.properties.station_id.substring(3, 5) : '1'
            },
            geometry: station.geometry
        }));

        if (map.current) {
            map.current.addSource(collectionName, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: stations
                }
            });

            map.current.addLayer({
                id: collectionName,
                type: 'circle',
                source: collectionName,
                paint: {
                    'circle-radius': 6,
                    'circle-color': [
                        'match',
                        ['get', 'station_type'],
                        'end-of-line', '#ff0000',
                        'end-of-line, connection', '#ff0000',
                        'Transbordo', '#00ff00',
                        'inter-station', '#0000ff',
                        '#808080'
                    ],
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff'
                }
            });

            // Add popup on click
            map.current.on('click', collectionName, (e) => {
                const properties = e.features[0].properties;
                const coordinates = e.features[0].geometry.coordinates.slice();
                const description = `
                    <strong>${properties.name}</strong><br>
                    System: ${properties.system}<br>
                    Line: ${properties.line_number}<br>
                    Type: ${properties.station_type}<br>
                    Station ID: ${properties.station_id}<br>
                    Borough: ${properties.borough}
                `;

                new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(description)
                    .addTo(map.current);
            });
        }
    };

    const processLines = (geojson, fileName) => {
        const collectionName = `lines-${fileName}`;
        const lines = geojson.features;

        if (map.current) {
            map.current.addSource(collectionName, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: lines
                }
            });

            map.current.addLayer({
                id: collectionName,
                type: 'line',
                source: collectionName,
                paint: {
                    'line-color': [
                        'case',
                        ['has', 'color'],
                        ['get', 'color'],
                        '#000000'
                    ],
                    'line-width': [
                        'case',
                        ['has', 'stroke-width'],
                        ['get', 'stroke-width'],
                        1
                    ]
                }
            });
        }
    };

    const toggleLayerVisibility = (fileName) => {
        const group = uploadGroups.get(fileName);
        if (!group) return;

        let isVisible = true;
        if (group.stations && map.current.getLayer(group.stations)) {
            isVisible = map.current.getLayoutProperty(group.stations, 'visibility') === 'visible';
        }

        const newVisibility = isVisible ? 'none' : 'visible';

        if (group.stations && map.current.getLayer(group.stations)) {
            map.current.setLayoutProperty(group.stations, 'visibility', newVisibility);
        }
        if (group.lines && map.current.getLayer(group.lines)) {
            map.current.setLayoutProperty(group.lines, 'visibility', newVisibility);
        }
    };

    const removeLayer = (fileName) => {
        const group = uploadGroups.get(fileName);
        if (!group) return;

        if (group.stations) {
            if (map.current.getLayer(group.stations)) {
                map.current.removeLayer(group.stations);
            }
            if (map.current.getSource(group.stations)) {
                map.current.removeSource(group.stations);
            }
        }

        if (group.lines) {
            if (map.current.getLayer(group.lines)) {
                map.current.removeLayer(group.lines);
            }
            if (map.current.getSource(group.lines)) {
                map.current.removeSource(group.lines);
            }
        }

        setUploadGroups(prev => {
            const newGroups = new Map(prev);
            newGroups.delete(fileName);
            return newGroups;
        });
    };

    return (
        <div className="map-admin-container">
            <div ref={mapContainer} className="map-container" />
            <LinesList />
            <div className="control-panel">
                <div className="card">
                    <div className="header">
                        <h1>Upload Map Data</h1>
                        <div className="upload-container">
                            <button className="upload-button">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Upload ZIP
                            </button>
                            <input 
                                type="file" 
                                accept=".zip" 
                                className="file-input"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        handleZipUpload(file);
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="collections-list">
                        {Array.from(uploadGroups.entries()).map(([fileName, group]) => (
                            <div key={fileName} className="collection-item">
                                <div className="collection-info">
                                    <div className="collection-name">{fileName}</div>
                                    <div className="collection-count">
                                        {group.stations ? 'Stations' : 'No stations'}, {group.lines ? 'Lines' : 'No lines'}
                                    </div>
                                </div>
                                <div className="collection-controls">
                                    <button 
                                        className="control-button view" 
                                        title="Show/Hide"
                                        onClick={() => toggleLayerVisibility(fileName)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>
                                    <button 
                                        className="control-button delete" 
                                        title="Remove"
                                        onClick={() => removeLayer(fileName)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapAdmin; 