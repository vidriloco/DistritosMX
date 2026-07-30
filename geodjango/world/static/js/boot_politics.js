var layers = [
    'mov-ciudadano', 
    'morena', 
    'frente'
];

mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/vidriloco/clwu260v7008801qp5tcv4jfc/draft',
    center: [-99.133209, 19.432608],
    zoom: 12
});

map.on('load', () => {        
    loadAgebLayer();
    configureMapInteractivity();
    loadPolitics();

    $('#should-display-menu').on('click', function() {
        if($('#layer-menu-options').hasClass('hidden')) {
            expandLayersMenu();
        } else {
            collapseLayersMenu();
        }
    });
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

var morenaVisible = false;
var vaPorMexicoVisible = false;
var movCiudadanoVisible = false;

function loadPolitics() {
    ['morena', 'frente', 'mov-ciudadano'].forEach(element => {
        map.setLayoutProperty(element, 'visibility', 'none');
    });

    $("#morena").on('click', function() {
        if(!morenaVisible) {
            $('#morena').addClass('active');
            ['morena'].forEach(element => {
                map.setLayoutProperty(element, 'visibility', 'visible');
            });
        } else {
            $('#morena').removeClass('active');
            ['morena'].forEach(element => {
                map.setLayoutProperty(element, 'visibility', 'none');
            });
        }

        morenaVisible = !morenaVisible;
    });

    $("#va-x-mx").on('click', function() {
        if(!vaPorMexicoVisible) {
            $('#va-x-mx').addClass('active');
            ['frente'].forEach(element => {
                map.setLayoutProperty(element, 'visibility', 'visible');
            });
        } else {
            $('#va-x-mx').removeClass('active');
            ['frente'].forEach(element => {
                map.setLayoutProperty(element, 'visibility', 'none');
            });
        }

        vaPorMexicoVisible = !vaPorMexicoVisible;
    });

    $("#mov-ciudadano").on('click', function() {
        if(!movCiudadanoVisible) {
            $('#mov-ciudadano').addClass('active');
            ['mov-ciudadano'].forEach(element => {
                map.setLayoutProperty(element, 'visibility', 'visible');
            });
        } else {
            $('#mov-ciudadano').removeClass('active');
            ['mov-ciudadano'].forEach(element => {
                map.setLayoutProperty(element, 'visibility', 'none');
            });
        }

        movCiudadanoVisible = !movCiudadanoVisible;
    });
}

function getListOfFeaturesAroundCoordinates(coordinates, radiusInMeters) { }

function buildPopupForFeatureDetails(e) {
    
    var features = map.queryRenderedFeatures(e.point, {
        layers: layers
    });
    
    if (!features.length) {
        clearPolygonRadius();
        return;
    }

    var title = features[0].properties.RUTA || features[0].properties.Name;
    var system = features[0].properties.SISTEMA.trim();
    console.log(features);

    var logo = getLogo(system);

    var popupContents = popupStationHTML().replace(/{title}/g, title).replace(/{system}/g, system).replace(/{logo}/g, logo);
    var coordinates = e.lngLat.wrap();
    attachPopup(coordinates, popupContents);
    centerMapOnCoordinates(coordinates);

    const tilesets = ['vidriloco.clvfhntkq04h91mo6b4ntwze8-875yd'];

    $("#line-name").text("");

    $("#report-item").addClass("hidden");
    $("#hide-popup").addClass("btn-primary");
    $("#hide-popup").removeClass("btn-light");
    $("#connections").addClass("hidden");
}

function expandLayersMenu() {
    $('#layer-menu-options').removeClass('hidden');
            
    // Show close button icon
    $('#close-panel-button').removeClass('hidden');
    // Hide map layer button icon
    $('#map-layer-button').addClass('hidden');
}

function collapseLayersMenu() {
    $('#layer-menu-options').addClass('hidden');

    $('#close-panel-button').addClass('hidden');
    $('#map-layer-button').removeClass('hidden');

    $('#should-hide-selected-point-details').addClass('hidden');
    $('#selected-point-details').addClass('hidden');
    $('#should-display-menu').removeClass('hidden');
    $('#toggle-connections').addClass('hidden');
}