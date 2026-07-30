
function presentEditPublishedLineModalIfNeeded() {
    var shouldDisplay = $('#edit-published-line-modal').attr('data-should-display');
        
    if (shouldDisplay === 'true' && localStorage.getItem('doNotShowEditPublishLineAlert') !== 'true') {
        $('#edit-published-line-modal').modal('show');
    }
}

function doNotShowAgainEditPublishLineAlert() {
    localStorage.setItem('doNotShowEditPublishLineAlert', 'true');
}

// Functions declared in the show JS file

function addMapThemeChooserMapControl() {
    if (!canChooseTheme) {
        return;
    }
    var buttonHtml = $('#wikiando-map-theme-custom-controls').html();
    document.querySelectorAll('.mapboxgl-ctrl-top-right')[0].insertAdjacentHTML('beforeend', buttonHtml);

    $('#wikiando-colour-map-selector').click(function() {
        var items = document.querySelectorAll('.list-group-item');
        items.forEach(function(item) {
            if (item.id === mapThemeID) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        $('#choose-map-theme').modal('show');
    });
}

function setupMap() {
    refreshMapThemeButtons();
    const mapController = new MapController(center, zoom);
    mapController.initialize(mapThemeURL);

    map = mapController.getMap();

    const navControl = new mapboxgl.NavigationControl({
        visualizePitch: true
    });
    navControl._container.style.marginTop = '10px';

    map.addControl(navControl, 'top-right');

    map.on('style.load', () => {
        loadLine(lineID, map);
    });
}

function enableShrinkingNavbar() {
    $('.shrinking-button').click(function() {
        $('.shrinkable').toggleClass('hidden');
    });
}

function loadEvents() {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
}

function loadImageEditing() {
    $('#id_flyer').on('change', function(event) {
        const file = event.target.files[0];
        
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('El tamaño de la imagen no debe ser mayor a 5MB.');
                document.getElementById('id_flyer').value = '';
                return;
            }

            $('#control-buttons').removeClass('hidden');
        }
    });

    $('.clear-image').on('click', function() {
        document.getElementById('id_flyer').value = '';
        $('#control-buttons').addClass('hidden');
    });

    $('#line-save-button').click(function() {
        $('#line-save-button').addClass('hidden');
        $('#line-flyer-saving').removeClass('hidden');
    });

    function deleteImageFlyer(lineID) {
        if (confirm('¿Estás seguro de que deseas eliminar esta imagen?')) {
            $('#line-flyer-delete-button').addClass('hidden');
            $('#line-flyer-deleting').removeClass('hidden');

            fetch(`/lines/${lineID}/flyer/destroy`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': '{{ csrf_token }}'
                }
            })
            .then(response => {
                if (response.ok) {
                    location.reload();
                } else {
                    alert('Error al eliminar la imagen.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al eliminar la imagen.');
            });
        }
    }
}

function setupTextEditor() {
    const quill = new Quill('#description-edit', {
        modules: {
            toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['image', 'link']
            ],
        },
        theme: 'snow'
    });
}

function readThemeColor() {
    mapThemeURL = $('#map').attr('data-theme-url');
    mapThemeID = $('#map').attr('data-theme-id');
}

function refreshMapThemeButtons() {
    $('#wikiando-colour-map-selector').children().each(function() {
        if ($(this).hasClass('map-' + mapThemeID)) {
            $(this).removeClass('hidden');
        } else {
            $(this).addClass('hidden');
        }
    });
}

function addPlayRouteToMapControls() {
    var buttonHtml = $('#wikiando-map-custom-controls').html();
    document.querySelectorAll('.mapboxgl-ctrl-top-right')[0].insertAdjacentHTML('beforeend', buttonHtml);

    $('#wikiando-animate-route-reset').click(function() {
        isAnimating = AnimationState.RESET;
        $('#wikiando-animate-route-reset').addClass('hidden');
        $('#route-play').removeClass('hidden');
        $('#route-stop').addClass('hidden');
    });

    $('.wikiando-animate-route').click(function() {
        mapPitch = map.getPitch();
        if (isAnimating == AnimationState.ANIMATING) {
            $('#route-play').removeClass('hidden');
            $('#route-stop').addClass('hidden');
            $('#wikiando-animate-route-reset').addClass('hidden');
        } else if(isAnimating == AnimationState.PAUSED) {
            $('#route-play').addClass('hidden');
            $('#route-stop').removeClass('hidden');
        }

        if (isAnimating == AnimationState.PAUSED) {
            isAnimating = AnimationState.ANIMATING;
            const lineGeometry = JSON.parse(lineData.lineGeometry);
            animateCameraAlongLine(lineGeometry.coordinates[0]);
            $('#wikiando-animate-route-reset').removeClass('hidden');
        } else {
            isAnimating = AnimationState.PAUSED;
        }
        
    });
}

function addTransitLayerTogglerMapControl() {
    var buttonHtml = $('#wikiando-network-layer-custom-controls').html();
    document.querySelectorAll('.mapboxgl-ctrl-top-right')[0].insertAdjacentHTML('beforeend', buttonHtml);

    $('#wikiando-network-layer-custom-controls-selector').click(function() {
        $('#transit-layer-modal').modal('show');
    });
}

