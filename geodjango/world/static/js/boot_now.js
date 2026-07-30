var layers = [
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

mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/vidriloco/clx4dzh6902so01qphb9efd0f',
    center: center,
    zoom: zoom
});

const geolocateControl = new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true,
    showUserHeading: true
});
map.addControl(geolocateControl);

map.on('style.load', () => {    
    loadSources();

    loadMetroLayers();
    loadMetrobusLayers();
    loadSTELayers();
    loadSuburbanoLayers();
    loadMexibusLayers();
    loadRTPLayers();
    loadPeserosLayers();
    loadCorredoresLayers();
    loadCablebusLayers();
    loadMexicableLayers();
    loadInterurbanoLayers();
    loadEcobiciLayers();

    metroVisible = !metroVisible;
    metrobusVisible = !metrobusVisible;
    
    cablebusVisible = !cablebusVisible;
    corredoresVisible = !corredoresVisible;
    mexibusVisible = !mexibusVisible;
    suburbanoVisible = !suburbanoVisible;

    steVisible = !steVisible;
    interurbanoVisible = !interurbanoVisible;
    mexicableVisible = !mexicableVisible;
    rtpVisible = !rtpVisible;
    peserosVisible = !peserosVisible;
    ecobiciVisible = !ecobiciVisible;
    vayvenVisible = !vayvenVisible;

    loadAgebLayer();
    loadMetro();
    loadMetrobus();
    loadSTE();
    loadSuburbano();
    loadMexibus();
    loadRTP();
    loadPeseros();
    loadCorredores();
    loadCablebus();
    loadMexicable();
    loadInterurbano();
    loadEcobiciStations();
    loadOtherTransports();
    
    configureMapInteractivity();

    configure3DLayer();
});

var agebLayerVisible = false;

$("#toggle-agebs").on('click', function() {
    if(!agebLayerVisible) {
        enableAgebLayer();
    } else {
        disableAgebLayer();
    }

    agebLayerVisible = !agebLayerVisible;
});

$(window).on('load', function() {

    $('#dont-show-again').on('click', function() {
        stopShowingWelcomeModal();
    });

    $('#section-card').on('click', function() {
        $('#section-card').addClass('hidden');
    });

    $('#should-display-menu').on('click', function() {
        if($('#layer-menu-options').hasClass('hidden')) {
            expandLayersMenu();
        } else {
            collapseLayersMenu();
        }
    });

    $('#should-hide-selected-point-details').on('click', function() {
        collapseLayersMenu();
        clearSelectionData();
    });

    $('#toggle-connections').on('click', function() {
        if($('#connections').hasClass('hidden')) {
            $('#toggle-connections > .toggle-button').text('Ocultar conexiones');
            $('#connections').removeClass('hidden');
        } else {
            $('#toggle-connections > .toggle-button').text('Mostrar conexiones');
            $('#connections').addClass('hidden');
        }
    });

    $('#map-colors-toggle').on('click', function() {
        if($('#map-colors-card').hasClass('hidden')) {
            $('#map-colors-card').removeClass('hidden');
            $('#registration-form-card').addClass('hidden');
        } else {
            $('#map-colors-card').addClass('hidden');
        }
    });

    $('#registration-form-toggle').on('click', function() {
        if($('#registration-form-card').hasClass('hidden')) {
            $('#registration-form-card').removeClass('hidden');
            $('#map-colors-card').addClass('hidden');
        } else {
            $('#registration-form-card').addClass('hidden');
        }
    });

    $('#3d-buttons-toggle').on('click', resetPitch);

    function resetPitch() {
        if(isOn3DMode) {
            map.resetNorthPitch({duration: 2000});
            isOn3DMode = false;
        } else {
            map.setPitch(80, { duration: 2000 });
            isOn3DMode = true;
        }
    }

    $('.map-color-option').on('click', function() {
        var identifier = $(this).attr('id');

        $('.map-color-option').removeClass('active');
        $('#'+identifier).addClass('active');

        if(identifier == "green") {
            initializeMap('mapbox://styles/vidriloco/clx2vciu400c701qo520p9x8r');
        } else if(identifier == "concrete") {
            initializeMap('mapbox://styles/vidriloco/clwzges1100kg01nm8hvw4lus');
        } else if(identifier == "blue") {
            initializeMap('mapbox://styles/vidriloco/clwy3ijjn010701qpax1s54hk');
        } else if(identifier == "dark") {
            initializeMap('mapbox://styles/vidriloco/clwy6gs85010i01qp6127bp3x');
        } else if(identifier == "street") {
            initializeMap('mapbox://styles/vidriloco/clx4dzh6902so01qphb9efd0f');
        } else if(identifier == "satelite") {
            initializeMap('mapbox://styles/vidriloco/clx2vciu400c701qo520p9x8r');
        } else if(identifier == "ocre") {
            initializeMap('mapbox://styles/vidriloco/clx4cxdtd02z701qm7shmbsf7');
        } else if(identifier == "humedales") {
            initializeMap('mapbox://styles/vidriloco/clx4edhks089201nx6xsg2yo0');
        } else if(identifier == "atenea") {
            initializeMap('mapbox://styles/vidriloco/clx4emew100rx01qoeebl5f8z');
        }
    });

    map.on('moveend', ({ originalEvent }) => {
        var pitch = map.getPitch();
        isOn3DMode = pitch > 50;
    });

    loadOtherTransports();
});

