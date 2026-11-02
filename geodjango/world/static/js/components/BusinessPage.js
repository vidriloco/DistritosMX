// BusinessPage - /negocios in the "barra + inspector" layout of /explorar.
//
// One point, one radius, up to three giros. The address lives in the top
// bar's search, the radius in its chips, the giros as chips over the map
// (switching one off hides its establishments, as the transport chips do on
// /explorar), and the inspector on the right reads as a report.
//
// The URL keeps the whole state, with the keys the old wizard used so that
// links already shared keep working: /negocios/stats?c=lat,lng&r=350&i=code,code

const NB_RADII = [100, 350, 800];
const NB_COLORS = ['#2456B5', '#C2410C', '#6B6B68'];
const NB_MAX_GIROS = 3;
const NB_MOBILE = '(max-width: 768px)';
const NB_SOURCE_RADIUS = 'nb-radius';
const NB_SOURCE_POINTS = 'nb-points';
const NB_LAYER_FILL = 'nb-radius-fill';
const NB_LAYER_LINE = 'nb-radius-line';
const NB_LAYER_POINTS = 'nb-points';
const NB_SOURCE_HAZARDS = 'nb-hazards';
const NB_LAYER_HAZARD_LINES = 'nb-hazard-lines';
const NB_LAYER_HAZARD_POINTS = 'nb-hazard-points';

// The Terreno y clima features the map can draw: points as coloured rings, so
// they never pass for businesses (filled dots), and lines dashed.
const NB_HAZARDS = {
    waterlogging: { label: 'Encharcamientos', one: 'Encharcamiento reportado', color: '#0E7490', line: false },
    sinkholes: { label: 'Socavones', one: 'Socavón', color: '#7C2D12', line: false },
    mines: { label: 'Minas antiguas', one: 'Mina antigua', color: '#6D28D9', line: false },
    fractures: { label: 'Fracturas', one: 'Fractura en el terreno', color: '#B45309', line: true },
    faults: { label: 'Fallas geológicas', one: 'Falla geológica', color: '#991B1B', line: true }
};
const nbHazardColor = ['match', ['get', 'kind']]
    .concat(Object.entries(NB_HAZARDS).flatMap(([kind, h]) => [kind, h.color]))
    .concat(['#6B6B68']);

const nbParseUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    const r = parseInt(params.get('r'), 10);
    const i = params.get('i');
    let point = null;
    if (c) {
        const [lat, lng] = c.split(',').map((v) => parseFloat(v.trim()));
        if (!isNaN(lat) && !isNaN(lng)) point = { lat, lng };
    }
    return {
        point,
        radius: NB_RADII.includes(r) ? r : (point && r > 0 ? r : NB_RADII[1]),
        codes: i ? i.split(',').map((s) => s.trim()).filter(Boolean) : []
    };
};

const nbBuildUrl = (point, radius, codes) => {
    if (!point || codes.length === 0) return '/negocios';
    return '/negocios/stats?c=' + point.lat.toFixed(6) + ',' + point.lng.toFixed(6) +
        '&r=' + radius + '&i=' + codes.join(',');
};

// The zone reports opened in this browser, newest first, so the empty
// inspector can offer them again. Browser storage only: a convenience that
// may be missing (private windows) and is never sent anywhere.
const NB_RECENT_KEY = 'negocios.recent';
const NB_RECENT_MAX = 8;
const nbReadRecent = () => {
    try {
        const list = JSON.parse(window.localStorage.getItem(NB_RECENT_KEY) || '[]');
        return Array.isArray(list) ? list : [];
    } catch (error) {
        return [];
    }
};
const nbWriteRecent = (list) => {
    try { window.localStorage.setItem(NB_RECENT_KEY, JSON.stringify(list)); } catch (error) { /* storage off */ }
};
// One entry per place and giros; trying another radius updates it.
const nbRecentKey = (entry) => [entry.lat.toFixed(5), entry.lng.toFixed(5),
    entry.giros.map((g) => g.codigo_act).sort().join(',')].join('|');

