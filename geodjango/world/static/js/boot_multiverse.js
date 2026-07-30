var layers = [
    'estaciones', 
    'tren-construido', 
    'tren-bicolor', 
    'metro-construido',
    'tren-bicolor'
];

mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/vidriloco/clvffh854006a01qibxv01y4y/draft',
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

    var title = features[0].properties.Name;
    var system = features[0].properties.Sistema.trim();
    var lineName = features[0].properties.Sistema.trim();
    var logo = oldMetroLogo();

    if (system == 'Tren Ligero') {
        logo = oldTrenLigeroLogo();
    }

    var popupContents = popupStationHTML().replace(/{title}/g, title).replace(/{system}/g, system).replace(/{logo}/g, logo);

    var coordinates = e.lngLat.wrap();
    attachPopup(coordinates, popupContents);
    centerMapOnCoordinates(coordinates);
    const accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';
    const parsedCoordinates = '{lon},{lat}'.replace(/{lat}/g, coordinates.lat).replace(/{lon}/g, coordinates.lng);
    const limit = 50;
    const radiusInMeters = 300;

    const tilesets = ['vidriloco.clvfhntkq04h91mo6b4ntwze8-875yd'];
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
        if(data.features[0].geometry.Type == "Point") {
            var lineName = `${data.features[0].properties.Name}: ${data.features[0].properties.description}`;
            $("#line-name").text(lineName);
        } else {
            $("#line-name").text(data.features[0].properties.description);
        }
    });

    $("#report-item").addClass("hidden");
    $("#hide-popup").addClass("btn-primary");
    $("#hide-popup").removeClass("btn-light");
    $("#connections").addClass("hidden");
}