function initializeMap(style) {
    map.setStyle(style, { diff: false });
}

var isOn3DMode = false;

function centerMapOnCoordinates(coordinate) {
    isOn3DMode = true;

    var offsetPixels = isMobile() ? -250 : 0;
    
    var offsetDistance = offsetPixels * (360 / (Math.pow(2, 15) * 512));
    
    var newCenter = [
        coordinate.lng,
        coordinate.lat + offsetDistance
    ];    

    map.flyTo({
        center: newCenter,
        zoom: 15,
        duration: 1500,
    });
}

function attachPopup(coordinates, string, shouldShowConnections) {
    isStationAssigned = false;
    $('#selected-point-details').html(string);
    showDetailsCard(shouldShowConnections);
}

function showSelectedLocationInfo(feature, e) {
    $('#selected-point-details').html(popupConnectionsHTML());
    showDetailsCard(false);
    $('#toggle-connections').addClass('hidden');
}

function showDetailsCard(shouldShowConnections) {    
    collapseLayersMenu();
    $('#selected-point-details').removeClass('hidden');
    $('#should-display-menu').addClass('hidden');

    $('#popup-bottom-section').addClass('hidden');
    $('#should-hide-selected-point-details').removeClass('hidden');
    $('.map-colors-button').addClass('hidden');
    $('#map-colors-card').addClass('hidden');
    $('#registration-form-card').addClass('hidden');
    
    if(!shouldShowConnections) {
        $('#toggle-connections').removeClass('hidden');
        $('#toggle-connections > .toggle-button').text('Mostrar conexiones');
    }
}

function expandLayersMenu() {
    $('#layer-menu-options').removeClass('hidden');
            
    // Show close button icon
    $('#close-panel-button').removeClass('hidden');
    // Hide map layer button icon
    $('#map-layer-button').addClass('hidden');
    // Hide colours button
    $('.map-colors-button').addClass('hidden');
    $('#map-colors-card').addClass('hidden');
    $('#registration-form-card').addClass('hidden');
}

function collapseLayersMenu() {
    $('#layer-menu-options').addClass('hidden');

    $('#close-panel-button').addClass('hidden');
    $('#map-layer-button').removeClass('hidden');
    $('.map-colors-button').removeClass('hidden');

    $('#should-hide-selected-point-details').addClass('hidden');
    $('#selected-point-details').addClass('hidden');
    $('#should-display-menu').removeClass('hidden');
    $('#toggle-connections').addClass('hidden');
}

function setCookie(name, value, days) {
    var expires = "";
    
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');

    for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
        
function loadOtherTransports() {
    
    fetch('/api/lines/yucatan')
        .then(response => response.json())
        .then(data => {
            data.lines.forEach(function(line) {
                addLineToMap(line.id, line.title, line.coordinates, line.color);
                addStationsToMap(line.stations, line.color, line.shorter_title);
            });

            loadVayven();
        })
        .catch(error => console.error('Error fetching lines:', error));
}

function addStationsToMap(stations, color, line_title) {
    var stationFeatureCollection = {
        'type': 'FeatureCollection',
        'features': []
    };
    
    stations.forEach(station => {
        stationFeatureCollection.features.push({
            'type': 'Feature',
            'properties': {
                'name': station.name,
                'line': line_title
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [station.coordinates[0], station.coordinates[1]]
            }
        });
    });

    if (!map.getSource('vayven-stations')) {
        map.addSource('vayven-stations', {
            'type': 'geojson',
            'data': stationFeatureCollection
        });
    }

    map.on('mouseenter', 'vayven-stations-layer', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'vayven-stations-layer', function () {
        map.getCanvas().style.cursor = '';
    });

    if (!map.getLayer('vayven-stations-layer')) {
        map.addLayer({
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
    }

    if (!map.getLayer('vayven-stations-label-layer')) {
        map.addLayer({
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
    }
}

function addLineToMap(id, title, coordinates, color) {        
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

    if (!map.getLayer('vay-ven-layer')) {
        map.addLayer({
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
    }

    if (!map.getLayer('vay-ven-layer-text')) {
        map.addLayer({
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
    }
}