// Runs `fn` with the map once its style is in; false when there is no map yet.
// isStyleLoaded() is also false while tiles stream in, long after 'load' has
// fired, so the wait is for the next 'idle', which always comes.
const nbWithMap = (fn) => {
    const map = window.map;
    if (!map) return false;
    if (map.isStyleLoaded()) fn(map);
    else map.once('idle', () => fn(map));
    return true;
};

const nbReverseGeocode = async (point) => {
    try {
        const response = await fetch(
            'https://nominatim.openstreetmap.org/reverse?lat=' + point.lat + '&lon=' + point.lng +
            '&format=json&addressdetails=1&accept-language=es'
        );
        if (!response.ok) return null;
        const result = await response.json();
        return window.nbShortAddress ? nbShortAddress(result) : (result.display_name || null);
    } catch (error) {
        return null;
    }
};

// What the Entorno section shows, summed over the AGEBs the radius touches.
const nbAggregateZones = (zones) => {
    const agg = { zones: zones.length, population: 0, housingInternet: 0, housingNoInternet: 0, businessThefts: 0, thefts: 0, stations: 0, stationNames: '' };
    const systems = {};
    const names = {
        metro_stations: 'Metro', metrobus_stations: 'Metrobús', rtp_stations: 'RTP', cablebus_stations: 'Cablebús',
        ecobici_stations: 'Ecobici', tren_ligero_stations: 'Tren Ligero', tren_suburbano_stations: 'Suburbano',
        mexibus_stations: 'Mexibús', mexicable_stations: 'Mexicable', tren_interurbano_stations: 'Interurbano',
        concesionados_stations: 'Concesionados'
    };
    zones.forEach((zone) => {
        agg.population += zone.population || 0;
        agg.housingInternet += zone.housing_with_internet || 0;
        agg.housingNoInternet += zone.housing_without_internet || 0;
        agg.businessThefts += zone.business_thefts_2022 || 0;
        agg.thefts += zone.thefts_2022 || 0;
        Object.keys(zone).forEach((key) => {
            if (!key.endsWith('_stations') || typeof zone[key] !== 'number') return;
            agg.stations += zone[key];
            if (zone[key] > 0) systems[names[key] || key] = true;
        });
    });
    agg.stationNames = Object.keys(systems).slice(0, 3).join(', ');
    return agg;
};

function useNbMedia(query) {
    const [matches, setMatches] = React.useState(() => window.matchMedia(query).matches);
    React.useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = (e) => setMatches(e.matches);
        if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
        return () => { if (mq.removeEventListener) mq.removeEventListener('change', onChange); else mq.removeListener(onChange); };
    }, [query]);
    return matches;
}

function BusinessGiroChips({ giros, maxGiros, onToggle, onAdd, categoryStats, className }) {
    return (
        <div className={className} role="group" aria-label="Giros">
            {giros.map((giro) => {
                const row = categoryStats && categoryStats[giro.codigo_act];
                return (
                    <button
                        key={giro.codigo_act}
                        type="button"
                        className={'xb-chip' + (giro.visible ? ' is-active' : ' is-off')}
                        aria-pressed={giro.visible}
                        onClick={() => onToggle(giro)}
                        title={giro.visible ? 'Ocultar en el mapa' : 'Mostrar en el mapa'}
                    >
                        <span className="nb-chip-dot" aria-hidden="true" style={{ background: giro.color }}></span>
                        {nbShortGiro(giro.nombre_act)}
                        {row ? <span className="nb-chip-count">{row.count}</span> : null}
                    </button>
                );
            })}
            {giros.length < maxGiros && (
                <button type="button" className="xb-chip nb-chip-add" onClick={onAdd}>
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    {giros.length === 0 ? 'Elegir giro' : 'Añadir giro'}
                </button>
            )}
        </div>
    );
}

// DENUE names run long ("Restaurantes con servicio de preparación de…"); the
// chip keeps the head of the name and the report row keeps all of it.
function nbShortGiro(name) {
    if (!name) return '';
    const cut = name.split(/ con | de | y | para /i)[0].trim();
    return cut.length >= 4 ? cut : name;
}

