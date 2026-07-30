function updateMetrobus(isVisible) {
    const system = 'metrobus';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
     '{system}-stations'.replace(/{system}/g, system), 
     '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
        map.setLayoutProperty(element, 'visibility', visibleKey);
    });

    metrobusVisible = isVisible;
}

function updateMetro(isVisible) {
    const system = 'metro';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
        '{system}-stations'.replace(/{system}/g, system), 
        '{system}-labels'.replace(/{system}/g, system),
        '{system}-construction-lines'.replace(/{system}/g, system), 
        '{system}-construction-stations'.replace(/{system}/g, system), 
        '{system}-construction-labels'.replace(/{system}/g, system),
        'metro-lines-b'].forEach(element => {
           map.setLayoutProperty(element, 'visibility', visibleKey);
    });

    metrobusVisible = isVisible;
}

function updateTrenLigero(isVisible) {
    const system = 'tren-ligero';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
        '{system}-stations'.replace(/{system}/g, system), 
        '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
           map.setLayoutProperty(element, 'visibility', visibleKey);
    });

    trenLigeroVisible = isVisible;
}

function updateTrolebus(isVisible) {
    const system = 'trolebus';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
        '{system}-stations'.replace(/{system}/g, system), 
        '{system}-labels'.replace(/{system}/g, system),
        '{system}-construction-lines'.replace(/{system}/g, system), 
        '{system}-construction-stations'.replace(/{system}/g, system), 
        '{system}-construction-labels'.replace(/{system}/g, system)
       ].forEach(element => {
           map.setLayoutProperty(element, 'visibility', visibleKey);
    });

    trenLigeroVisible = isVisible;
}

function updateTrenSuburbano(isVisible) {
    const system = 'tren-suburbano';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
        '{system}-stations'.replace(/{system}/g, system), 
        '{system}-labels'.replace(/{system}/g, system),
        '{system}-construction-lines'.replace(/{system}/g, system),
        '{system}-construction-stations'.replace(/{system}/g, system),
        '{system}-construction-labels'.replace(/{system}/g, system)].forEach(element => {
           map.setLayoutProperty(element, 'visibility', visibleKey);
       });

    trenSuburbanoVisible = isVisible;
}

function updateMexibus(isVisible) {
    const system = 'mexibus';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
        '{system}-stations'.replace(/{system}/g, system), 
        '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
           map.setLayoutProperty(element, 'visibility', visibleKey);
    });
    
    mexibusVisible = isVisible;
}

function updateMexicable(isVisible) {
    const system = 'mexicable';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
        '{system}-stations'.replace(/{system}/g, system), 
        '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
           map.setLayoutProperty(element, 'visibility', visibleKey);
    });
    
    mexicableVisible = isVisible;
}

function updateCorredores(isVisible) {
    const system = 'corredores';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
     '{system}-stops'.replace(/{system}/g, system), 
     '{system}-labels'.replace(/{system}/g, system)].forEach(element => {
        map.setLayoutProperty(element, 'visibility', visibleKey);
    });

    corredoresVisible = isVisible;
}

function updateRTP(isVisible) {
    const system = 'rtp';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
        '{system}-stops'.replace(/{system}/g, system), 
        '{system}-labels'.replace(/{system}/g, system),
        'rtp-stops-troncal',
        'rtp-stops-ordinario',
        'rtp-stops-atenea',
        'rtp-stops-express',
        'rtp-stops-ecobus'
       ].forEach(element => {
           map.setLayoutProperty(element, 'visibility', visibleKey);
       });

    rtpVisible = isVisible;
}

function updateCablebus(isVisible) {
    const system = 'cablebus';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
        '{system}-stations'.replace(/{system}/g, system), 
        '{system}-labels'.replace(/{system}/g, system),
        '{system}-construction-lines'.replace(/{system}/g, system), 
        '{system}-construction-stations'.replace(/{system}/g, system), 
        '{system}-construction-labels'.replace(/{system}/g, system)].forEach(element => {
           map.setLayoutProperty(element, 'visibility', visibleKey);
    });

    cablebusVisible = isVisible;
}

function updateTrenInterurbano(isVisible) {
    const system = 'tren-interurbano';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
        '{system}-stations'.replace(/{system}/g, system), 
        '{system}-labels'.replace(/{system}/g, system),
        '{system}-construction-stations'.replace(/{system}/g, system),
        '{system}-construction-lines'.replace(/{system}/g, system)].forEach(element => {
           map.setLayoutProperty(element, 'visibility', visibleKey);
    });

    trenInterurbanoVisible = isVisible;
}

function updatePeseros(isVisible) {
    const system = 'peseros';

    var visibleKey = isVisible ? 'visible' : 'none';

    ['{system}-lines'.replace(/{system}/g, system), 
     '{system}-labels'.replace(/{system}/g, system)
    ].forEach(element => {
        map.setLayoutProperty(element, 'visibility', visibleKey);
    });

    peserosVisible = isVisible;
}

function updateEcobici(isVisible) {

    var visibleKey = isVisible ? 'visible' : 'none';

    ['ecobici-stations'].forEach(element => {
        map.setLayoutProperty(element, 'visibility', visibleKey);
    });

    ecobiciVisible = isVisible;
}

function loadSystem(system, isVisible) {
    if(system == 'metrobus') {
        updateMetrobus(isVisible);
    } else if(system == 'metro') {
        updateMetro(isVisible);
    } else if(system == 'tren-ligero') {
        updateTrenLigero(isVisible);
    } else if(system == 'trolebus') {
        updateTrolebus(isVisible);
    } else if(system == 'tren-suburbano') {
        updateTrenSuburbano(isVisible);
    } else if(system == 'mexibus') {
        updateMexibus(isVisible);
    } else if(system == 'mexicable') {
        updateMexicable(isVisible);
    } else if(system == 'corredores') {
        updateCorredores(isVisible);
    } else if(system == 'rtp') {
        updateRTP(isVisible);
    } else if(system == 'cablebus') {
        updateCablebus(isVisible);
    } else if(system == 'tren-interurbano') {
        updateTrenInterurbano(isVisible);
    } else if(system == 'ecobici') {
        updateEcobici(isVisible);
    } else if(system == 'peseros') {
        updatePeseros(isVisible);
    }
}

function addMapThemeChooserMapControl() {

    var buttonHtml = $('#wikiando-map-theme-custom-controls').html();
    document.querySelectorAll('.mapboxgl-ctrl-top-right')[0].insertAdjacentHTML('beforeend', buttonHtml);
    
    $('#wikiando-colour-map-selector').click(function() {
        
        $('#choose-map-theme').modal('show');

    });

    $('.map-color-option').on('click', function() {
        $('.color-button img').addClass('hidden');
        $('.color-button img.'+this.id).removeClass('hidden');

        var items = document.querySelectorAll('.list-group-item');
        items.forEach(function(item) {
            item.classList.remove('active');
        });

        $('#choose-map-theme').modal('show');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    addMapThemeChooserMapControl();
});