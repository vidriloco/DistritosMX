var layers = [
    'metro-construido',
    'metro-extensiones',
    'metro-construido-linea-b',
    'metro-construido-linea-b-ext',
];

mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/vidriloco/clvjdufwh005a01pc81hg0lqg/draft',
    center: [-99.133209, 19.432608],
    zoom: 12
});

map.on('load', () => {        
    loadAgebLayer();
    configureMapInteractivity();
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

function getListOfFeaturesAroundCoordinates(coordinates, radiusInMeters) { }

function buildPopupForFeatureDetails(e) {
    var features = map.queryRenderedFeatures(e.point, {
        layers: layers
    });
    
    if (!features.length) {
        clearPolygonRadius();
        return;
    }

    var title = `Línea ${features[0].properties.LINEA}`;
    var logo = metroLogo();

    var popupContents = popupStationHTML().replace(/{title}/g, title).replace(/{system}/g, "STC Metro").replace(/{logo}/g, logo);

    var coordinates = e.lngLat.wrap();
    attachPopup(coordinates, popupContents);
    centerMapOnCoordinates(coordinates);
    
    $("#line-name").text(features[0].properties.RUTA);

    $("#report-item").addClass("hidden");
    $("#hide-popup").addClass("btn-primary");
    $("#hide-popup").removeClass("btn-light");
    $("#connections").addClass("hidden");
}