function add3DMapControl() {
    var buttonHtml = $('#wikiando-map-3d-custom-controls').html();
    document.querySelectorAll('.mapboxgl-ctrl-top-right')[0].insertAdjacentHTML('beforeend', buttonHtml);
    
    $('#wikiando-3d-map-off').on('click', function() {
        $(this).addClass('hidden');
        $('#wikiando-3d-map-on').removeClass('hidden');
        lastZoom = map.getZoom();
        map.setPitch(80);
        map.flyTo({
            zoom: 16
        });
    });

    $('#wikiando-3d-map-on').on('click', function() {
        $(this).addClass('hidden');
        $('#wikiando-3d-map-off').removeClass('hidden');
        map.setPitch(0);
        map.flyTo({
            zoom: lastZoom
        });
    });
}

function enableMapThemeSwitcherModal(lineID) {

    $('#line-theme-saving').removeClass('hidden');
    $('#line-theme-apply').addClass('hidden');

    var selectedTheme = $('#map_theme').val();
    fetch(`/lines/${lineID}/set-map-theme/${selectedTheme}`)
    .then(response => response.json())
    .then(data => {
        mapThemeURL = data.theme_url;
        mapThemeID = selectedTheme;
        setupMap();
        $('#choose-map-theme').modal('hide');

        $('#line-theme-saving').addClass('hidden');
        $('#line-theme-apply').removeClass('hidden');
    })
    .catch(error => console.error('Error setting map theme:', error));
}

function animateCameraAlongLine(coordinates) {
    const animationDuration = 80000;
    const cameraAltitude = 1500;
    const routeDistance = turf.lineDistance(turf.lineString(coordinates));
    const cameraRouteDistance = turf.lineDistance(turf.lineString(coordinates));

    let start;
    let lastPhase = lastAnimationPhase || 0;

    function frame(time) {
        if (!start) start = time;
        const phase = lastPhase + (time - start) / animationDuration;

        if (phase > 1) {
            setTimeout(() => {
                start = 0.0;
                lastPhase = 0.0;
            }, 1500);
        } 

        const alongRoute = turf.along(turf.lineString(coordinates), routeDistance * phase).geometry.coordinates;
        const alongCamera = turf.along(turf.lineString(coordinates), cameraRouteDistance * phase).geometry.coordinates;

        const camera = map.getFreeCameraOptions();
        
        camera.position = mapboxgl.MercatorCoordinate.fromLngLat({ lng: alongCamera[0], lat: alongCamera[1] }, cameraAltitude);
        const nextPoint = turf.along(turf.lineString(coordinates), routeDistance * (phase + 0.01)).geometry.coordinates;
        const bearing = turf.bearing(turf.point(alongRoute), turf.point(nextPoint));
        
        camera.lookAtPoint(nextPoint);

        if (isAnimating == AnimationState.ANIMATING) {
            map.setFreeCameraOptions(camera);
            map.setPitch(mapPitch);
            window.requestAnimationFrame(frame);
        } else if(isAnimating == AnimationState.PAUSED) {
            lastAnimationPhase = phase;
        } else if(isAnimating == AnimationState.RESET) {
            const alongCamera = turf.along(turf.lineString(coordinates), 0).geometry.coordinates;
            camera.position = mapboxgl.MercatorCoordinate.fromLngLat({ lng: alongCamera[0], lat: alongCamera[1] }, cameraAltitude);
            map.setFreeCameraOptions(camera);
            map.setPitch(0);
            map.setBearing(0);
            camera.lookAtPoint({ lng: alongCamera[0], lat: alongCamera[1] });
            lastAnimationPhase = 0;
            isAnimating = AnimationState.PAUSED;
        }
    }

    window.requestAnimationFrame(frame);
}

function flyToStation(lat, lng, id) {
    clearRadius();
    htmx.trigger("#station-"+id, "stationSelected");
    $('#line-details').addClass('hidden');

    map.flyTo({
        center: [lng, lat],
        zoom: 16
    });

    $('.stations-chooser img').removeClass('selected');
    $('#station-'+ id).addClass('selected');

    lastLocation = map.getCenter();
}

function clearRadius() {
    if (map.getLayer('station-circle')) {
        map.removeLayer('station-circle');
        map.removeSource('station-circle');
    }
}

function drawStationCircle(radius, lat, lng) {
    clearRadius();
    var circle = turf.circle([lng, lat], radius, {steps: 100, units: 'meters'});
    
    function addCircleLayer() {
        map.addLayer({
            'id': 'station-circle',
            'type': 'fill',
            'source': {
                'type': 'geojson',
                'data': circle
            },
            'layout': {},
            'paint': {
                'fill-color': 'black',
                'fill-opacity': 0.3
            }
        });

        map.fitBounds(turf.bbox(circle), {
            padding: { top: 100, bottom: 100, left: 100, right: 100 }
        });
    }

    if (map.isStyleLoaded()) {
        addCircleLayer();
    } else {
        map.once('style.load', addCircleLayer);
    }
}

function handleRadiusChange(radius) {
    htmx.trigger("#radius-"+radius, "stationSelected");
}

function closeStationDetails(id) {
    clearRadius();
    $('#line-details').removeClass('hidden');
    $('#left-card-container').html('');
    $('.stations-chooser img').removeClass('selected');
}

function userDidChangeTheme(element, theme) {
    document.getElementById('map_theme').value = theme;
    var items = document.querySelectorAll('.list-group-item');
    items.forEach(function(item) {
        item.classList.remove('active');
    });
    element.classList.add('active');
}

function configure3DLayer() {
    const layers = map.getStyle().layers;
    const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
    ).id;

    // The 'building' layer in the Mapbox Streets
    // vector tileset contains building height data
    // from OpenStreetMap.
    map.addLayer(
        {
            'id': 'add-3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 12,
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