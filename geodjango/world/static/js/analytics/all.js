class MapVisualization {
    constructor(timing = { intervalMinutes: 1, delay: 700 }, mode, options = {}, mapStyle='mapbox://styles/mapbox/dark-v10') {
        this.mapboxToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';
        this.deck = deck;
        this.data = [];
        this.currentTime = new Date('2024-06-26');
        this.isPlaying = false;
        this.sliderInterval = null;
        this.startValue = 0;
        this.minDate = null;
        this.maxDate = null;
        this.totalIntervals = null;
        this.delay = timing.delay;
        this.INITIAL_VIEW_STATE = {
            latitude: 19.4326,
            longitude: -99.1332,
            zoom: 11.5,
            pitch: mode == 'transactions' ? 45 : 0,
            bearing: 0
        };
        this.isRotating = false;
        this.rotationSpeed = 0.1;
        this.currentViewState = this.INITIAL_VIEW_STATE;
        this.currentBearing = 0;
        this.deckgl = null;
        this.selectedContainer = 'recharge-amount';
        this.selectedFeature = null;
        this.elevationValue = 0;
        this.metricRanges = {};
        this.intervalMinutes = timing.intervalMinutes;
        this.mode = mode;
        this.mapStyle = mapStyle;
        this.vehicleID = options.vehicleID;
        this.startDate = options.startDate;
        this.endDate = options.endDate;
        
        this.init();
    }

    init() {
        this.initializeDeckGL();
        this.addEventListeners();

        if(this.mode == 'transactions') {
            this.fetchTransactionsData();
        } else if(this.mode == 'movements') {
            this.fetchMovementsData();
        }
    }

    initializeDeckGL() {
        this.deckgl = new this.deck.DeckGL({
            container: 'map',
            mapStyle: this.mapStyle,
            mapboxApiAccessToken: this.mapboxToken,
            initialViewState: this.INITIAL_VIEW_STATE,
            controller: true,
            onViewStateChange: ({ viewState }) => {
                this.currentViewState = viewState;
                if (!this.isRotating) {
                    this.currentBearing = viewState.bearing;
                }
            }
        });

        const language = new MapboxLanguage({ defaultLanguage: 'es' });
        this.deckgl._map.map.addControl(language);
    }

    addEventListeners() {
        document.getElementById('play-pause').addEventListener('click', () => this.toggleAnimation());
        document.getElementById('rotate-map').addEventListener('click', () => this.toggleRotation());
        const timeSlider = document.getElementById('time-slider');
        timeSlider.addEventListener('mouseenter', () => {
            if (this.isPlaying) {
                clearInterval(this.sliderInterval);
            }
        });
        timeSlider.addEventListener('mouseleave', () => {
            if (this.isPlaying) {
                this.animateSlider();
            }
        });
        timeSlider.addEventListener('input', (e) => {
            const sliderValue = parseInt(e.target.value);
            this.updateTimeFromSlider(sliderValue);
        });
    }

    fetchMovementsData() {
        document.getElementById('loading-indicator').style.display = 'flex';

        var url = '/api/vehicles/trails/date/' + this.startDate + '/' + this.endDate + '/' + this.vehicleID;
        
        if (this.vehicleID === undefined) {
            url = '/static/data/' + this.startDate + '.json';
        }

        fetch(url)
            .then(response => response.text())
            .then(data => {
                this.processMovementsData(data);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                document.getElementById('loading-indicator').style.display = 'none';
            }
        );
    }

    processMovementsData(data) {
        this.data = JSON.parse(data);
        
        if (this.data.length === 0) {
            console.error('No valid data after parsing');
            document.getElementById('loading-indicator').style.display = 'none';
            return;
        }

        this.minDate = new Date(this.data["start_date"]);
        this.maxDate = new Date(this.data["end_date"]);
        this.currentTime = this.minDate;
        this.totalIntervals = Math.floor((this.maxDate - this.minDate) / (this.intervalMinutes * 60000));
        const timeSlider = document.getElementById('time-slider');
        timeSlider.max = this.totalIntervals;
        timeSlider.step = 1;
        
        this.updateMovementsLayers();
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('control-panel').classList.remove('hidden');

        if(this.vehicleID !== undefined) {
            document.getElementById('bus-details-panel').classList.remove('hidden');
        } else {
            document.getElementById('bus-list-panel').classList.remove('hidden');
        }
    }

    updateMovementsLayers() {
        const START_TIME = 17e8;

        function getColor(value) {
            if (value === "l1") {
                return [166, 40, 37]; // red
            }
            if (value === "l2") {
                return [125, 49, 139]; // purple
            }
            if (value === "l3") {
                return [129, 161, 66]; // green
            }
            if (value === "l4") {
                return [222, 95, 54]; // yellow
            }
            if (value === "l5") {
                return [31, 42, 88]; // purple
            }
            if (value === "l6") {
                return [199, 48, 127]; // green
            }
            return [47, 103, 61]; // black
        }
        
        const filteredData = this.data.collection.map(item => {

            if (this.currentTime.getHours() >= 2 && this.currentTime.getHours() < 4) {
                console.log('No valid data after parsing');
                return [{ 'direction': null, 'timestamps': null, 'path': null }];
            }

            const closestIndex = item.timestamps.reduce((prev, curr, index) => {
                return (Math.abs(curr - this.currentTime.getTime() / 1000) < Math.abs(item.timestamps[prev] - this.currentTime.getTime() / 1000) ? index : prev);
            }, 0);

            if (document.getElementById('bus-details-panel')) {
                $('#bus-details-panel .number').text(this.vehicleID);
                $('#bus-details-panel .direction').text(item.direction[closestIndex]);
            }
            
            return {
                ...item,
                path: item.path.slice(0, closestIndex + 20),
                timestamps: item.timestamps.slice(0, closestIndex + 20),
                direction: item.direction[closestIndex]
            };
        });

        const layers = [
            new this.deck.TripsLayer({
                id: 'trips',
                data: filteredData,
                getTimestamps: d => d.timestamps.map(t => t - START_TIME),
                getColor: d => getColor(d.line),
                capRounded: true,
                jointRounded: true,
                widthMinPixels: 5,
                trailLength: 300,
                parameters: {
                    depthTest: false,
                },
                currentTime: (this.currentTime.getTime() / 1000) - START_TIME,
                interpolation: false
            }),
        ];
        
        this.deckgl.setProps({ layers: layers });
        this.updateTimeDisplay();
    }

    // Methods for transactions
    fetchTransactionsData() {
        document.getElementById('loading-indicator').style.display = 'flex';
        fetch('https://wikiando.s3.us-east-2.amazonaws.com/data/merged_transactions_15min.csv')
            .then(response => response.text())
            .then(csvData => {
                Papa.parse(csvData, {
                    header: true,
                    dynamicTyping: true,
                    complete: (results) => {
                        this.processData(results.data);
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                document.getElementById('loading-indicator').style.display = 'none';
            });
    }

    processData(data) {
        this.data = data.map(item => {
            const timeBin = typeof item.time_bin === 'string' ? item.time_bin : String(item.time_bin);
            const parsedDate = new Date(timeBin);
            const timestamp = isNaN(parsedDate.getTime()) ? null : parsedDate;
            return {
                ...item,
                station_lng: parseFloat(item.lng),
                station_lat: parseFloat(item.lat),
                timestamp: timestamp
            };
        }).filter(item => item.timestamp !== null);

        if (this.data.length === 0) {
            console.error('No valid data after parsing');
            document.getElementById('loading-indicator').style.display = 'none';
            return;
        }

        this.minDate = new Date(Math.min(...this.data.map(d => d.timestamp)));
        this.maxDate = new Date(Math.max(...this.data.map(d => d.timestamp)));
        this.currentTime = this.minDate;
        this.totalIntervals = Math.floor((this.maxDate - this.minDate) / (15 * 60000));
        const timeSlider = document.getElementById('time-slider');
        timeSlider.max = this.totalIntervals;
        timeSlider.step = 1;

        this.calculateMetricRanges();
        this.updateLayers();
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('control-panel').classList.remove('hidden');
    }

    calculateMetricRanges() {
        const metrics = ['recharge_amount_sum', 'recharge_amount_mean', 'debit_amount_sum', 'debit_amount_mean', 'free_count', 'transfer_count'];
        metrics.forEach(metric => {
            const values = this.data.map(d => parseFloat(d[metric])).filter(v => !isNaN(v));
            this.metricRanges[metric] = {
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });
    }

    getColorForValue(value, metric) {
        const range = this.metricRanges[metric];
        if (!range) return [0, 0, 0];
        const normalizedValue = (value - range.min) / (range.max - range.min);
        if (normalizedValue > 0.8) return [214, 40, 40];
        if (normalizedValue > 0.6) return [247, 127, 0];
        if (normalizedValue > 0.4) return [255, 214, 10];
        if (normalizedValue > 0.2) return [167, 201, 87];
        return [0, 166, 81];
    }

    getElevationEscale() {
        if (this.selectedContainer === 'recharge-amount' || this.selectedContainer === 'debit-amount') return 0.8;
        if (this.selectedContainer === 'recharge-average' || this.selectedContainer === 'debit-average') return 60;
        if (this.selectedContainer === 'free-count') return 10;
        if (this.selectedContainer === 'transfer-count') return 10;
    }

    getColor(d) {
        const hour = new Date(d.timestamp).getHours();
        if (hour >= 1 && hour < 4) return [0, 0, 0, 0];
        let value, metric;
        if (this.selectedContainer === 'recharge-amount') {
            value = parseFloat(d.recharge_amount_sum);
            metric = 'recharge_amount_sum';
        } else if (this.selectedContainer === 'recharge-average') {
            value = parseFloat(d.recharge_amount_mean);
            metric = 'recharge_amount_mean';
        } else if (this.selectedContainer === 'debit-amount') {
            value = parseFloat(d.debit_amount_sum);
            metric = 'debit_amount_sum';
        } else if (this.selectedContainer === 'debit-average') {
            value = parseFloat(d.debit_amount_mean);
            metric = 'debit_amount_mean';
        } else if (this.selectedContainer === 'free-count') {
            value = parseFloat(d.free_count);
            metric = 'free_count';
        } else if (this.selectedContainer === 'transfer-count') {
            value = parseFloat(d.transfer_count);
            metric = 'transfer_count';
        }
        return this.getColorForValue(value, metric);
    }

    updateLayers() {
        const timeWindow = 15 * 60 * 1000;
        const visibleData = this.data.filter(d => d.timestamp >= this.currentTime && d.timestamp < new Date(this.currentTime.getTime() + timeWindow));
        const layer = new this.deck.ColumnLayer({
            id: 'ColumnLayer',
            data: visibleData,
            diskResolution: 20,
            extruded: true,
            radius: 150,
            elevationScale: this.getElevationEscale(),
            getElevation: d => {
                if (this.selectedContainer === 'recharge-amount') return parseFloat(d.recharge_amount_sum);
                if (this.selectedContainer === 'recharge-average') return parseFloat(d.recharge_amount_mean);
                if (this.selectedContainer === 'debit-amount') return parseFloat(d.debit_amount_sum);
                if (this.selectedContainer === 'debit-average') return parseFloat(d.debit_amount_mean);
                if (this.selectedContainer === 'free-count') return parseFloat(d.free_count);
                if (this.selectedContainer === 'transfer-count') return parseFloat(d.transfer_count);
            },
            autoHighlight: true,
            highlightColor: [255, 255, 255, 255],
            getFillColor: d => {
                if (this.selectedFeature &&
                    d.station_name === this.selectedFeature.station_name &&
                    d.system_identifier === this.selectedFeature.system_identifier &&
                    d.timestamp >= this.currentTime &&
                    d.timestamp < new Date(this.currentTime.getTime() + 15 * 60 * 1000)) {
                    return [255, 255, 255];
                }
                return this.getColor(d);
            },
            getPosition: d => [d.station_lng, d.station_lat],
            pickable: true,
            onClick: ({ object }) => {
                if (object) {
                    this.selectedFeature = object;
                    this.updateInfoCard();
                    this.updateLayers();
                }
            },
        });
        this.deckgl.setProps({ layers: [layer] });
        this.updateTimeDisplay();
        if (this.selectedFeature) {
            this.updateInfoCard();
        }
    }

    updateTimeDisplay() {
        moment.lang('es', {
            months: 'Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre'.split('_'),
            monthsShort: 'Enero._Feb._Mar_Abr._May_Jun_Jul._Ago_Sept._Oct._Nov._Dec.'.split('_'),
            weekdays: 'Domingo_Lunes_Martes_Miercoles_Jueves_Viernes_Sabado'.split('_'),
            weekdaysShort: 'Dom._Lun._Mar._Mier._Jue._Vier._Sab.'.split('_'),
            weekdaysMin: 'Do_Lu_Ma_Mi_Ju_Vi_Sa'.split('_')
        });
        const currentTimeDateDisplay = document.getElementById('current-time-time');
        currentTimeDateDisplay.textContent = moment(this.currentTime).format("MMM Do - YY");
        const currentTimeDayDisplay = document.getElementById('current-time-day');
        currentTimeDayDisplay.textContent = this.currentTime.getHours() + 'h :' + this.currentTime.getMinutes() + 'm';
    }

    updateInfoCard() {
        const card = document.getElementById('info-card');
        const cardContent = document.getElementById('info-card-content');
        const cardContentClosed = document.getElementById('info-card-content-closed');
        const dataPointComponent = document.getElementById('info-card');
        const hour = new Date(this.currentTime).getHours();
        if (hour >= 1 && hour < 4) {
            cardContent.classList.add('hidden');
            cardContentClosed.classList.remove('hidden');
            const color = this.getColor(this.selectedFeature);
            dataPointComponent.style.borderColor = `#e35f00`;
            dataPointComponent.style.borderWidth = '2px';
            return;
        } else {
            const color = this.getColor(this.selectedFeature);
            dataPointComponent.style.borderColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            dataPointComponent.style.borderWidth = '7px';
            cardContent.classList.remove('hidden');
            cardContentClosed.classList.add('hidden');
        }
        if (this.selectedFeature) {
            const currentFeatureData = this.data.find(d =>
                d.station_name === this.selectedFeature.station_name &&
                d.system_identifier === this.selectedFeature.system_identifier &&
                d.timestamp >= this.currentTime &&
                d.timestamp < new Date(this.currentTime.getTime() + 15 * 60 * 1000)
            );
            if (currentFeatureData) {
                $('#recharge-count').text(new Intl.NumberFormat('es-MX').format(currentFeatureData.recharge_amount_count));
                $('#recharge-amount').text(new Intl.NumberFormat('es-MX').format(currentFeatureData.recharge_amount_sum));
                $('#recharge-average').text(new Intl.NumberFormat('es-MX').format(parseFloat(currentFeatureData.recharge_amount_mean).toFixed(2)));
                $('#debit-count').text(new Intl.NumberFormat('es-MX').format(currentFeatureData.debit_amount_count));
                $('#debit-amount').text(new Intl.NumberFormat('es-MX').format(currentFeatureData.debit_amount_sum));
                $('#debit-average').text(new Intl.NumberFormat('es-MX').format(parseFloat(currentFeatureData.debit_amount_mean).toFixed(2)));
                $('#free-count').text(new Intl.NumberFormat('es-MX').format(currentFeatureData.free_count));
                $('#transfer-count').text(new Intl.NumberFormat('es-MX').format(currentFeatureData.transfer_count));
                $('#station-name').text(currentFeatureData.station_name);
                if (currentFeatureData.system_identifier == 'STC Metro') {
                    $('.metro-logo').removeClass('hidden');
                    $('.metrobus-logo').addClass('hidden');
                    $('.tren-ligero-logo').addClass('hidden');
                } else if (currentFeatureData.system_identifier == 'Metrobús') {
                    $('.metrobus-logo').removeClass('hidden');
                    $('.metro-logo').addClass('hidden');
                    $('.tren-ligero-logo').addClass('hidden');
                } else if (currentFeatureData.system_identifier == 'STE Tren ligero' || currentFeatureData.system_identifier == 'STE Trolebús' || currentFeatureData.system_identifier == 'STE Cablebús' || currentFeatureData.system_identifier == 'STE Trolebús Elevado') {
                    $('.tren-ligero-logo').removeClass('hidden');
                    $('.metro-logo').addClass('hidden');
                    $('.metrobus-logo').addClass('hidden');
                }
                const color = this.getColor(currentFeatureData);
                dataPointComponent.style.borderColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                dataPointComponent.style.borderWidth = '7px';
                card.classList.remove('hidden');
            }
        } else {
            card.classList.add('hidden');
        }
    }

    updateTimeFromSlider(sliderValue) {
        this.currentTime = new Date(this.minDate.getTime() + sliderValue * this.intervalMinutes * 60000);
        if(this.mode == 'transactions') {
            this.updateLayers();
        } else if(this.mode == 'movements') {
            this.updateMovementsLayers();
        }
    }

    animateSlider() {
        const timeSlider = document.getElementById('time-slider');
        if (this.sliderInterval) {
            clearInterval(this.sliderInterval);
        }
        this.startValue = parseInt(timeSlider.value);
        this.sliderInterval = setInterval(() => {
            if (this.startValue < this.totalIntervals) {
                this.startValue++;
                timeSlider.value = this.startValue;
                this.updateTimeFromSlider(this.startValue);
            } else {
                this.startValue = 0;
                timeSlider.value = this.startValue;
                this.updateTimeFromSlider(this.startValue);
            }
        }, this.delay);
    }

    toggleAnimation() {
        this.isPlaying = !this.isPlaying;
        this.updateControls(this.delay);
    }

    setSpeed(speed) {
        this.delay = speed;
        this.isPlaying = true;
        this.updateControls(speed);
        this.animateSlider();
    }

    updateControls(speed) {
        document.querySelector('#play-forward .forward-3x').classList.add('hidden');
        document.querySelector('#play-forward .forward-2x').classList.add('hidden');
        document.querySelector('#play-forward .forward-1x').classList.add('hidden');
        if (this.isPlaying) {
            document.querySelector('#play-pause .play').classList.add('hidden');
            document.querySelector('#play-pause .stop').classList.remove('hidden');
            if (speed == 500) {
                document.querySelector('#play-forward .forward-2x').classList.remove('hidden');
            } else if (speed == 100) {
                document.querySelector('#play-forward .forward-3x').classList.remove('hidden');
            } else {
                document.querySelector('#play-forward .forward-1x').classList.remove('hidden');
            }
            this.animateSlider();
        } else {
            document.querySelector('#play-pause .play').classList.remove('hidden');
            document.querySelector('#play-pause .stop').classList.add('hidden');
            if (speed == 500) {
                document.querySelector('#play-forward .forward-2x').classList.remove('hidden');
            } else if (speed == 100) {
                document.querySelector('#play-forward .forward-3x').classList.remove('hidden');
            } else {
                document.querySelector('#play-forward .forward-1x').classList.remove('hidden');
            }
            clearInterval(this.sliderInterval);
        }
    }

    rotateMap() {
        if (!this.isRotating || !this.deckgl) return;
        this.currentBearing = (this.currentBearing + this.rotationSpeed) % 360;
        this.deckgl.setProps({
            viewState: {
                ...this.currentViewState,
                bearing: this.currentBearing,
                transitionDuration: 0
            }
        });
        requestAnimationFrame(() => this.rotateMap());
    }

    toggleRotation() {
        this.isRotating = !this.isRotating;
        if (this.isRotating) {
            requestAnimationFrame(() => this.rotateMap());
            document.getElementById('rotate-play').classList.add('hidden');
            document.getElementById('rotate-stop').classList.remove('hidden');
        } else {
            document.getElementById('rotate-play').classList.remove('hidden');
            document.getElementById('rotate-stop').classList.add('hidden');
        }
    }

    hideInfoCard() {
        const card = document.getElementById('info-card');
        card.classList.add('hidden');
        this.selectedFeature = null;
        this.updateLayers();
    }

    selectContainer(containerId) {
        if (this.selectedContainer) {
            document.getElementById(this.selectedContainer + '-container').classList.remove('selected');
        }
        const newSelectedContainer = document.getElementById(containerId + '-container');
        newSelectedContainer.classList.add('selected');
        this.selectedContainer = containerId;
        this.updateLayers();
    }
}

class MapVisualizationDebug {
    
    constructor(busID, startDate, endDate) {
        this.center = [-99.1332, 19.4326];
        this.zoom = 11;
        this.busID = busID;
        this.startDate = startDate;
        this.endDate = endDate;

        this.initialize();
    }

    initialize() {
        mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';
    
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/vidriloco/clx4dzh6902so01qphb9efd0f',
            center: this.center,
            zoom: this.zoom,
        });

        this.map.on('style.load', this.mapStyleDidLoad);
    }

    mapStyleDidLoad = () => { 
        this.fetchDebugData();
        this.registerCircleLayerEvents();
    }
    
    registerCircleLayerEvents() {
        this.map.on('click', (e) => {
            const center = [e.lngLat.lng, e.lngLat.lat];
            const radius = 50;
            const options = { steps: 64, units: 'meters' };
            const circle = turf.circle(center, radius, options);

            if (this.map.getSource('circle')) {
                this.map.getSource('circle').setData(circle);
            } else {
                this.map.addSource('circle', {
                    type: 'geojson',
                    data: circle
                });

                this.map.addLayer({
                    id: 'circle-layer',
                    type: 'fill',
                    source: 'circle',
                    paint: {
                    'fill-color': '#00f',
                    'fill-opacity': 0.5
                    }
                });
            }
        });
    }

    fetchDebugData() {
        document.getElementById('loading-indicator').style.display = 'flex';
        fetch('/api/vehicles/trails/date/' + this.startDate + '/' + this.endDate + '/' + this.busID + '/debug')
            .then(response => response.text())
            .then(data => {

                this.data = JSON.parse(data);

                this.data.collection.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((item, index) => {
                    const marker = new mapboxgl.Marker({ color: item.is_intrapolated ? 'red' : 'blue' })
                        .setLngLat(item.coordinates)
                        .addTo(this.map);

                    const popup = new mapboxgl.Popup({ offset: 25 }).setText(index + ": " + item.date);

                    marker.getElement().addEventListener('mouseenter', () => popup.addTo(this.map).setLngLat(item.coordinates));
                    marker.getElement().addEventListener('mouseleave', () => popup.remove());

                    // Add text below the marker with the index
                    const markerElement = marker.getElement();
                    const indexLabel = document.createElement('div');
                    indexLabel.style.color = 'black';
                    indexLabel.style.fontSize = '12px';
                    indexLabel.style.textAlign = 'center';
                    indexLabel.textContent = index;
                    markerElement.appendChild(indexLabel);
                });

                this.map.addLayer({
                    id: `path`,
                    type: 'line',
                    source: {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            geometry: {
                                type: 'MultiLineString',
                                coordinates: this.data.trail
                            }
                        }
                    },
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#888',
                        'line-width': 4
                    }
                });
                this.data.trail.forEach((line, lineIndex) => {
                    line.forEach((coord, coordIndex) => {
                        const marker = new mapboxgl.Marker({ color: 'green', scale: 0.7 })
                            .setLngLat(coord)
                        marker.addTo(this.map);

                        const popup = new mapboxgl.Popup({ offset: 25 }).setText(`Line ${lineIndex}, Point ${coordIndex}`);
                        
                        marker.getElement().addEventListener('mouseenter', () => popup.addTo(this.map).setLngLat(coord));
                        marker.getElement().addEventListener('mouseleave', () => popup.remove());
                    });
                });

                document.getElementById('loading-indicator').style.display = 'none';
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                document.getElementById('loading-indicator').style.display = 'none';
            });
    }
}