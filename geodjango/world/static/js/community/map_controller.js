class MapController {
    constructor(center, zoom) {
        this.vayVenLines = [];
        this.center = center;
        this.zoom = zoom;
        this.map = null;
        this.isOn3DMode = false;
        this.enabledSystems = { 'metro' : true, 'metrobus': true, 'ste': false, 'suburbano': false, 'mexibus': false, 'rtp': false, 'peseros': false, 'corredores': false, 'cablebus': false, 'mexicable': false, 'interurbano': false, 'ecobici': false, 'vayven': false };
        this.layers = [
            'metrobus-stations', 
            'metro-stations', 
            'tren-suburbano-stations', 
            'mexibus-stations', 
            'tren-ligero-stations', 
            'trolebus-stations',
            'cablebus-stations',
            'mexicable-stations',
            'rtp-stops',
            'rtp-stops-troncal',
            'rtp-stops-ordinario',
            'rtp-stops-atenea',
            'rtp-stops-express',
            'rtp-stops-ecobus',
            'corredores-stops',
            'tren-interurbano-stations',
            'peseros-lines',
            'rtp-lines',
            'corredores-lines',
            'ecobici-stations',
            'tren-suburbano-construction-stations',
            'tren-interurbano-construction-stations',
            'metro-construction-stations',
            'trolebus-construction-stations',
            'cablebus-construction-labels',
            'cablebus-construction-stations',
            'cablebus-construction-lines'
        ];
    }

    initialize(theme, map) {
        if(map === undefined) {
            mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';
        
            this.map = new mapboxgl.Map({
                container: 'map',
                style: theme,
                center: this.center,
                zoom: this.zoom,
            });
            
            const geolocateControl = new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true,
                showUserHeading: true
            });

            this.map.addControl(geolocateControl);

            
        } else {
            this.map = map.getMapboxMap();
        }

        this.map.on('style.load', this.mapStyleDidLoad);

        this.map.on('moveend', ({ originalEvent }) => {
            var pitch = this.map.getPitch();
            this.isOn3DMode = pitch > 50;
        });
    }

    mapStyleDidLoad = () => { 
        
        this.loadSources();
        
        this.loadMetroLayers();
        this.loadMetrobusLayers();
        this.loadSTELayers();
        this.loadSuburbanoLayers();
        this.loadMexibusLayers();
        this.loadRTPLayers();
        this.loadPeserosLayers();
        this.loadCorredoresLayers();
        this.loadCablebusLayers();
        this.loadMexicableLayers();
        this.loadInterurbanoLayers();
        this.loadEcobiciLayers();

        this.metroVisible = this.enabledSystems['metro'] == true;
        this.metrobusVisible = this.enabledSystems['metrobus'] == true;
        
        this.cablebusVisible = this.enabledSystems['cablebus'] == true;
        this.corredoresVisible = this.enabledSystems['corredores'] == true;
        this.mexibusVisible = this.enabledSystems['mexibus'] == true;
        this.suburbanoVisible = this.enabledSystems['suburbano'] == true;

        this.steVisible = this.enabledSystems['ste'] == true;
        this.interurbanoVisible = this.enabledSystems['interurbano'] == true;
        this.mexicableVisible = this.enabledSystems['mexicable'] == true;
        this.rtpVisible = this.enabledSystems['rtp'] == true;
        this.peserosVisible = this.enabledSystems['peseros'] == true;
        this.ecobiciVisible = this.enabledSystems['ecobici'] == true;
        this.vayvenVisible = this.enabledSystems['vayven'] == true;

        this.loadMetro();
        this.loadMetrobus();
        this.loadSTE();
        this.loadSuburbano();
        this.loadMexibus();
        this.loadRTP();
        this.loadPeseros();
        this.loadCorredores();
        this.loadCablebus();
        this.loadMexicable();
        this.loadInterurbano();
        this.loadEcobiciStations();
        this.configure3DLayer();
        this.loadOtherTransports();
        
    }

    getMap() {
        return this.map;
    }

    resetPitch() {
        if(this.isOn3DMode) {
            this.map.resetNorthPitch({duration: 2000});
            this.isOn3DMode = false;
        } else {
            this.map.setPitch(80, { duration: 2000 });
            this.isOn3DMode = true;
        }
    }

    changeMapColor = (identifier) => {
        if(identifier == "green") {
            resetMapStyle('mapbox://styles/vidriloco/clx2vciu400c701qo520p9x8r');
        } else if(identifier == "concrete") {
            resetMapStyle('mapbox://styles/vidriloco/clwzges1100kg01nm8hvw4lus');
        } else if(identifier == "blue") {
            resetMapStyle('mapbox://styles/vidriloco/clwy3ijjn010701qpax1s54hk');
        } else if(identifier == "dark") {
            resetMapStyle('mapbox://styles/vidriloco/clwy6gs85010i01qp6127bp3x');
        } else if(identifier == "street") {
            resetMapStyle('mapbox://styles/vidriloco/clx4dzh6902so01qphb9efd0f');
        } else if(identifier == "satelite") {
            resetMapStyle('mapbox://styles/vidriloco/clx2vciu400c701qo520p9x8r');
        } else if(identifier == "ocre") {
            resetMapStyle('mapbox://styles/vidriloco/clx4cxdtd02z701qm7shmbsf7');
        } else if(identifier == "humedales") {
            resetMapStyle('mapbox://styles/vidriloco/clx4edhks089201nx6xsg2yo0');
        } else if(identifier == "atenea") {
            resetMapStyle('mapbox://styles/vidriloco/clx4emew100rx01qoeebl5f8z');
        }
    }

    resetMapStyle(style) {
        this.map.setStyle(style, { diff: false });
    }
    
    centerMapOnCoordinates(coordinate) {
        this.isOn3DMode = true;
    
        var offsetPixels = isMobile() ? -250 : 0;
        
        var offsetDistance = offsetPixels * (360 / (Math.pow(2, 15) * 512));
        
        var newCenter = [
            coordinate.lng,
            coordinate.lat + offsetDistance
        ];    
    
        this.map.flyTo({
            center: newCenter,
            zoom: 15,
            duration: 1500,
        });
    }

    loadSources() {
        this.map.addSource('semi-masivo-sources', {
            type: 'vector',
            url: 'mapbox://vidriloco.cluzectuk7ci41mnyt13jitkh-8z899'
        });
    
        this.map.addSource('masivo-source', {
            type: 'vector',
            url: 'mapbox://vidriloco.clv51hksn1ie820r05n363j9t-2sr66'
        });
        
        this.map.addSource('reformadas-source', {
            type: 'vector',
            url: 'mapbox://vidriloco.clv8jl26r0ynn1np8t3kp7fyl-9xfwv'
        });
    
        this.map.addSource('lineas-construction-source', {
            type: 'vector',
            url: 'mapbox://vidriloco.clvza53gx2fsz1umskqoyd1ub-4494m'
        });
    
        this.map.addSource('alimentadores-source', {
            type: 'vector',
            url: 'mapbox://vidriloco.clv51ilft02et1upbj7qlr3sf-9txfo'
        });
    
        this.map.addSource('concesionado-source', {
            type: 'vector',
            url: 'mapbox://vidriloco.dq5g022t'
        });
    
        this.map.addSource('corredores-source', {
            type: 'vector',
            url: 'mapbox://vidriloco.clv82j7ox03jc1opgvo4e1qhn-5mc00'
        });
    
        this.map.addSource('ecobici-source', {
            type: 'vector',
            url: 'mapbox://vidriloco.clw4kml7pwk221mt17id9z93m-63yr4'
        });
    }

    loadOtherTransports() {
        var thisInstance = this;
        fetch('/api/lines/yucatan')
            .then(response => response.json())
            .then(data => {
                data.lines.forEach(function(line) {
                    thisInstance.addLineToMap(line.id, line.title, line.coordinates, line.color);
                    thisInstance.addStationsToMap(line.stations, line.color);
                });
            })
            .catch(error => console.error('Error fetching lines:', error));

        $('#va-y-ven').on('click', function() {
            thisInstance.toggleVayVen();
        });
    }

    toggleVayVen() {
        this.vayvenVisible = !this.vayvenVisible;
        if (this.vayvenVisible) {
            $('#va-y-ven').addClass('active');
            this.map.setLayoutProperty('vay-ven-layer', 'visibility', 'visible');
            this.map.setLayoutProperty('vay-ven-layer-text', 'visibility', 'visible');
            this.map.setLayoutProperty('vayven-stations-layer', 'visibility', 'visible');
            this.map.setLayoutProperty('vayven-stations-label-layer', 'visibility', 'visible');
        } else {
            $('#va-y-ven').removeClass('active');
            this.map.setLayoutProperty('vay-ven-layer', 'visibility', 'none');
            this.map.setLayoutProperty('vay-ven-layer-text', 'visibility', 'none');
            this.map.setLayoutProperty('vayven-stations-layer', 'visibility', 'none');
            this.map.setLayoutProperty('vayven-stations-label-layer', 'visibility', 'none');
        }
    }

    addStationsToMap(stations, color) {
        var stationFeatureCollection = {
            'type': 'FeatureCollection',
            'features': []
        };

        stations.forEach(station => {
            stationFeatureCollection.features.push({
                'type': 'Feature',
                'properties': {
                    'description': station.name
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [station.coordinates[0], station.coordinates[1]]
                }
            });
        });

        this.map.addSource('vayven-stations', {
            'type': 'geojson',
            'data': stationFeatureCollection
        });

        this.map.addLayer({
            'id': 'vayven-stations-layer',
            'type': 'circle',
            'source': 'vayven-stations',
            'paint': {
            'circle-color': color,
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
            }
        });

        this.map.addLayer({
            'id': 'vayven-stations-label-layer',
            'type': 'symbol',
            'source': 'vayven-stations',
            'layout': {
                'text-field': ['get', 'description'],
                'text-justify': 'auto',
                'text-size': 12,
                'text-font': ['Inter Bold', 'Arial Unicode MS Bold'],
                'text-offset': [0, -1],
                'text-anchor': 'bottom',
                'text-padding': 2,
                'text-pitch-alignment': 'viewport'
            },
            'paint': {
                'text-color': color
            }
        });

        this.map.setLayoutProperty('vayven-stations-layer', 'visibility', 'none');
        this.map.setLayoutProperty('vayven-stations-label-layer', 'visibility', 'none');
    }

    addLineToMap(id, title, coordinates, color) {        
        if(id === undefined || coordinates === undefined || color === undefined) {
            return;
        }
        
        var source = {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'geometry': {
                    'type': 'MultiLineString',
                    'coordinates': coordinates
                }
            }
        };

        this.map.addLayer({
            'id': 'vay-ven-layer',
            'type': 'line',
            "source": source,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': color,
                'line-width': 5
            }
        });

        this.map.addLayer({
            "id": "vay-ven-layer-text",
            "type": "symbol",
            "source": source,
            "layout": {
                "symbol-placement": "line-center",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 13,
                "text-offset": [0, 1],
                "text-field": title,
            },
            "paint": {
                "text-color": color
            }
        });

        this.map.setLayoutProperty('vay-ven-layer', 'visibility', 'none');
        this.map.setLayoutProperty('vay-ven-layer-text', 'visibility', 'none');
    }
    
    loadMexicableLayers() {
        this.map.addLayer({
            "id": "mexicable-lines",
            "type": "line",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["Mexicable Línea 1", "Mexicable Línea 2"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "line-color": [
                    "match",
                    ["get", "layer"],
                    ["Mexicable Línea 1"],
                    "rgb(124, 29, 78)",
                    ["Mexicable Línea 2"],
                    "rgb(114, 170, 64)",
                    "#000000"
                ],
                "line-width": 3
            }
        });
    
        this.map.addLayer({
            "id": "mexicable-stations",
            "type": "circle",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                [
                    "Mexicable Línea 1 estaciones",
                    "Mexicable Línea 2 estaciones"
                ],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "circle-color": [
                    "match",
                    ["get", "layer"],
                    ["Mexicable Línea 1 estaciones"],
                    "rgb(124, 29, 78)",
                    ["Mexicable Línea 2 estaciones"],
                    "rgb(114, 170, 64)",
                    "#000000"
                ],
                "circle-stroke-color": "rgb(255, 255, 255)",
                "circle-stroke-width": 2
            }
        });

        this.enableStationPopup('mexicable-stations', function(e) {
            return e.features[0].properties.Name + " (" + e.features[0].properties.layer.replace(" estaciones", "") + ")";
        });
    
        this.map.addLayer({
            "id": "mexicable-labels",
            "type": "symbol",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["Mexicable Línea 1", "Mexicable Línea 2"],
                true,
                false
            ],
            "layout": {
                "symbol-placement": "line-center",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 11,
                "text-offset": [0, 1.3],
                "text-field": [
                    "match",
                    ["get", "layer"],
                    ["Mexicable Línea 1"],
                    "Mexicable L1:  La Cañada - Santa Clara",
                    ["Mexicable Línea 2"],
                    "Mexicable L2: Indios Verdes - Hank González II",
                    ""
                ]
            },
            "paint": {
                "text-color": [
                    "match",
                    ["get", "layer"],
                    ["Mexicable Línea 1"],
                    "rgb(124, 29, 78)",
                    ["Mexicable Línea 2"],
                    "rgb(114, 170, 64)",
                    "#000000"
                ]
            }
        });
    
    }
    
    loadCablebusLayers() {
        this.map.addLayer({
            "id": "cablebus-construction-lines",
            "type": "line",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "match",
                ["get", "SISTEMA"],
                ["STE Cablebús"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "line-color": "rgb(7, 242, 223)",
                "line-width": 3,
            }
        });
    
        this.map.addLayer({
            "id": "cablebus-construction-stations",
            "type": "circle",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "all",
                ["match", ["get", "SISTEMA"], ["STE Cablebús"], true, false],
                ["match", ["geometry-type"], ["Point"], true, false]
            ],
            "layout": {},
            "paint": {
                "circle-color": "#07f2df",
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 2
            }
        });
    
        this.map.addLayer({
            "id": "cablebus-construction-labels",
            "type": "symbol",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "match",
                ["get", "SISTEMA"],
                ["STE Cablebús"],
                true,
                false
            ],
            "layout": {
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 11,
                "symbol-placement": "line-center",
                "text-offset": [0, -1.3],
                "text-field": "\"Cablebús L3: Vasco de Quiroga - Los Pinos/Constituyentes\""
            },
            "paint": {"text-color": "#05d6c4"}
        });
    
        this.map.addLayer({
            "id": "cablebus-lines",
            "type": "line",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "SISTEMA"],
                ["STE Cablebús"],
                true,
                false
            ],
            "layout": {},
            "paint": {"line-color": "rgb(7, 242, 223)", "line-width": 3}
        });
    
        this.map.addLayer({
            "id": "cablebus-stations",
            "type": "circle",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["CABLEBUSESTACIONES"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "circle-color": "#07f2df",
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 2
            }
        });

        this.enableStationPopup('cablebus-stations', function(e) {
            return e.features[0].properties.NOMBRE + " (Cablebús Línea " + e.features[0].properties.LINEA.replace(/^0+/, '') + ")";
        });
    
        this.map.addLayer({
            "id": "cablebus-labels",
            "type": "symbol",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "SISTEMA"],
                ["STE Cablebús"],
                true,
                false
            ],
            "layout": {
                "text-field": [
                    "match",
                    ["get", "RUTA"],
                    ["Constitución de 1917 - Santa Marta"],
                    ["concat", "Cablebús L1: ", ["to-string", ["get", "RUTA"]]],
                    ["Indios Verdes - Cuautepec"],
                    ["concat", "Cablebús L2: ", ["to-string", ["get", "RUTA"]]],
                    ""
                ],
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 11,
                "symbol-placement": "line-center",
                "text-offset": [0, -1.3]
            },
            "paint": {"text-color": "#05d6c4"}
        });
    }
    
    loadCorredoresLayers() {
        this.map.addLayer({
            "id": "corredores-lines",
            "type": "line",
            "source": "corredores-source",
            "source-layer": "Wikiando_-_Corredores",
            "layout": {},
            "paint": {
                "line-color": "rgb(164, 39, 177)",
                "line-opacity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    12,
                    0.2,
                    22,
                    1
                ]
            }
        });
    
        this.map.addLayer({
            "id": "corredores-stops",
            "type": "circle",
            "source": "corredores-source",
            "source-layer": "Wikiando_-_Corredores",
            "minzoom": 14,
            "filter": ["match", ["geometry-type"], ["Point"], true, false],
            "layout": {},
            "paint": {"circle-color": "rgb(164, 39, 177)", "circle-radius": 3}
        });
    
        this.map.addLayer({
            "id": "corredores-labels",
            "type": "symbol",
            "source": "corredores-source",
            "source-layer": "Wikiando_-_Corredores",
            "minzoom": 13,
            "layout": {
                "text-field": [
                    "concat",
                    ["to-string", ["get", "EMPRESA"]],
                    ": ",
                    ["get", "RUTA"]
                ],
                "symbol-placement": "line-center",
                "text-size": 11,
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-offset": [0, 1.3]
            },
            "paint": {"text-color": "rgb(164, 39, 177)"}
        });
    }
    
    loadPeserosLayers() {
        this.map.addLayer({
            "id": "peseros-lines",
            "type": "line",
            "source": "concesionado-source",
            "source-layer": "CONCESIONADO-8rnxgu",
            "layout": {},
            "paint": {
                "line-opacity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    12,
                    0.2,
                    22,
                    1
                ],
                "line-color": "#04c897"
            }
        });
    
        this.map.addLayer({
            "id": "peseros-labels",
            "type": "symbol",
            "source": "concesionado-source",
            "source-layer": "CONCESIONADO-8rnxgu",
            "minzoom": 14,
            "layout": {
                "text-field": [
                    "concat",
                    "Peseros (Ruta ",
                    ["to-string", ["get", "RUTA"]],
                    "): ",
                    ["get", "RAMAL"]
                ],
                "symbol-placement": "line-center",
                "text-offset": [0, 1.3],
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 10
            },
            "paint": {"text-color": "#04c897"}
        });
    }
    
    loadRTPLayers() {
        this.map.addLayer({
            "id": "rtp-lines",
            "type": "line",
            "source": "alimentadores-source",
            "source-layer": "WikiAndo_-_Alimentadores",
            "paint": {
                "line-color": "rgb(108, 184, 51)",
                "line-opacity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    9,
                    0.2,
                    12,
                    0.5,
                    22,
                    1
                ]
            }
        });
    
        this.map.addLayer({
            "id": "rtp-stops",
            "type": "circle",
            "source": "alimentadores-source",
            "source-layer": "WikiAndo_-_Alimentadores",
            "minzoom": 13,
            "filter": [
                "match",
                ["get", "MODALIDAD"],
                ["Troncal", "Expreso", "ORDINARIO - ATENEA", "Ordinario"],
                true,
                false
            ],
            "layout": {},
            "paint": {"circle-color": "rgb(108, 184, 51)", "circle-radius": 3}
        });

        this.enableStationPopup('rtp-stops', function(e) {
            return e.features[0].properties.INSTERSECC + " (RTP " + e.features[0].properties.RUTA + ": " + e.features[0].properties.ORIG_DEST + ")";
        });
    
        this.map.addLayer({
            "id": "rtp-stops-troncal",
            "type": "circle",
            "source": "alimentadores-source",
            "source-layer": "WikiAndo_-_Alimentadores",
            "minzoom": 13,
            "filter": ["match", ["get", "MODALIDAD"], ["Troncal"], true, false],
            "layout": {},
            "paint": {
                "circle-color": "rgb(108, 184, 51)",
                "circle-stroke-color": "rgb(255, 255, 255)",
                "circle-stroke-width": 2,
                "circle-radius": 3
            }
        });

        this.enableStationPopup('rtp-stops-troncal', function(e) {
            return e.features[0].properties.INSTERSECC + " (RTP " + e.features[0].properties.RUTA + ": " + e.features[0].properties.ORIG_DEST + ")";
        });
    
        this.map.addLayer({
            "id": "rtp-stops-ordinario",
            "type": "circle",
            "source": "alimentadores-source",
            "source-layer": "WikiAndo_-_Alimentadores",
            "minzoom": 13,
            "filter": [
                "match",
                ["get", "MODALIDAD"],
                ["Ordinario", "ORDINARIO"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "circle-color": "rgb(108, 184, 51)",
                "circle-stroke-color": "rgb(255, 255, 255)",
                "circle-stroke-width": 2,
                "circle-radius": 3
            }
        });

        this.enableStationPopup('rtp-stops-ordinario', function(e) {
            return e.features[0].properties.INSTERSECC + " (RTP " + e.features[0].properties.RUTA + ": " + e.features[0].properties.ORIG_DEST + ")";
        });
    
        this.map.addLayer({
            "id": "rtp-stops-express",
            "type": "circle",
            "source": "alimentadores-source",
            "source-layer": "WikiAndo_-_Alimentadores",
            "minzoom": 13,
            "filter": [
                "match",
                ["get", "MODALIDAD"],
                ["Expreso", "EXPRESO"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "circle-color": "rgb(61, 129, 8)",
                "circle-stroke-color": "rgb(255, 255, 255)",
                "circle-stroke-width": 2,
                "circle-radius": 3
            }
        });

        this.enableStationPopup('rtp-stops-express', function(e) {
            return e.features[0].properties.INSTERSECC + " (RTP " + e.features[0].properties.RUTA + ": " + e.features[0].properties.ORIG_DEST + ")";
        });
    
        this.map.addLayer({
            "id": "rtp-stops-atenea",
            "type": "circle",
            "source": "alimentadores-source",
            "source-layer": "WikiAndo_-_Alimentadores",
            "minzoom": 13,
            "filter": [
                "match",
                ["get", "MODALIDAD"],
                ["ORDINARIO - ATENEA", "Ordinario - Atenea"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "circle-color": "rgb(204, 96, 210)",
                "circle-stroke-color": "rgb(184, 84, 227)",
                "circle-radius": 3
            }
        });
    
        this.enableStationPopup('rtp-stops-atenea', function(e) {
            return e.features[0].properties.INSTERSECC + " (RTP " + e.features[0].properties.RUTA + ": " + e.features[0].properties.ORIG_DEST + ")";
        });

        this.map.addLayer({
            "id": "rtp-stops-ecobus",
            "type": "circle",
            "source": "alimentadores-source",
            "source-layer": "WikiAndo_-_Alimentadores",
            "minzoom": 13,
            "filter": [
                "match",
                ["get", "MODALIDAD"],
                ["Ecobus", "ECOBUS/EXPRESO"],
                true,
                false
            ],
            "layout": {},
            "paint": {"circle-color": "rgb(12, 237, 174)", "circle-radius": 3}
        });

        this.enableStationPopup('rtp-stops-ecobus', function(e) {
            return e.features[0].properties.INSTERSECC + " (RTP " + e.features[0].properties.RUTA + ": " + e.features[0].properties.ORIG_DEST + ")";
        });
    
        this.map.addLayer({
            "id": "rtp-labels",
            "type": "symbol",
            "source": "alimentadores-source",
            "source-layer": "WikiAndo_-_Alimentadores",
            "minzoom": 13,
            "layout": {
                "text-field": [
                    "concat",
                    "RTP (",
                    ["get", "RUTA"],
                    "): ",
                    ["to-string", ["get", "NOMBRE"]]
                ],
                "symbol-placement": "line-center",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 10,
                "text-offset": [0, 1.3]
            },
            "paint": {"text-color": "rgb(108, 184, 51)"}
        });
    };
    
    loadMexibusLayers() {
        this.map.addLayer({
            "id": "mexibus-lines",
            "type": "line",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                [
                    "Mexibús Línea 1",
                    "Mexibús Línea 2",
                    "Mexibús Línea 3",
                    "Mexibús Línea 4"
                ],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "line-color": [
                    "match",
                    ["get", "layer"],
                    ["Mexibús Línea 1"],
                    "rgb(149, 195, 72)",
                    ["Mexibús Línea 2"],
                    "rgb(233, 5, 75)",
                    ["Mexibús Línea 3"],
                    "rgb(0, 169, 221)",
                    ["Mexibús Línea 4"],
                    "rgb(237, 143, 69)",
                    "#000000"
                ],
                "line-width": 3
            }
        });
    
        this.map.addLayer({
            "id": "mexibus-stations",
            "type": "circle",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                [
                    "Mexibús Línea 1 estaciones",
                    "Mexibús Línea 2 estaciones",
                    "Mexibús Línea 3 estaciones",
                    "Mexibús Línea 4 estaciones"
                ],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "circle-color": [
                    "match",
                    ["get", "layer"],
                    ["Mexibús Línea 1 estaciones"],
                    "rgb(149, 195, 72)",
                    ["Mexibús Línea 2 estaciones"],
                    "rgb(233, 5, 75)",
                    ["Mexibús Línea 3 estaciones"],
                    "rgb(0, 169, 221)",
                    ["Mexibús Línea 4 estaciones"],
                    "rgb(237, 143, 69)",
                    "rgb(0, 0, 0)"
                ],
                "circle-stroke-color": "rgb(255, 255, 255)",
                "circle-stroke-width": 2
            }
        });

        this.enableStationPopup('mexibus-stations', function(e) {
            return e.features[0].properties.Name + " (" + e.features[0].properties.layer.replace(" estaciones", "") + ")";
        });
    
        this.map.addLayer({
            "id": "mexibus-labels",
            "type": "symbol",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                [
                    "Mexibús Línea 1",
                    "Mexibús Línea 2",
                    "Mexibús Línea 3",
                    "Mexibús Línea 4"
                ],
                true,
                false
            ],
            "layout": {
                "text-field": [
                    "match",
                    ["get", "layer"],
                    ["Mexibús Línea 1"],
                    "Mexibús 1: Ciudad Azteca - Terminal de Pasajeros",
                    ["Mexibús Línea 2"],
                    "Mexibús 2: La Quebrada - Las Américas",
                    ["Mexibús Línea 3"],
                    "Mexibús 3: Chimalhuacán - Pantitlán",
                    ["Mexibús Línea 4"],
                    "Mexibús 4: Indios Verdes - Terminal UMB",
                    ""
                ],
                "symbol-placement": "line-center",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 11,
                "text-offset": [0, 1.3]
            },
            "paint": {
                "text-color": [
                    "match",
                    ["get", "layer"],
                    ["Mexibús Línea 1"],
                    "rgb(149, 195, 72)",
                    ["Mexibús Línea 2"],
                    "rgb(233, 5, 75)",
                    ["Mexibús Línea 3"],
                    "rgb(0, 169, 221)",
                    ["Mexibús Línea 4"],
                    "rgb(237, 143, 69)",
                    "#000000"
                ]
            }
        });
    }
    
    loadMetrobusLayers() {
        this.map.addLayer({
            "id": "metrobus-labels",
            "type": "symbol",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "all",
                ["match", ["get", "SISTEMA"], ["Metrobús"], true, false],
                [
                    "match",
                    ["get", "RUTA"],
                    [
                        "Indios Verdes - El Caminero",
                        "Tepalcates - Tacubaya",
                        "Río de los Remedios - Preparatoria 1",
                        "Buenavista - San Lázaro Ruta Norte",
                        "Buenavista - San Lázaro Ruta Sur",
                        "A aeropuerto",
                        "Tenayuca - Pueblo Santa Cruz Atoyac",
                        "El Rosario - Villa de Aragón",
                        "Indios Verdes - Campo Marte"
                    ],
                    true,
                    false
                ]
            ],
            "layout": {
                "symbol-placement": "line-center",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 11,
                "text-offset": [0, 1.3],
                "icon-rotate": 180,
                "icon-offset": [0, 0],
                "text-field": [
                    "concat",
                    "Metrobús L",
                    ["to-number", ["get", "LINEA"]],
                    ": ",
                    ["get", "RUTA"]
                ]
            },
            "paint": {
                "text-color": [
                    "match",
                    ["get", "RUTA"],
                    ["01", "Indios Verdes - El Caminero"],
                    "rgb(187, 33, 31)",
                    ["Tepalcates - Tacubaya"],
                    "rgb(140, 58, 144)",
                    ["Tenayuca - Pueblo Santa Cruz Atoyac"],
                    "rgb(117, 162, 59)",
                    ["Indios Verdes - Campo Marte"],
                    "rgb(0, 114, 59)",
                    ["Río de los Remedios - Preparatoria 1"],
                    "rgb(0, 54, 121)",
                    ["El Rosario - Villa de Aragón"],
                    "rgb(240, 63, 150)",
                    "rgb(255, 144, 51)"
                ],
                "text-halo-color": "rgb(255, 255, 255)",
                "icon-translate": [10, 0]
            }
        });
        
        this.map.addLayer({
            "id": "metrobus-lines",
            "type": "line",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "all",
                ["match", ["get", "SISTEMA"], ["Metrobús"], true, false],
                [
                    "match",
                    ["get", "RUTA"],
                    [
                        "Indios Verdes - El Caminero",
                        "Tepalcates - Tacubaya",
                        "Río de los Remedios - Preparatoria 1",
                        "Buenavista - San Lázaro Ruta Norte",
                        "Buenavista - San Lázaro Ruta Sur",
                        "A aeropuerto",
                        "Tenayuca - Pueblo Santa Cruz Atoyac",
                        "El Rosario - Villa de Aragón",
                        "Indios Verdes - Campo Marte",
                        "Alameda Oriente - Pantitlán",
                        "Pantitlán - Hidalgo"
                    ],
                    true,
                    false
                ]
            ],
            "paint": {
                "line-width": 3,
                "line-color": [
                    "match",
                    ["get", "RUTA"],
                    ["01", "Indios Verdes - El Caminero"],
                    "rgb(187, 33, 31)",
                    ["Tepalcates - Tacubaya"],
                    "rgb(140, 58, 144)",
                    ["Buenavista - San Lázaro Ruta Norte"],
                    "rgb(255, 144, 51)",
                    ["Buenavista - San Lázaro Ruta Sur"],
                    "rgb(255, 144, 51)",
                    ["A aeropuerto"],
                    "rgb(255, 144, 51)",
                    ["Río de los Remedios - Preparatoria 1"],
                    "rgb(0, 54, 121)",
                    ["Indios Verdes - Campo Marte"],
                    "rgb(0, 114, 59)",
                    ["Tenayuca - Pueblo Santa Cruz Atoyac"],
                    "rgb(117, 162, 59)",
                    ["El Rosario - Villa de Aragón"],
                    "rgb(240, 63, 150)",
                    ["Alameda Oriente - Pantitlán"],
                    "rgb(255, 144, 51)",
                    ["Pantitlán - Hidalgo"],
                    "rgb(255, 144, 51)",
                    "#000000"
                ]
            }
        });
    
        this.map.addLayer({
            "id": "metrobus-stations",
            "type": "circle",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "all",
                ["match", ["get", "SISTEMA"], ["Metrobús"], true, false],
                [
                    "match",
                    ["get", "TIPO"],
                    [
                        "Transbordo",
                        "Terminal",
                        "Servicio temporal",
                        "Intermedia",
                        "Terminal / Transbordo"
                    ],
                    true,
                    false
                ]
            ],
            "layout": {},
            "paint": {
                "circle-color": [
                    "match",
                    ["get", "LINEA"],
                    ["01"],
                    "rgb(187, 33, 31)",
                    ["02"],
                    "rgb(140, 58, 144)",
                    ["03"],
                    "rgb(117, 162, 59)",
                    ["04"],
                    "rgb(255, 144, 51)",
                    ["05"],
                    "rgb(0, 54, 121)",
                    ["06"],
                    "rgb(240, 63, 150)",
                    ["07"],
                    "rgb(0, 114, 59)",
                    "rgb(94, 94, 94)"
                ],
                "circle-stroke-color": "rgb(255, 255, 255)",
                "circle-stroke-width": 2
            }
        });

        this.enableStationPopup('metrobus-stations', function(e) {
            return e.features[0].properties.NOMBRE + " (Metrobus Línea " + e.features[0].properties.LINEA.replace(/^0+/, '') + ")";
        });
    }
    
    loadSuburbanoLayers() {
    
        this.map.addLayer({
            "id": "tren-suburbano-lines",
            "type": "line",
            "source": "masivo-source",
            "source-layer": "WikiAndo_-_Masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["Tren Suburbano: Buenavista - Cuautiltán"],
                true,
                false
            ],
            "layout": {},
            "paint": {"line-color": "rgb(230, 37, 46)", "line-width": 8}
        });
    
        this.map.addLayer({
            "id": "tren-suburbano-labels",
            "type": "symbol",
            "source": "masivo-source",
            "source-layer": "WikiAndo_-_Masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["Tren Suburbano: Buenavista - Cuautiltán"],
                true,
                false
            ],
            "layout": {
                "symbol-placement": "line-center",
                "text-field": "Tren Suburbano: Buenavista - Cuautitlán",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 11,
                "text-offset": [0, 1.3]
            },
            "paint": {"text-color": "rgb(230, 37, 46)"}
        });
    
        this.map.addLayer({
            "id": "tren-suburbano-construction-labels",
            "type": "symbol",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": ["match", ["get", "SISTEMA"], ["SUBURBANO"], true, false],
            "layout": {
                "symbol-placement": "line-center",
                "text-field": "Tren Suburbano: Buenavista - AIFA (en Construcción)",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 11,
                "text-offset": [0, 1.3]
            },
            "paint": {"text-color": "rgb(230, 37, 46)"}
        });
    
        this.map.addLayer({
            "id": "tren-suburbano-construction-lines",
            "type": "line",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": ["match", ["get", "SISTEMA"], ["SUBURBANO"], true, false],
            "paint": {
                "line-color": "#e6252e",
                "line-width": 8,
                "line-dasharray": [1, 0.2]
            }
        });
    
        this.map.addLayer({
            "id": "tren-suburbano-construction-stations",
            "type": "circle",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "all",
                ["match", ["geometry-type"], ["Point"], true, false],
                ["match", ["get", "SISTEMA"], ["SUBURBANO"], true, false]
            ],
            "layout": {},
            "paint": {
                "circle-color": "#e6252e",
                "circle-radius": 9,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff"
            }
        });

        this.enableStationPopup('tren-suburbano-construction-stations', function(e) {
            return e.features[0].properties.Name + " (Tren Suburbano Ramal AIFA)";
        });
    
        this.map.addLayer({
            "id": "tren-suburbano-stations",
            "type": "circle",
            "source": "masivo-source",
            "source-layer": "WikiAndo_-_Masivo",
            "filter": [
                "all",
                [
                    "match",
                    ["get", "layer"],
                    ["Tren Suburbano: Buenavista - Cuautiltán"],
                    true,
                    false
                ],
                ["match", ["get", "TIPO"], ["Estación"], true, false]
            ],
            "layout": {},
            "paint": {
                "circle-color": [
                    "match",
                    ["get", "TIPO"],
                    ["Estación"],
                    "rgb(230, 37, 46)",
                    "#000000"
                ],
                "circle-stroke-color": [
                    "match",
                    ["get", "TIPO"],
                    ["Estación"],
                    "rgb(255, 255, 255)",
                    "rgba(255, 255, 255, 0)"
                ],
                "circle-stroke-width": 2,
                "circle-radius": 9
            }
        });

        this.enableStationPopup('tren-suburbano-stations', function(e) {
            return e.features[0].properties.Name + " (Tren Suburbano)";
        });
    }
    
    loadEcobiciLayers() {
        this.map.addLayer({
            "id": "ecobici-stations",
            "type": "symbol",
            "source": "ecobici-source",
            "source-layer": "Ecobici",
            "layout": {"icon-image": "ecobici-icon"},
            "paint": {}
        });
        
        this.enableStationPopup('ecobici-stations', function(e) {
            return e.features[0].properties.data__stations__name + " (Ecobici)";
        });
    }
    
    loadSTELayers() {
        this.map.addLayer({
            "id": "trolebus-lines",
            "type": "line",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["STE_Trolebus_Lineas"],
                true,
                false
            ],
            "layout": {},
            "paint": {"line-color": "rgb(0, 87, 182)", "line-width": 1.5}
        });
    
        this.map.addLayer({
            "id": "trolebus-labels",
            "type": "symbol",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["STE_Trolebus_Lineas"],
                true,
                false
            ],
            "layout": {
                "symbol-placement": "line-center",
                "text-offset": [0, 1.3],
                "text-size": 11,
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-field": [
                    "match",
                    ["get", "LINEA"],
                    ["10"],
                    [
                        "concat",
                        "Trolebús Elevado L10: ",
                        ["to-string", ["get", "RUTA"]]
                    ],
                    ["01"],
                    ["concat", "Trolebús L1: ", ["to-string", ["get", "RUTA"]]],
                    ["02"],
                    ["concat", "Trolebús L2: ", ["to-string", ["get", "RUTA"]]],
                    ["03"],
                    ["concat", "Trolebús L3: ", ["to-string", ["get", "RUTA"]]],
                    ["04"],
                    ["concat", "Trolebús L4: ", ["to-string", ["get", "RUTA"]]],
                    ["05"],
                    ["concat", "Trolebús L5: ", ["to-string", ["get", "RUTA"]]],
                    ["06"],
                    ["concat", "Trolebús L6: ", ["to-string", ["get", "RUTA"]]],
                    ["07"],
                    ["concat", "Trolebús L7: ", ["to-string", ["get", "RUTA"]]],
                    ["08"],
                    ["concat", "Trolebús L8: ", ["to-string", ["get", "RUTA"]]],
                    ["09"],
                    ["concat", "Trolebús L9: ", ["to-string", ["get", "RUTA"]]],
                    ""
                ]
            },
            "paint": {"text-color": "rgb(0, 87, 182)"}
        });
    
        this.map.addLayer({
            "id": "trolebus-construction-lines",
            "type": "line",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "match",
                ["get", "SISTEMA"],
                ["STE Trolebús ", "STE TRolebús", "STE Trolebús"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "line-color": "#0059b8",
                "line-width": 3
            }
        });
    
        this.map.addLayer({
            "id": "trolebus-construction-labels",
            "type": "symbol",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "match",
                ["get", "SISTEMA"],
                ["STE Trolebús ", "STE TRolebús", "STE Trolebús"],
                true,
                false
            ],
            "layout": {
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 11,
                "symbol-placement": "line",
                "text-offset": [0, 1.3],
                "text-field": [
                    "match",
                    ["get", "LINEA"],
                    ["12"],
                    [
                        "concat",
                        "Trolebús L12: ",
                        ["to-string", ["get", "RUTA"]],
                        ""
                    ],
                    [
                        "concat",
                        "Trolebús Elevado ",
                        ": ",
                        ["to-string", ["get", "RUTA"]],
                        " (en Construcción)"
                    ]
                ]
            },
            "paint": {"text-color": "#0059b8"}
        });
    
        this.map.addLayer({
            "id": "trolebus-construction-stations",
            "type": "circle",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "all",
                ["match", ["geometry-type"], ["Point"], true, false],
                [
                    "match",
                    ["get", "SISTEMA"],
                    ["STE Trolebús", "STE Trolebús ", "STE TRolebús"],
                    true,
                    false
                ]
            ],
            "layout": {},
            "paint": {
                "circle-color": "rgb(0, 87, 182)",
                "circle-stroke-color": "#ffffff",
                "circle-radius": 4,
                "circle-stroke-width": 2
            }
        });
    
        this.map.addLayer({
            "id": "trolebus-stations",
            "type": "circle",
            "source": "reformadas-source",
            "source-layer": "Wikiando_-_Reformadas",
            "filter": [
                "match",
                ["get", "SISTEMA"],
                ["STE Trolebús", "STE Trolebús Elevado"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "circle-color": "rgb(0, 87, 182)",
                "circle-stroke-color": "rgb(255, 255, 255)",
                "circle-stroke-width": 2,
                "circle-radius": 4
            }
        });

        this.enableStationPopup('trolebus-stations', function(e) {
            return e.features[0].properties.NOMBRE + " (STE Trolebus Línea " + e.features[0].properties.LINEA.replace(/^0+/, '') + ")";
        });

        this.enableStationPopup('tren-ligero-stations', function(e) {
            return e.features[0].properties.Name + " (STE Tren Ligero)";
        });

        this.enableStationPopup('trolebus-construction-stations', function(e) {
            return e.features[0].properties.NOMBRE + " (STE Trolebus Línea " + e.features[0].properties.LINEA.replace(/^0+/, '') + ")";
        });
        
        this.map.addLayer({
            "id": "tren-ligero-lines",
            "type": "line",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["STE_TrenLigero_linea_utm14n"],
                true,
                false
            ],
            "layout": {},
            "paint": {"line-color": "rgb(7, 126, 223)", "line-width": 3}
        });
    
        this.map.addLayer({
            "id": "tren-ligero-stations",
            "type": "circle",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["", "STE_TrenLigero_estaciones_utm14n"],
                true,
                false
            ],
            "paint": {
                "circle-color": [
                    "match",
                    ["get", "layer"],
                    ["STE_TrenLigero_estaciones_utm14n"],
                    "rgb(7, 126, 223)",
                    "rgb(0, 0, 0)"
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "rgb(255, 255, 255)"
            }
        });
    
        this.map.addLayer({
            "id": "tren-ligero-labels",
            "type": "symbol",
            "source": "semi-masivo-sources",
            "source-layer": "WikiAndo_-_Semi_masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["", "STE_TrenLigero_linea_utm14n"],
                true,
                false
            ],
            "layout": {
                "symbol-placement": "line-center",
                "text-size": 11,
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-field": "Tren Ligero L1: Tasqueña - Xochimilco",
                "text-offset": [0, 2]
            },
            "paint": {"text-color": "rgb(7, 121, 187)"}
        });
    }
    
    loadInterurbanoLayers() {
        this.map.addLayer({
            "id": "tren-interurbano-construction-lines",
            "type": "line",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "match",
                ["get", "SISTEMA"],
                ["INSURGENTE"],
                true,
                false
            ],
            "paint": {
                "line-color": "#883330",
                "line-width": 8,
                "line-dasharray": [1, 0.2]
            }
        });
    
        this.map.addLayer({
            "id": "tren-interurbano-construction-stations",
            "type": "circle",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "all",
                ["match", ["geometry-type"], ["Point"], true, false],
                ["match", ["get", "SISTEMA"], ["INSURGENTE"], true, false]
            ],
            "layout": {},
            "paint": {
                "circle-color": "#883330",
                "circle-radius": 9,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff"
            }
        });

        this.enableStationPopup('tren-interurbano-construction-stations', function(e) {
            return e.features[0].properties.Name + " (Tren El Insurgente)";
        });
    
        this.map.addLayer({
            "id": "tren-interurbano-lines",
            "type": "line",
            "source": "masivo-source",
            "source-layer": "WikiAndo_-_Masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["Tren Interurbano Primera Etapa"],
                true,
                false
            ],
            "layout": {},
            "paint": {"line-color": "rgb(136, 51, 48)", "line-width": 8}
        });
    
        this.map.addLayer({
            "id": "tren-interurbano-labels",
            "type": "symbol",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "match",
                ["get", "SISTEMA"],
                ["INSURGENTE"],
                true,
                false
            ],
            "layout": {
                "text-field": "Tren Interurbano (El Insurgente)",
                "text-size": 14,
                "symbol-placement": "line-center",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-offset": [0, 1.3]
            },
            "paint": {"text-color": "rgb(136, 51, 48)"}
        });
    
        this.map.addLayer({
            "id": "tren-interurbano-stations",
            "type": "circle",
            "source": "masivo-source",
            "source-layer": "WikiAndo_-_Masivo",
            "filter": [
                "all",
                [
                    "match",
                    ["get", "layer"],
                    ["Tren Interurbano Primera Etapa"],
                    true,
                    false
                ],
                ["match", ["get", "TIPO"], ["Estación"], true, false]
            ],
            "layout": {},
            "paint": {
                "circle-color": "rgb(136, 51, 48)",
                "circle-radius": 9,
                "circle-stroke-color": "rgb(255, 255, 255)",
                "circle-stroke-width": 2
            }
        });
    }
    
    loadMetroLayers() {
    
        this.map.addLayer({
            "id": "metro-lines",
            "type": "line",
            "source": "masivo-source",
            "source-layer": "WikiAndo_-_Masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["STC_Metro_lineas_utm14n"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "line-color": [
                    "match",
                    ["get", "LINEA"],
                    ["1"],
                    "#ec4682",
                    ["2"],
                    "#0262a6",
                    ["3"],
                    "#a4a837",
                    ["4"],
                    "#6fb3b2",
                    ["5"],
                    "#f4d621",
                    ["6"],
                    "#e72428",
                    ["7"],
                    "#f07c2c",
                    ["8"],
                    "#01a163",
                    ["9"],
                    "#561b00",
                    ["A"],
                    "#8f268e",
                    ["B"],
                    "rgba(0, 0, 0, 0)",
                    ["12"],
                    "#b8880b",
                    "#000000"
                ],
                "line-width": 5
            }
        });
    
        this.map.addSource('metro-lines-b-source', {
            type: 'vector',
            url: 'mapbox://vidriloco.clv51hksn1ie820r05n363j9t-2sr66'
        });
    
        this.map.addLayer({
            "id": "metro-lines-b",
            "type": "line",
            "source": "masivo-source",
            "source-layer": "WikiAndo_-_Masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["STC_Metro_lineas_utm14n"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "line-pattern": [
                    "match",
                    ["get", "LINEA"],
                    ["B"],
                    "linea-b",
                    ""
                ],
                "line-translate": [0, 0],
                "line-width": 7
            }
        });
    
        this.map.addLayer({
            "id": "metro-stations",
            "type": "circle",
            "source": "masivo-source",
            "source-layer": "WikiAndo_-_Masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["METROESTACIONES"],
                true,
                false
            ],
            "layout": {},
            "paint": {
                "circle-color": [
                    "match",
                    ["get", "LINEA"],
                    ["01"],
                    "#ec4682",
                    ["02"],
                    "#0262a6",
                    ["03"],
                    "#a4a837",
                    ["04"],
                    "#6fb3b2",
                    ["05"],
                    "#f4d621",
                    ["06"],
                    "#e72428",
                    ["07"],
                    "#f07c2c",
                    ["08"],
                    "#01a163",
                    ["09"],
                    "#561b00",
                    ["A"],
                    "#8f268e",
                    ["12"],
                    "#b8880b",
                    ["B"],
                    "#ffffff",
                    "#000000"
                ],
                "circle-stroke-width": 2,
                "circle-radius": 6,
                "circle-stroke-color": [
                    "match",
                    ["get", "LINEA"],
                    ["B"],
                    "#787878",
                    "#ffffff"
                ]
            }
        });

        this.enableStationPopup('metro-stations', function(e) {
            return e.features[0].properties.NOMBRE + " (STC Línea " + e.features[0].properties.LINEA.replace(/^0+/, '') + ")";
        });
    
        this.map.addLayer({
            "id": "metro-labels",
            "type": "symbol",
            "source": "masivo-source",
            "source-layer": "WikiAndo_-_Masivo",
            "filter": [
                "match",
                ["get", "layer"],
                ["STC_Metro_lineas_utm14n"],
                true,
                false
            ],
            "layout": {
                "symbol-placement": "line-center",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 13,
                "text-field": [
                    "concat",
                    "Metro L",
                    ["to-string", ["get", "LINEA"]],
                    ": ",
                    ["get", "RUTA"]
                ],
                "text-offset": [0, 1.3]
            },
            "paint": {
                "text-color": [
                    "match",
                    ["get", "LINEA"],
                    ["1"],
                    "#ec4682",
                    ["2"],
                    "#0262a6",
                    ["3"],
                    "#a4a837",
                    ["4"],
                    "#6fb3b2",
                    ["5"],
                    "#a78e02",
                    ["6"],
                    "#e72428",
                    ["7"],
                    "#f07c2c",
                    ["8"],
                    "#01a163",
                    ["9"],
                    "#561b00",
                    ["A"],
                    "#8f268e",
                    ["B"],
                    "#8c8c8c",
                    ["12"],
                    "#b8880b",
                    "#000000"
                ],
                "text-translate": [0, 0]
            }
        });
    
        this.map.addLayer({
            "id": "metro-construction-lines",
            "type": "line",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": ["match", ["get", "SISTEMA"], ["STC Metro"], true, false],
            "layout": {},
            "paint": {
                "line-color": [
                    "match",
                    ["get", "LINEA"],
                    ["12"],
                    "#b8880b",
                    "#000000"
                ],
                "line-width": 5,
                "line-dasharray": [1.5, 0.9]
            }
        });
    
        this.map.addLayer({
            "id": "metro-construction-labels",
            "type": "symbol",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": ["match", ["get", "SISTEMA"], ["STC Metro"], true, false],
            "layout": {
                "symbol-placement": "line-center",
                "text-field": "\"Metro L12: Mixcoac - Observatorio (en Construcción)\"",
                "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                "text-size": 11,
                "text-offset": [0, 1.3]
            },
            "paint": {
                "text-color": [
                    "match",
                    ["get", "LINEA"],
                    ["12"],
                    "#b8880b",
                    "#000000"
                ]
            }
        });
            
        this.map.addLayer({
            "id": "metro-construction-stations",
            "type": "circle",
            "source": "lineas-construction-source",
            "source-layer": "Wikiando_-_Lineas_en_Construccin",
            "filter": [
                "all",
                ["match", ["get", "SISTEMA"], ["STC Metro"], true, false],
                ["match", ["geometry-type"], ["Point"], true, false]
            ],
            "layout": {},
            "paint": {
                "circle-color": [
                    "match",
                    ["get", "LINEA"],
                    ["12"],
                    "#b8880b",
                    "#000000"
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff"
            }
        });
    }

    enableStationPopup(layer, messageUnpacker) {
        this.map.on('click', layer, (e) => {
            
            const coordinates = e.features[0].geometry.coordinates.slice();
            
            new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<strong>${messageUnpacker(e)}</strong>`)
            .addTo(this.map);
        });

        this.map.on('mouseenter', layer, () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', layer, () => {
            this.map.getCanvas().style.cursor = '';
        });
    }
    
    loadMetro() {
    
        var loadInternalState = function(mapController) {
            var system = 'metro';
            if(mapController.metroVisible) {
                $('#metro').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 '{system}-construction-lines'.replace(/{system}/g, system), 
                 '{system}-construction-stations'.replace(/{system}/g, system), 
                 '{system}-construction-labels'.replace(/{system}/g, system),
                 'metro-lines-b'].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#metro').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 '{system}-construction-lines'.replace(/{system}/g, system), 
                 '{system}-construction-stations'.replace(/{system}/g, system), 
                 '{system}-construction-labels'.replace(/{system}/g, system),
                 'metro-lines-b'].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.metroVisible = !mapController.metroVisible;
        }
    
        this.registerEvents("#metro", loadInternalState);
    }
    
    loadMetrobus() {
    
        var loadInternalState = function(mapController) {
            var system = 'metrobus';
            if(mapController.metrobusVisible) {
                $('#metrobus').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#metrobus').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.metrobusVisible = !mapController.metrobusVisible;
        }
    
        this.registerEvents("#metrobus", loadInternalState);
    }

    registerEvents(identifier, definedFunction) {
        var mapController = this;
        definedFunction(mapController);
        $(identifier).unbind('click');
        $(identifier).on('click', function() {
            definedFunction(mapController);
        });
    }
    
    loadSTE() {
    
        var loadInternalState = function(mapController) {
            var systemOne = 'trolebus';
            var systemTwo = 'tren-ligero';
            if(mapController.steVisible) {
                $('#ste').addClass('active');
                ['{system}-lines'.replace(/{system}/g, systemOne), 
                 '{system}-stations'.replace(/{system}/g, systemOne), 
                 '{system}-labels'.replace(/{system}/g, systemOne),
                 '{system}-construction-lines'.replace(/{system}/g, systemOne), 
                 '{system}-construction-stations'.replace(/{system}/g, systemOne), 
                 '{system}-construction-labels'.replace(/{system}/g, systemOne)
                ].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
                ['{system}-lines'.replace(/{system}/g, systemTwo), 
                 '{system}-stations'.replace(/{system}/g, systemTwo), 
                 '{system}-labels'.replace(/{system}/g, systemTwo)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#ste').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, systemOne), 
                 '{system}-stations'.replace(/{system}/g, systemOne), 
                 '{system}-labels'.replace(/{system}/g, systemOne),
                 '{system}-construction-lines'.replace(/{system}/g, systemOne), 
                 '{system}-construction-stations'.replace(/{system}/g, systemOne), 
                 '{system}-construction-labels'.replace(/{system}/g, systemOne)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
                ['{system}-lines'.replace(/{system}/g, systemTwo), 
                 '{system}-stations'.replace(/{system}/g, systemTwo), 
                 '{system}-labels'.replace(/{system}/g, systemTwo)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.steVisible = !mapController.steVisible;
        }
    
        this.registerEvents("#ste", loadInternalState);
    }
    
    loadSuburbano() {
    
        var loadInternalState = function(mapController) {
            var system = 'tren-suburbano';
            if(mapController.suburbanoVisible) {
                $('#suburbano').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 '{system}-construction-lines'.replace(/{system}/g, system),
                 '{system}-construction-stations'.replace(/{system}/g, system),
                 '{system}-construction-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#suburbano').removeClass('active');
                mapController.map.setLayoutProperty('suburbano', 'visibility', 'none');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 '{system}-construction-lines'.replace(/{system}/g, system),
                 '{system}-construction-stations'.replace(/{system}/g, system),
                 '{system}-construction-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.suburbanoVisible = !mapController.suburbanoVisible;
        }

        this.registerEvents("#suburbano", loadInternalState);
    }
    
    loadMexibus() {
        var loadInternalState = function(mapController) {
            var system = 'mexibus';
    
            if(mapController.mexibusVisible) {
                $('#mexibus').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#mexibus').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.mexibusVisible = !mapController.mexibusVisible;
        }
    
        this.registerEvents("#mexibus", loadInternalState);
    }
    
    loadCorredores() {
    
        var loadInternalState = function(mapController) {
            var system = 'corredores';
    
            if(mapController.corredoresVisible) {
                $('#corredores').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                '{system}-stops'.replace(/{system}/g, system), 
                '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#corredores').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                '{system}-stops'.replace(/{system}/g, system), 
                '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.corredoresVisible = !mapController.corredoresVisible;
        }
    
        this.registerEvents("#corredores", loadInternalState);
    }
    
    loadCablebus() {
        
        var loadInternalState = function(mapController) {
            var system = 'cablebus';
    
            if(mapController.cablebusVisible) {
                $('#cablebus').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 '{system}-construction-lines'.replace(/{system}/g, system), 
                 '{system}-construction-stations'.replace(/{system}/g, system), 
                 '{system}-construction-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#cablebus').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 '{system}-construction-lines'.replace(/{system}/g, system), 
                 '{system}-construction-stations'.replace(/{system}/g, system), 
                 '{system}-construction-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.cablebusVisible = !mapController.cablebusVisible;
        }
    
        this.registerEvents("#cablebus", loadInternalState);
    }
    
    loadInterurbano(mapController) {
    
        var loadInternalState = function(mapController) {
            var system = 'tren-interurbano';
            if(mapController.interurbanoVisible) {
                $('#tren-interurbano').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 '{system}-construction-stations'.replace(/{system}/g, system),
                 '{system}-construction-lines'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#tren-interurbano').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 '{system}-construction-stations'.replace(/{system}/g, system),
                 '{system}-construction-lines'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.interurbanoVisible = !mapController.interurbanoVisible;
        }
    
        this.registerEvents("#tren-interurbano", loadInternalState);
    }
    
    loadMexicable() {
    
        var loadInternalState = function(mapController) {
            var system = 'mexicable';
    
            if(mapController.mexicableVisible) {
                $('#mexicable').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#mexicable').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stations'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.mexicableVisible = !mapController.mexicableVisible;
        }
        
        this.registerEvents("#mexicable", loadInternalState);
    }
    
    loadRTP() {
        var loadInternalState = function(mapController) {
            var system = 'rtp';
    
            if(mapController.rtpVisible) {
                $('#rtp').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stops'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 'rtp-stops-troncal',
                 'rtp-stops-ordinario',
                 'rtp-stops-atenea',
                 'rtp-stops-express',
                 'rtp-stops-ecobus'
                ].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#rtp').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-stops'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system),
                 'rtp-stops-troncal',
                 'rtp-stops-ordinario',
                 'rtp-stops-atenea',
                 'rtp-stops-express',
                 'rtp-stops-ecobus'
                ].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.rtpVisible = !mapController.rtpVisible;
        }
    
        this.registerEvents("#rtp", loadInternalState);
    }
    
    loadPeseros() {
        var loadInternalState = function(mapController) {
            var system = 'peseros';
    
            if(mapController.peserosVisible) {
                $('#peseros').addClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system)
                ].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#peseros').removeClass('active');
                ['{system}-lines'.replace(/{system}/g, system), 
                 '{system}-labels'.replace(/{system}/g, system)
                ].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.peserosVisible = !mapController.peserosVisible;
        }
    
        this.registerEvents("#peseros", loadInternalState);
    }
    
    loadEcobiciStations() {
    
        var loadInternalState = function(mapController) {
            var system = 'ecobici';
    
            if(mapController.ecobiciVisible) {
                $('#ecobici').addClass('active');
                ['ecobici-stations'].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'visible');
                });
            } else {
                $('#ecobici').removeClass('active');
                ['ecobici-stations'].forEach(element => {
                    mapController.map.setLayoutProperty(element, 'visibility', 'none');
                });
            }
    
            mapController.ecobiciVisible = !mapController.ecobiciVisible;
        }
    
        this.registerEvents("#ecobici", loadInternalState);
    }

    configure3DLayer() {
        const layers = this.map.getStyle().layers;
        const labelLayerId = layers.find(
            (layer) => layer.type === 'symbol' && layer.layout['text-field']
        ).id;
    
        this.map.addLayer(
            {
                'id': 'add-3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                    'fill-extrusion-color': '#aaa',
    
                    // Use an 'interpolate' expression to
                    // add a smooth transition effect to
                    // the buildings as the user zooms in.
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'height']
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'min_height']
                    ],
                    'fill-extrusion-opacity': 0.3
                }
            },
            labelLayerId);
    }
}