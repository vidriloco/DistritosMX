function loadLine(lineID, map=null, padding={top: 10, bottom: 150, left: 15, right: 5}) {
        
    fetch(`/lines/${lineID}/data`)
        .then(response => response.json())
        .then(data => {
            lineData = data;
            map.addLayer({
                'id': 'line-path',
                'type': 'line',
                'source': {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'geometry': JSON.parse(data.lineGeometry)
                    }
                },
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': data.color,
                    'line-width': 3
                }
            });

            map.addLayer({
                "id": "line-label",
                "type": "symbol",
                "source": {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'geometry': JSON.parse(data.lineGeometry)
                    }
                },
                "layout": {
                    "symbol-placement": "line-center",
                    "text-font": ["Inter Bold", "Arial Unicode MS Regular"],
                    "text-size": 13,
                    "text-offset": [0, 1],
                    "text-field": data.named_identifier + ": " + data.name + " (" + data.system + ")",
                },
                "paint": {
                    "text-color": data.color
                }
            });
            
            const lineCoordinates = JSON.parse(data.lineGeometry).coordinates;
            const lineStrings = lineCoordinates.map(coords => turf.lineString(coords));
            const totalLength = lineStrings.reduce((sum, lineString) => sum + turf.length(lineString, { units: 'kilometers' }), 0);
            $('.line-length').text(totalLength.toFixed(2));
            $('.line-length').parent().removeClass('hidden');
            
            // Adding stations
            var stationFeatureCollection = {
                'type': 'FeatureCollection',
                'features': []
            };

            data.stations.forEach(station => {
                stationFeatureCollection.features.push({
                    'type': 'Feature',
                    'properties': {
                        'description': station.name
                    },
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [station.lng, station.lat]
                    }
                });
            });

            map.addSource('stations', {
                'type': 'geojson',
                'data': stationFeatureCollection
            });

            map.addLayer({
                'id': 'stations-labels',
                'type': 'symbol',
                'source': 'stations',
                'layout': {
                    'text-field': ['get', 'description'],
                    'text-justify': 'auto',
                    'text-size': 12,
                    'text-font': ['Inter Bold', 'Arial Unicode MS Bold'],
                    'text-offset': [0, 4],
                    'text-anchor': 'bottom',
                    'text-padding': 2,
                    'text-pitch-alignment': 'viewport'
                },
                'paint': {
                    'text-color': data.color
                }
            });

            // Adding markers
            var markerFeatureCollection = {
                'type': 'FeatureCollection',
                'features': []
            };

            data.markers.forEach(marker => {
                markerFeatureCollection.features.push({
                    'type': 'Feature',
                    'properties': {
                        'description': marker.name
                    },
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [marker.lng, marker.lat]
                    }
                });
            });

            map.addSource('markers', {
                'type': 'geojson',
                'data': markerFeatureCollection
            });

            map.on('zoom', function() {
                if (map.getZoom() > 14) {
                    map.setLayoutProperty('stations-labels', 'visibility', 'visible');
                } else {
                    map.setLayoutProperty('stations-labels', 'visibility', 'none');
                }
            });

            function createCustomMarker(markerObject, htmlForPopup) {
                const markerElement = document.createElement('div');
                markerElement.className = 'custom-marker';
                markerElement.style.backgroundImage = 'url(' + markerObject.icon + ')';
                markerElement.style.width = '50px';
                markerElement.style.height = '50px';
                markerElement.style.backgroundSize = '100%';
                markerElement.style.cursor = 'pointer';

                markerElement.addEventListener('click', () => {
                    if(!htmlForPopup) {
                        flyToStation(markerObject.lat, markerObject.lng, markerObject.id);
                    } else {
                        if (window.currentPopup) {
                            window.currentPopup.remove();
                        }

                        const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: false })
                            .setHTML(htmlForPopup);

                        popup.setLngLat([markerObject.lng, markerObject.lat]).addTo(map);
                        window.currentPopup = popup;
                    }
                });

                return markerElement;
            }

            data.stations.forEach(station => {
                const stationMarker = new mapboxgl.Marker({
                    element: createCustomMarker(station)
                })
                .setLngLat([station.lng, station.lat])
                .addTo(map);
            });

            data.markers.forEach(marker => {
                var description = marker.description;
                
                if(description === "") {
                    description = "No hay detalles de este punto";
                }

                var markerHTML = "<div class='m-3'><h5>" + marker.name + "</h5><p style='font-size: 15px'>" + description + "</p></div>"

                const markerObject = new mapboxgl.Marker({
                    element: createCustomMarker(marker, markerHTML)
                })
                .setLngLat([marker.lng, marker.lat])
                .addTo(map);
            });
            
            map.fitBounds(turf.bbox(turf.lineString(JSON.parse(data.lineGeometry).coordinates[0])), {
                padding: padding
            });
        })
        .catch(error => console.error('Error loading line data:', error));
}