function BusinessPage() {
    const initial = React.useRef(nbParseUrl()).current;
    const [point, setPoint] = React.useState(initial.point);
    const [address, setAddress] = React.useState('');
    const [radius, setRadius] = React.useState(initial.radius);
    const [giros, setGiros] = React.useState([]);
    const pendingCodes = React.useRef(initial.codes);
    const [stats, setStats] = React.useState(null);
    const [statsLoading, setStatsLoading] = React.useState(false);
    const [statsError, setStatsError] = React.useState(null);
    const [indicators, setIndicators] = React.useState(null);
    const [indicatorsLoading, setIndicatorsLoading] = React.useState(false);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [showHelp, setShowHelp] = React.useState(false);
    const [hazardsOn, setHazardsOn] = React.useState(false);
    const [hazards, setHazards] = React.useState(null);
    const [recent, setRecent] = React.useState(nbReadRecent);
    const isMobile = useNbMedia(NB_MOBILE);
    const markerRef = React.useRef(null);
    const popupRef = React.useRef(null);
    const choosePointRef = React.useRef(null);

    const { categoriesData, categoriesLoading } = useBusinessCategories(true);

    const codes = giros.map((g) => g.codigo_act);
    const codesKey = codes.join(',');
    const visibleCodes = giros.filter((g) => g.visible).map((g) => g.codigo_act);
    const visibleKey = visibleCodes.join(',');

    // ---- point -------------------------------------------------------------
    const choosePoint = React.useCallback((next, knownAddress) => {
        setPoint({ lat: next.lat, lng: next.lng });
        setAddress(knownAddress || '');
        if (window.analyticsService) window.analyticsService.track('USER_SELECTED_LOCATION', { coordinates: next });
        if (!knownAddress) {
            nbReverseGeocode(next).then((found) => {
                // Only if the point has not moved on in the meantime.
                setPoint((current) => {
                    if (current && current.lat === next.lat && current.lng === next.lng && found) setAddress(found);
                    return current;
                });
            });
        }
    }, []);
    choosePointRef.current = choosePoint;

    // The address of a point that came in through the URL.
    React.useEffect(() => {
        if (initial.point) nbReverseGeocode(initial.point).then((found) => { if (found) setAddress((a) => a || found); });
    }, []);

    const useMyLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => choosePoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }, null),
            () => {},
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    const reset = () => {
        setPoint(null);
        setAddress('');
        setStats(null);
        setIndicators(null);
        setPickerOpen(false);
    };

    // ---- giros -------------------------------------------------------------
    React.useEffect(() => {
        if (!categoriesData || pendingCodes.current.length === 0) return;
        const found = pendingCodes.current
            .map((code) => categoriesData.find((c) => c.codigo_act === code))
            .filter(Boolean)
            .slice(0, NB_MAX_GIROS)
            .map((c, index) => ({ codigo_act: c.codigo_act, nombre_act: c.nombre_act, color: NB_COLORS[index], visible: true }));
        pendingCodes.current = [];
        setGiros(found);
    }, [categoriesData]);

    const addGiro = (category) => {
        setGiros((current) => {
            if (current.length >= NB_MAX_GIROS || current.some((g) => g.codigo_act === category.codigo_act)) return current;
            const used = current.map((g) => g.color);
            const color = NB_COLORS.find((c) => !used.includes(c)) || NB_COLORS[0];
            return current.concat([{ codigo_act: category.codigo_act, nombre_act: category.nombre_act, color: color, visible: true }]);
        });
        if (window.analyticsService) window.analyticsService.track('USER_SELECTED_CATEGORIES', { category: category.codigo_act });
    };
    const removeGiro = (giro) => setGiros((current) => current.filter((g) => g.codigo_act !== giro.codigo_act));
    const toggleGiro = (giro) => setGiros((current) => current.map((g) => g.codigo_act === giro.codigo_act ? { ...g, visible: !g.visible } : g));

    const changeRadius = (value) => {
        setRadius(value);
        if (window.analyticsService) window.analyticsService.track('USER_SELECTED_RADIUS', { radius: value });
    };

    // ---- recent reports ----------------------------------------------------
    // A report joins the list once its numbers are in; the address, which
    // arrives on its own, fills in when it comes.
    React.useEffect(() => {
        if (!point || giros.length === 0 || !stats || !stats.summary) return;
        // Numbers still from the previous point or radius: wait for the new ones.
        const at = stats.summary.coordinates || {};
        if (Math.abs(at.lat - point.lat) > 1e-6 || Math.abs(at.lng - point.lng) > 1e-6 || stats.summary.radius_meters !== radius) return;
        setRecent((current) => {
            const entry = {
                lat: point.lat,
                lng: point.lng,
                radius: radius,
                giros: giros.map((g) => ({ codigo_act: g.codigo_act, nombre_act: g.nombre_act })),
                total: stats.summary.total_businesses,
                at: Date.now()
            };
            const key = nbRecentKey(entry);
            const previous = current.find((e) => nbRecentKey(e) === key);
            entry.address = address || (previous && previous.address) || '';
            const next = [entry].concat(current.filter((e) => nbRecentKey(e) !== key)).slice(0, NB_RECENT_MAX);
            nbWriteRecent(next);
            return next;
        });
    }, [stats, address]);

    const openRecent = (entry) => {
        choosePoint({ lat: entry.lat, lng: entry.lng }, entry.address || null);
        setRadius(entry.radius);
        setGiros(entry.giros.slice(0, NB_MAX_GIROS).map((g, index) => ({ ...g, color: NB_COLORS[index], visible: true })));
        setPickerOpen(false);
    };
    const forgetRecent = () => {
        nbWriteRecent([]);
        setRecent([]);
    };

    // ---- URL ---------------------------------------------------------------
    React.useEffect(() => {
        const wanted = nbBuildUrl(point, radius, codes);
        if (window.location.pathname + window.location.search !== wanted) window.history.replaceState({}, '', wanted);
    }, [point && point.lat, point && point.lng, radius, codesKey]);

    // ---- data --------------------------------------------------------------
    React.useEffect(() => {
        if (!point || codes.length === 0) { setStats(null); setStatsError(null); return; }
        let cancelled = false;
        setStatsLoading(true);
        setStatsError(null);
        fetch('/api/business/location/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selected_codes: codes, coordinates: point, radius: radius })
        })
            .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
            .then(({ ok, j }) => {
                if (cancelled) return;
                if (!ok || j.status !== 'success') throw new Error(j.message || 'error ' + (j.error_code || ''));
                setStats(j.data);
                if (window.analyticsService) window.analyticsService.track('USER_SEEING_STATS', { coordinates: point, radius: radius, categories: codes, total: j.data.summary.total_businesses });
            })
            .catch((error) => { if (!cancelled) { setStats(null); setStatsError(error.message); } })
            .finally(() => { if (!cancelled) setStatsLoading(false); });
        return () => { cancelled = true; };
    }, [point && point.lat, point && point.lng, radius, codesKey]);

    React.useEffect(() => {
        if (!point) { setIndicators(null); return; }
        let cancelled = false;
        setIndicatorsLoading(true);
        fetch('/api/business/indicators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates: point, radius: radius })
        })
            .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
            .then(({ ok, j }) => {
                if (cancelled) return;
                if (!ok || j.status !== 'success') throw new Error(j.message || 'error');
                setIndicators(nbAggregateZones(j.data.geozones || []));
            })
            .catch(() => { if (!cancelled) setIndicators(nbAggregateZones([])); })
            .finally(() => { if (!cancelled) setIndicatorsLoading(false); });
        return () => { cancelled = true; };
    }, [point && point.lat, point && point.lng, radius]);

    // ---- map: pin and radius ------------------------------------------------
    React.useEffect(() => {
        if (!point) {
            nbWithMap((map) => {
                [NB_LAYER_FILL, NB_LAYER_LINE].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
                if (map.getSource(NB_SOURCE_RADIUS)) map.removeSource(NB_SOURCE_RADIUS);
            });
            if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
            return;
        }
        nbWithMap((map) => {
            if (!markerRef.current) {
                const el = document.createElement('div');
                el.className = 'nb-pin';
                el.setAttribute('aria-label', 'Tu punto, arrástralo para moverlo');
                // The marker needs its position before it joins the map: Mapbox
                // projects it on addTo, and an unplaced marker throws there.
                markerRef.current = new mapboxgl.Marker({ element: el, draggable: true, anchor: 'center' })
                    .setLngLat([point.lng, point.lat])
                    .addTo(map);
                markerRef.current.on('dragend', () => {
                    const ll = markerRef.current.getLngLat();
                    choosePointRef.current({ lat: ll.lat, lng: ll.lng }, null);
                });
            }
            markerRef.current.setLngLat([point.lng, point.lat]);

            const circle = turf.circle([point.lng, point.lat], radius / 1000, { steps: 96, units: 'kilometers' });
            if (map.getSource(NB_SOURCE_RADIUS)) {
                map.getSource(NB_SOURCE_RADIUS).setData(circle);
            } else {
                map.addSource(NB_SOURCE_RADIUS, { type: 'geojson', data: circle });
                map.addLayer({ id: NB_LAYER_FILL, type: 'fill', source: NB_SOURCE_RADIUS, paint: { 'fill-color': '#111111', 'fill-opacity': 0.04 } });
                map.addLayer({ id: NB_LAYER_LINE, type: 'line', source: NB_SOURCE_RADIUS, paint: { 'line-color': '#111111', 'line-width': 1.5 } });
            }
            // The points layer, when it exists, goes above the ring.
            if (map.getLayer(NB_LAYER_POINTS)) map.moveLayer(NB_LAYER_POINTS);

            // On a phone the first point grows the sheet and shrinks the map in
            // the same render; Mapbox has to know its new size before it fits,
            // or the ring is centred for the old, taller map.
            map.resize();
            map.fitBounds(turf.bbox(circle), { padding: isMobile ? 40 : 70, maxZoom: 17, duration: 600 });
        });
    }, [point && point.lat, point && point.lng, radius]);

    // ---- map: establishments ------------------------------------------------
    React.useEffect(() => {
        nbWithMap((map) => {
            const features = (stats && stats.records ? stats.records : []).map((record) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [record.geometry.lng, record.geometry.lat] },
                properties: {
                    id: record.id,
                    name: record.nom_estab || 'Sin nombre',
                    code: record.codigo_act,
                    categoryName: record.nombre_act,
                    staff: record.per_ocu || '',
                    address: [record.nomb_asent, record.municipio].filter(Boolean).join(', ')
                }
            }));
            const data = { type: 'FeatureCollection', features: features };
            const colorExpr = giros.length > 0
                ? ['match', ['get', 'code']].concat(giros.flatMap((g) => [g.codigo_act, g.color])).concat(['#6B6B68'])
                : '#6B6B68';

            if (map.getSource(NB_SOURCE_POINTS)) {
                map.getSource(NB_SOURCE_POINTS).setData(data);
                map.setPaintProperty(NB_LAYER_POINTS, 'circle-color', colorExpr);
            } else {
                map.addSource(NB_SOURCE_POINTS, { type: 'geojson', data: data });
                map.addLayer({
                    id: NB_LAYER_POINTS,
                    type: 'circle',
                    source: NB_SOURCE_POINTS,
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 15, 6, 18, 9],
                        'circle-color': colorExpr,
                        'circle-stroke-color': '#FFFFFF',
                        'circle-stroke-width': 2
                    }
                });
                map.on('mouseenter', NB_LAYER_POINTS, (e) => {
                    map.getCanvas().style.cursor = 'pointer';
                    const f = e.features && e.features[0];
                    if (!f) return;
                    const p = f.properties;
                    const html = '<span class="nb-popup-name">' + nbEscape(p.name) + '</span>' +
                        '<span class="nb-popup-sub">' + nbEscape(p.categoryName) + (p.staff ? ' · ' + nbEscape(p.staff) : '') + '</span>' +
                        (p.address ? '<span class="nb-popup-sub">' + nbEscape(p.address) + '</span>' : '');
                    if (popupRef.current) popupRef.current.remove();
                    popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: 'nb-popup', anchor: 'bottom', offset: 8 })
                        .setLngLat(f.geometry.coordinates.slice())
                        .setHTML(html)
                        .addTo(map);
                });
                map.on('mouseleave', NB_LAYER_POINTS, () => {
                    map.getCanvas().style.cursor = '';
                    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
                });
            }
            map.setFilter(NB_LAYER_POINTS, visibleCodes.length > 0 ? ['in', ['get', 'code'], ['literal', visibleCodes]] : ['==', ['get', 'code'], '']);
        });
    }, [stats, codesKey, visibleKey]);

    // ---- map: Terreno y clima ------------------------------------------------
    // Fetched only while the layer is on, for the current point and radius.
    React.useEffect(() => {
        if (!hazardsOn || !point) { setHazards(null); return undefined; }
        let current = true;
        fetch('/api/business/location/hazards?lng=' + point.lng + '&lat=' + point.lat + '&radius=' + radius)
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => { if (current) setHazards(data); })
            .catch(() => { if (current) setHazards(null); });
        return () => { current = false; };
    }, [hazardsOn, point && point.lat, point && point.lng, radius]);

    React.useEffect(() => {
        nbWithMap((map) => {
            const data = hazards || { type: 'FeatureCollection', features: [] };
            if (map.getSource(NB_SOURCE_HAZARDS)) {
                map.getSource(NB_SOURCE_HAZARDS).setData(data);
                return;
            }
            if (!hazards) return;
            map.addSource(NB_SOURCE_HAZARDS, { type: 'geojson', data: data });
            // Under the establishments, which stay the subject of the map.
            const before = map.getLayer(NB_LAYER_POINTS) ? NB_LAYER_POINTS : undefined;
            map.addLayer({
                id: NB_LAYER_HAZARD_LINES,
                type: 'line',
                source: NB_SOURCE_HAZARDS,
                filter: ['in', ['get', 'kind'], ['literal', ['fractures', 'faults']]],
                paint: {
                    'line-color': nbHazardColor,
                    'line-width': ['match', ['get', 'kind'], 'faults', 3, 1.5],
                    'line-dasharray': [2, 1.5],
                    'line-opacity': 0.9
                }
            }, before);
            map.addLayer({
                id: NB_LAYER_HAZARD_POINTS,
                type: 'circle',
                source: NB_SOURCE_HAZARDS,
                filter: ['==', ['geometry-type'], 'Point'],
                paint: {
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 15, 5, 18, 8],
                    'circle-color': '#FFFFFF',
                    'circle-opacity': 0.85,
                    'circle-stroke-color': nbHazardColor,
                    'circle-stroke-width': 2.5
                }
            }, before);
            const show = (e) => {
                const f = e.features && e.features[0];
                if (!f) return;
                const p = f.properties;
                const h = NB_HAZARDS[p.kind] || {};
                const html = '<span class="nb-popup-name">' + nbEscape(h.one || p.kind) + '</span>' +
                    ((p.year || p.name) ? '<span class="nb-popup-sub">' + nbEscape(p.year ? 'Reportado en ' + p.year : p.name) + '</span>' : '');
                if (popupRef.current) popupRef.current.remove();
                popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: 'nb-popup', anchor: 'bottom', offset: 8 })
                    .setLngLat(f.geometry.type === 'Point' ? f.geometry.coordinates.slice() : e.lngLat)
                    .setHTML(html)
                    .addTo(map);
            };
            const hide = () => {
                map.getCanvas().style.cursor = '';
                if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
            };
            [NB_LAYER_HAZARD_POINTS, NB_LAYER_HAZARD_LINES].forEach((id) => {
                map.on('mouseenter', id, (e) => { map.getCanvas().style.cursor = 'pointer'; show(e); });
                map.on('mouseleave', id, hide);
                map.on('click', id, show);   // phones have no hover
            });
        });
    }, [hazards]);

    // What the legend lists: the kinds found, with how many.
    const hazardCounts = React.useMemo(() => {
        const counts = {};
        ((hazards && hazards.features) || []).forEach((f) => { counts[f.properties.kind] = (counts[f.properties.kind] || 0) + 1; });
        return counts;
    }, [hazards]);

    // ---- map: a click on the map places the pin -----------------------------
    React.useEffect(() => {
        let map = null;
        const onClick = (e) => {
            // A click on an establishment or a hazard opens its card instead.
            const layers = [NB_LAYER_POINTS, NB_LAYER_HAZARD_POINTS, NB_LAYER_HAZARD_LINES].filter((id) => map.getLayer(id));
            if (layers.length && map.queryRenderedFeatures(e.point, { layers: layers }).length > 0) return;
            choosePointRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }, null);
        };
        nbWithMap((m) => { map = m; map.on('click', onClick); });
        return () => {
            if (!map) return;
            map.off('click', onClick);
            try {
                [NB_LAYER_POINTS, NB_LAYER_HAZARD_POINTS, NB_LAYER_HAZARD_LINES, NB_LAYER_FILL, NB_LAYER_LINE].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
                [NB_SOURCE_POINTS, NB_SOURCE_HAZARDS, NB_SOURCE_RADIUS].forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
            } catch (error) { /* the map may already be gone */ }
            if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
            if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
        };
    }, []);

    const MapAdminAppComponent = window.MapAdminApp || (() => null);
    const HelpPanel = window.ContextualHelpPanel || (() => null);

    const chips = (className) => (
        <BusinessGiroChips
            className={className}
            giros={giros}
            maxGiros={NB_MAX_GIROS}
            categoryStats={stats && stats.category_stats}
            onToggle={toggleGiro}
            onAdd={() => { if (!point) setPickerOpen(false); else setPickerOpen(true); }}
        />
    );

    return (
        <div className="xb-layout nb-page">
            <MapAdminAppComponent
                hideTopNavigation={true}
                hideVerticalPanel={true}
                hideLoadingModal={true}
                onHelpClick={() => setShowHelp((v) => !v)}
            />

            <BusinessTopBar
                address={address}
                hasPoint={!!point}
                radii={NB_RADII}
                radius={radius}
                onRadiusChange={changeRadius}
                onPlaceSelect={(place) => choosePoint({ lat: place.lat, lng: place.lng }, place.address)}
                onUseMyLocation={useMyLocation}
                onClear={reset}
                onHelpClick={() => setShowHelp((v) => !v)}
            />

            {point && !isMobile && chips('nb-chips')}

            {point && hazards && (
                <div className="nb-map-legend" aria-label="Terreno y clima en el mapa">
                    <div className="nb-map-legend-head">
                        <span>Terreno y clima</span>
                        <button type="button" className="nb-map-legend-close" onClick={() => setHazardsOn(false)} aria-label="Quitar del mapa">
                            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                    </div>
                    {Object.keys(hazardCounts).length === 0 ? (
                        <span className="nb-map-legend-empty">Nada registrado en el radio.</span>
                    ) : Object.entries(NB_HAZARDS).filter(([kind]) => hazardCounts[kind]).map(([kind, h]) => (
                        <div key={kind} className="nb-map-legend-row">
                            <span className={'nb-map-legend-mark' + (h.line ? ' is-line' : '')} style={{ borderColor: h.color }}></span>
                            <span>{h.label}</span>
                            <span className="nb-map-legend-count">{h.line ? '' : hazardCounts[kind]}</span>
                        </div>
                    ))}
                </div>
            )}

            <BusinessInspector
                point={point}
                address={address}
                radius={radius}
                radii={NB_RADII}
                onRadiusChange={changeRadius}
                giros={giros}
                maxGiros={NB_MAX_GIROS}
                stats={stats}
                statsLoading={statsLoading}
                statsError={statsError}
                indicators={indicators}
                indicatorsLoading={indicatorsLoading}
                categoriesData={categoriesData}
                categoriesLoading={categoriesLoading}
                pickerOpen={pickerOpen}
                onPickerOpen={() => setPickerOpen(true)}
                onPickerClose={() => setPickerOpen(false)}
                onAddGiro={addGiro}
                onRemoveGiro={removeGiro}
                onReset={reset}
                isMobile={isMobile}
                recent={recent}
                onOpenRecent={openRecent}
                onForgetRecent={forgetRecent}
                hazardsOn={hazardsOn}
                onHazardsToggle={() => setHazardsOn((on) => !on)}
                chipsSlot={point && isMobile ? chips('nb-sheet-chips') : null}
            />

            <HelpPanel
                isVisible={showHelp}
                onClose={() => setShowHelp(false)}
                routeType="negocios"
                cookieName="businessHelpPanelSeen"
            />
        </div>
    );
}

function nbEscape(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

window.BusinessPage = BusinessPage;
