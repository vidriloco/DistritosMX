var layers = [
    'metro-construido',
    'metro-estaciones',
    'ruta-100'
];

mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/vidriloco/clvjh15d701ag01ph50yv9tjp/draft',
    center: [-99.133209, 19.432608],
    zoom: 12
});

map.on('load', () => {        
    loadAgebLayer();
    configureMapInteractivity();
});

var agebLayerVisible = false;
var selectedLine = null;

$("#toggle-agebs").on('click', function() {
    if(!agebLayerVisible) {
        enableAgebLayer();
    } else {
        disableAgebLayer();
    }

    agebLayerVisible = !agebLayerVisible;
});

function getListOfFeaturesAroundCoordinates(coordinates, radiusInMeters) { }

function clearSelectionData() {

    selectedLine = null;

    map.setPaintProperty('ruta-100', 'line-color', '#57cdff');
    map.setPaintProperty('ruta-100', 'line-opacity', 1);
    
    clearPolygonRadius();
}

function buildPopupForFeatureDetails(e) {
    var features = map.queryRenderedFeatures(e.point, {
        layers: layers
    });
    
    if (!features.length) {
        clearPolygonRadius();
        return;
    }
    
    var title = `${features[0].properties.Name}`.replace(/Line/g, "Línea");
    var system = features[0].properties.Sistema || features[0].properties["Sistema "];
    var logo = oldMetroLogo();
    
    var systemName = "STC Metro";

    if (system === undefined) {
        logo = rutaCienLogo();
        systemName = "Ruta 100";
        title = `Línea ${features[0].properties.Name}`;
    }

    var popupContents = popupStationHTML().replace(/{title}/g, title).replace(/{system}/g, systemName).replace(/{logo}/g, logo);

    var coordinates = e.lngLat.wrap();
    attachPopup(coordinates, popupContents);
    
    centerMapOnCoordinates(coordinates);

    if(features[0].layer.type == "circle") {
        const accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';
        const parsedCoordinates = '{lon},{lat}'.replace(/{lat}/g, coordinates.lat).replace(/{lon}/g, coordinates.lng);
        const limit = 50;
        const radiusInMeters = 300;
    
        const tilesets = ['vidriloco.clvje3dgb1e3b1tpfu7zo8m45-23alu'];
        const joinedTilesets = tilesets.join(',');
        const geom = 'linestring';
    
        fetch(`https://api.mapbox.com/v4/${joinedTilesets}/tilequery/${parsedCoordinates}.json?geometry=${geom}&limit=${limit}&radius=${radiusInMeters}&access_token=${accessToken}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if(data.features[0].geometry.type == "Point") {
                var lineName = `${data.features[0].properties.Name}: ${data.features[0].properties.description}`;
                $("#line-name").text(lineName.replace(/Line/g, "Línea"));
            } else {
                $("#line-name").addClass("hidden");
            }
        });
    } else {
        $("#line-name").addClass("hidden");
    }

    $("#report-item").addClass("hidden");
    $("#hide-popup").addClass("btn-primary");
    $("#hide-popup").removeClass("btn-light");
    $("#connections").addClass("hidden");

    selectedLine = features[0].properties.Name;
    var color =  map.getPaintProperty('ruta-100', 'line-color', ['match', ['get', 'id']]);
    map.setPaintProperty('ruta-100', 'line-color', ['match', ['get', 'Name'], selectedLine, '#047caf' , color]);
    map.setPaintProperty('ruta-100', 'line-opacity', ['match', ['get', 'Name'], selectedLine, 1 , 0.2]);
}