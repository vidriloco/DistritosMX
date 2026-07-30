/**
 * Despojo Player Panel
 *
 * Drives the proyectos/mapas/despojos-viviendas map: a ten-year player over
 * carpetas de investigación por despojo (FGJ CDMX), readable two ways — every
 * carpeta as a point, or the year grouped into alcaldías as a choropleth.
 *
 * Talks to the map through window events rather than props, matching the
 * convention used by TouristViewerPanel / VisualizationPlayer:
 *   emits  despojoYearChanged      -> MapAdminApp filters the active layer
 *   emits  despojoViewChanged      -> MapAdminApp swaps points <-> alcaldías
 *   emits  despojoBoroughSelected  -> MapAdminApp outlines one alcaldía
 *   listens despojoPointsLoaded    <- MapAdminApp, once the GeoJSON is in
 *   listens despojoBoroughPicked   <- MapAdminApp, when a polygon is clicked
 */

// Sequential ramp for the choropleth: one hue — the project's seal — with
// evenly spaced lightness in OKLab, so the visual distance between classes is
// the same all the way up. Shared with the map layer through this global.
window.DESPOJO_RAMP = ['#ffefef', '#eeb9b8', '#d58586', '#b85257', '#98122b'];
// Zero carpetas is not "almost none": it gets a neutral, off the ramp.
window.DESPOJO_RAMP_EMPTY = '#dfe1dc';

function DespojoPlayerPanel() {
    const [summary, setSummary] = React.useState(null);
    const [boroughs, setBoroughs] = React.useState(null);
    const [year, setYear] = React.useState(null);
    const [playing, setPlaying] = React.useState(false);
    const [pointsReady, setPointsReady] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [noteOpen, setNoteOpen] = React.useState(false);
    const [view, setView] = React.useState('points');
    const [measure, setMeasure] = React.useState('absolute');
    const [selected, setSelected] = React.useState(null);
    const [rankingOpen, setRankingOpen] = React.useState(false);
    // ---- "cerca de mí" ----
    const [near, setNear] = React.useState(false);
    const [nearPoint, setNearPoint] = React.useState(null);
    const [nearLabel, setNearLabel] = React.useState('');
    const [nearRadius, setNearRadius] = React.useState(500);
    const [nearYears, setNearYears] = React.useState([]);
    const [nearResults, setNearResults] = React.useState(null);
    const [query, setQuery] = React.useState('');
    const [suggestions, setSuggestions] = React.useState([]);
    const [locating, setLocating] = React.useState(false);
    const [nearNote, setNearNote] = React.useState('');
    const skipLookup = React.useRef(false);

    // ---- data ----------------------------------------------------------
    React.useEffect(() => {
        let cancelled = false;
        fetch('/api/despojos/summary')
            .then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(data => {
                if (cancelled) return;
                setSummary(data);
                // Open on the most recent complete year: the last year is
                // usually a partial cut and would read as a sudden drop.
                const decade = data.decade || [];
                const complete = decade.filter(y => !(data.partial || {})[y]);
                setYear(complete.length ? complete[complete.length - 1] : decade[decade.length - 1]);
            })
            .catch(err => {
                if (!cancelled) setError(err.message);
            });
        return () => { cancelled = true; };
    }, []);

    // The whole decade by alcaldía is 160 numbers, so it is fetched once and
    // the player switches years without a round trip. A failure here only
    // costs the alcaldía view; the points view carries on.
    React.useEffect(() => {
        let cancelled = false;
        fetch('/api/despojos/by-borough')
            .then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(data => { if (!cancelled) setBoroughs(data); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    React.useEffect(() => {
        const onLoaded = () => setPointsReady(true);
        window.addEventListener('despojoPointsLoaded', onLoaded);
        if (window.despojoPointsLoaded) setPointsReady(true);
        return () => window.removeEventListener('despojoPointsLoaded', onLoaded);
    }, []);

    // Tell the map which year to show.
    React.useEffect(() => {
        if (year == null) return;
        window.dispatchEvent(new CustomEvent('despojoYearChanged', { detail: year }));
    }, [year]);

    // ...and which way to draw it.
    React.useEffect(() => {
        window.dispatchEvent(new CustomEvent('despojoViewChanged', {
            detail: { view: view, measure: measure }
        }));
    }, [view, measure]);

    React.useEffect(() => {
        window.dispatchEvent(new CustomEvent('despojoBoroughSelected', { detail: selected }));
    }, [selected]);

    // Clicking a polygon is the same action as clicking a row in the ranking.
    React.useEffect(() => {
        const onPicked = (event) => {
            const code = event.detail;
            setPlaying(false);
            setSelected(prev => (prev === code ? null : code));
        };
        window.addEventListener('despojoBoroughPicked', onPicked);
        return () => window.removeEventListener('despojoBoroughPicked', onPicked);
    }, []);

    // Selecting an alcaldía only means something in the alcaldía view.
    React.useEffect(() => {
        if (view === 'points') setSelected(null);
    }, [view]);

    // ---- "cerca de mí" wiring -------------------------------------------
    React.useEffect(() => {
        window.dispatchEvent(new CustomEvent('despojoNearChanged', {
            detail: near
                ? { active: true, point: nearPoint, radius: nearRadius, years: nearYears }
                : { active: false }
        }));
    }, [near, nearPoint, nearRadius, nearYears]);

    React.useEffect(() => {
        const onResults = (event) => setNearResults(event.detail);
        const onPicked = (event) => {
            setNearPoint({ lng: event.detail.lng, lat: event.detail.lat });
            setNearLabel('');
            setNearNote('');
        };
        window.addEventListener('despojoNearResults', onResults);
        window.addEventListener('despojoNearPointPicked', onPicked);
        return () => {
            window.removeEventListener('despojoNearResults', onResults);
            window.removeEventListener('despojoNearPointPicked', onPicked);
        };
    }, []);

    // Forward geocoding for the address box, biased to CDMX. Debounced: the
    // reader is typing, not asking for a lookup on every keystroke.
    React.useEffect(() => {
        const term = query.trim();
        // Picking a suggestion writes its own label into the box; looking that
        // label up again would reopen the list the reader just dismissed.
        if (skipLookup.current) { skipLookup.current = false; setSuggestions([]); return; }
        if (!near || term.length < 4) { setSuggestions([]); return; }
        let cancelled = false;
        const timer = setTimeout(() => {
            const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
                encodeURIComponent(term) + '.json' +
                '?access_token=' + mapboxgl.accessToken +
                '&country=mx&language=es&limit=5&proximity=-99.13,19.43' +
                '&types=address,neighborhood,postcode,poi,locality';
            fetch(url)
                .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
                .then(data => {
                    if (cancelled) return;
                    setSuggestions((data.features || []).map(f => ({
                        id: f.id,
                        label: f.place_name_es || f.place_name,
                        lng: f.center[0],
                        lat: f.center[1]
                    })));
                })
                .catch(() => { if (!cancelled) setSuggestions([]); });
        }, 320);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [query, near]);

    // ---- playback ------------------------------------------------------
    const decade = (summary && summary.decade) || [];

    React.useEffect(() => {
        if (!playing || decade.length === 0) return;
        const id = setInterval(() => {
            setYear(prev => {
                const i = decade.indexOf(prev);
                return decade[(i + 1) % decade.length];
            });
        }, 950);
        return () => clearInterval(id);
    }, [playing, decade]);

    // ---- derived -------------------------------------------------------
    const cityByYear = (summary && summary.byYear) || {};
    const partial = (summary && summary.partial) || {};
    const registryStart = (summary && summary.registryStart) || 2016;
    const partialInfo = year != null ? partial[year] : null;

    const boroughList = (boroughs && boroughs.boroughs) || [];
    const boroughByYear = (boroughs && boroughs.byYear) || {};
    const selectedBorough = selected ? boroughList.find(b => b.code === selected) : null;

    const boroughCount = (y, code) => ((boroughByYear[y] || {})[code] || 0);

    // Selecting an alcaldía turns the whole panel into that alcaldía's profile:
    // the headline, the comparison and the bars all follow the selection, so
    // the reader never has to hold "this number is the city, that one isn't".
    const byYear = selected
        ? decade.reduce((acc, y) => { acc[y] = boroughCount(y, selected); return acc; }, {})
        : cityByYear;
    const count = year != null ? (byYear[year] || 0) : 0;

    const fmt = n => (n == null ? '—' : Number(n).toLocaleString('es-MX'));

    // Which months a partial year actually has, said by name. "Solo tiene
    // enero" is a claim a reader can check against the calendar; "1 de 12
    // meses" leaves them wondering which one is missing. Falls back to the
    // count when the months are not contiguous, because "de enero a octubre"
    // would then be a lie about the gaps in between.
    const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                       'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthsPhrase = (info) => {
        const list = (info.monthList || []).slice().sort((a, b) => a - b);
        const count = `${info.months} de 12 meses`;
        if (list.length === 1) return { name: MONTHS_ES[list[0] - 1], count: count };
        const contiguous = list.length > 1 &&
            list[list.length - 1] - list[0] === list.length - 1;
        return {
            name: contiguous
                ? `de ${MONTHS_ES[list[0] - 1]} a ${MONTHS_ES[list[list.length - 1] - 1]}`
                : null,
            count: count,
        };
    };
    const monthsText = (info) => {
        const m = monthsPhrase(info);
        return m.name ? `${m.name} (${m.count})` : m.count;
    };
    const fmtRate = n => Number(n).toLocaleString('es-MX', {
        minimumFractionDigits: 1, maximumFractionDigits: 1
    });

    // ---- choropleth classing -------------------------------------------
    const RAMP = window.DESPOJO_RAMP;
    const breaks = ((boroughs && boroughs.breaks) || {})[measure] || [];

    const measureValue = (y, code) => {
        const n = boroughCount(y, code);
        if (measure !== 'rate') return n;
        const b = boroughList.find(x => x.code === code);
        return b && b.population ? (n / b.population) * 100000 : 0;
    };
    // Class breaks land on fractions; carpetas are whole things.
    const showMeasure = v => (measure === 'rate' ? fmtRate(v) : fmt(Math.round(v)));
    const classOf = (value) => {
        for (let i = 0; i < breaks.length; i++) {
            if (value <= breaks[i]) return i;
        }
        return breaks.length;
    };
    const colorFor = (y, code) => (
        boroughCount(y, code) === 0
            ? window.DESPOJO_RAMP_EMPTY
            : RAMP[classOf(measureValue(y, code))]
    );

    // Alcaldías of the selected year, biggest first. The list is the reason the
    // choropleth is readable without distinguishing five shades of one hue.
    const ranking = React.useMemo(() => {
        if (year == null || !boroughList.length) return [];
        const prev = decade.indexOf(year) > 0 ? decade[decade.indexOf(year) - 1] : null;
        return boroughList
            .map(b => {
                const value = measureValue(year, b.code);
                const before = prev != null ? measureValue(prev, b.code) : null;
                return {
                    code: b.code,
                    name: b.name,
                    value: value,
                    count: boroughCount(year, b.code),
                    delta: before ? ((value - before) / before) * 100 : null,
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [boroughs, year, measure]);

    const unassigned = ((boroughs && boroughs.unassigned) || {})[year] || 0;

    // ---- "cerca de mí" derived ------------------------------------------
    const NEAR_RADII = [300, 500, 1000, 2000];
    const fmtRadius = m => (m >= 1000 ? (m / 1000) + ' km' : m + ' m');
    // Rounded to 10 m: the FGJ publishes approximate locations, and a distance
    // to the metre would claim a precision the source does not have.
    const fmtDistance = m => (m < 1000
        ? 'a unos ' + (Math.round(m / 10) * 10) + ' m'
        : 'a ' + (Math.round(m / 100) / 10).toString().replace('.', ',') + ' km');

    const openNear = () => {
        setPlaying(false);
        setView('points');
        setSelected(null);
        setNearYears(decade.slice());
        setNearResults(null);
        setNearNote('Toca el mapa o busca una dirección para poner el punto.');
        setNear(true);
    };

    const closeNear = () => {
        setNear(false);
        setNearPoint(null);
        setNearResults(null);
        setSuggestions([]);
        setQuery('');
        setNearLabel('');
        setNearNote('');
    };

    const pickSuggestion = (item) => {
        skipLookup.current = true;
        setNearPoint({ lng: item.lng, lat: item.lat });
        setNearLabel(item.label);
        setQuery(item.label);
        setSuggestions([]);
        setNearNote('');
        window.dispatchEvent(new CustomEvent('despojoNearChanged', {
            detail: {
                active: true,
                point: { lng: item.lng, lat: item.lat },
                radius: nearRadius,
                years: nearYears,
                origin: 'search'
            }
        }));
    };

    const locateMe = () => {
        if (!navigator.geolocation) {
            setNearNote('Tu navegador no permite compartir la ubicación. Busca una dirección o toca el mapa.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            position => {
                setLocating(false);
                const point = { lng: position.coords.longitude, lat: position.coords.latitude };
                setNearPoint(point);
                setNearLabel('Tu ubicación aproximada');
                setNearNote('');
                window.dispatchEvent(new CustomEvent('despojoNearChanged', {
                    detail: { active: true, point: point, radius: nearRadius, years: nearYears, origin: 'geo' }
                }));
            },
            () => {
                setLocating(false);
                setNearNote('No pudimos obtener tu ubicación. Busca una dirección o toca el mapa para poner el punto.');
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
    };

    const toggleNearYear = (y) => {
        setNearYears(prev => {
            if (prev.indexOf(y) === -1) return prev.concat([y]).sort();
            // Never leave the reader with an empty set: that is the one state
            // that produces a zero for no reason the map can show.
            return prev.length > 1 ? prev.filter(v => v !== y) : prev;
        });
    };

    const nearByYear = (nearResults && nearResults.byYear) || {};
    const nearTop = Math.max(1, ...decade.map(y => nearByYear[y] || 0));

    // The bars sit on a truncated baseline. Nearly every year lands between
    // ~3,000 and ~4,300, so a zero-based axis flattens the decade into one
    // block and hides the year-to-year movement the player is about. The floor
    // is derived from the data — the lowest year that still belongs to the pack,
    // rounded down to a clean step — and years that fall below it (the first
    // year of the series, before the registry matured) render as a stub marked
    // out of scale. The floor is printed next to the title so the reader knows
    // the axis does not start at zero.
    const barScale = React.useMemo(() => {
        const values = decade.map(y => byYear[y] || 0).filter(v => v > 0);
        if (!values.length) return { floor: 0, top: 1 };
        const top = Math.max(...values);
        // Years under 40% of the peak are outliers, not part of the pack: they
        // would drag the floor back to zero and undo the whole point.
        const pack = values.filter(v => v >= top * 0.4);
        const lo = Math.min(...(pack.length ? pack : values));
        // The step follows the magnitude: the city runs in the thousands, a
        // single alcaldía in the hundreds, and both need a round floor.
        const step = top > 2000 ? 500 : top > 500 ? 100 : top > 100 ? 25 : 10;
        // One step of headroom under the lowest year of the pack, so the
        // shortest real bar still reads as a bar and not as an empty slot.
        const floor = Math.max(0, Math.floor(lo / step) * step - step);
        return { floor: floor < top ? floor : 0, top };
    }, [summary, boroughs, selected]);

    const stemHeight = n => {
        const span = barScale.top - barScale.floor;
        if (span <= 0) return 100;
        return Math.max(0, Math.min(100, ((n - barScale.floor) / span) * 100));
    };

    // The comparison rides on the count line as a chip rather than a sentence
    // below it: one glance, one line saved, and the arithmetic behind it stays
    // available in the title.
    const deltaChip = () => {
        if (year == null || !summary) return null;
        // A year the registry has barely loaded gets no chip: the badge on the
        // year and the callout under the count already say what is going on,
        // and a projection next to them would answer the question the panel is
        // asking with a number the source has not published.
        if (partialInfo) return null;
        if (year < registryStart) {
            return {
                tone: 'is-flat',
                label: 'no comparable',
                title: 'Hechos previos al registro, denunciados después.'
            };
        }
        const base = byYear[registryStart];
        if (!base) return null;
        const pct = Math.round(((count - base) / base) * 1000) / 10;
        return {
            tone: pct >= 0 ? 'is-up' : 'is-down',
            label: `${pct >= 0 ? '▲ +' : '▼ '}${pct}% vs ${registryStart}`,
            title: `${fmt(count)} carpetas en ${year}, frente a ${fmt(base)} en ${registryStart}.`
        };
    };

    // Opens the intake modal. DespojoPage owns the form and listens for this
    // event, so the panel doesn't have to thread a callback down through the
    // map. Only the "cerca de mí" view offers it: someone who just looked up
    // their own street is who might have a case; the city-wide view is for
    // reading the data, not for telling us about it.
    const reportButton = (
        <button
            type="button"
            className="despojo-report"
            onClick={() => window.dispatchEvent(new Event('despojoOpenForm'))}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 21V4" />
                <path d="M5 4h11l-1.7 3.5L16 11H5" />
            </svg>
            Reportar despojo
        </button>
    );

    // ---- render --------------------------------------------------------
    if (error) {
        return (
            <div className="despojo-panel">
                <h1 className="despojo-title">Despojos de vivienda</h1>
                <p className="despojo-lede">No pudimos cargar los datos ({error}). Recarga la página para intentar de nuevo.</p>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="despojo-panel">
                <h1 className="despojo-title">Despojos de vivienda</h1>
                <p className="despojo-lede">Cargando carpetas de investigación…</p>
            </div>
        );
    }

    // "Cerca de mí" replaces the panel rather than stacking on it: it is a
    // different question, not another filter over the city map. The only way
    // out is the back link, and it restores the year and the view untouched.
    if (near) {
        return (
            <div className="despojo-panel">
                <button type="button" className="despojo-back" onClick={closeNear}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 6 8 12l6 6" />
                    </svg>
                    Volver
                </button>

                <h1 className="despojo-title is-near">Despojos cerca de</h1>

                <div className="despojo-search">
                    <svg className="despojo-search-icon" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Calle, colonia o código postal"
                        aria-label="Buscar una dirección"
                        autoComplete="off"
                    />
                    {suggestions.length > 0 && (
                        <div className="despojo-suggest">
                            {suggestions.map(item => (
                                <button key={item.id} type="button" onClick={() => pickSuggestion(item)}>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="despojo-or">o</div>

                <button type="button" className="despojo-geo" onClick={locateMe} disabled={locating}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <circle cx="12" cy="12" r="3.2" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        <circle cx="12" cy="12" r="8" />
                    </svg>
                    {locating ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
                </button>

                <p className="despojo-legend-note">
                    {nearNote || (nearLabel
                        ? nearLabel
                        : 'También puedes tocar el mapa o arrastrar el marcador.')}
                </p>

                <div className="despojo-choro">
                    <div className="despojo-eyebrow">
                        Radio
                        <span className="despojo-eyebrow-note">{fmtRadius(nearRadius)}</span>
                    </div>
                    <div className="despojo-measure" role="group" aria-label="Radio de búsqueda">
                        {NEAR_RADII.map(r => (
                            <button
                                key={r}
                                type="button"
                                aria-pressed={r === nearRadius}
                                onClick={() => setNearRadius(r)}
                            >
                                {fmtRadius(r)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="despojo-barsection" role="group" aria-label="Años incluidos">
                    <div className="despojo-eyebrow">
                        Años
                        <span className="despojo-eyebrow-note">
                            {nearYears.length === decade.length
                                ? 'toda la década'
                                : (nearYears.length === 1 ? nearYears[0] : nearYears.length + ' años')}
                        </span>
                    </div>
                    <div className="despojo-bars is-compact">
                        {decade.map(y => {
                            const n = nearByYear[y] || 0;
                            const on = nearYears.indexOf(y) !== -1;
                            return (
                                <button
                                    key={y}
                                    type="button"
                                    className="despojo-bar"
                                    aria-pressed={on}
                                    aria-label={`${y}: ${fmt(n)} carpetas en el radio`}
                                    onClick={() => toggleNearYear(y)}
                                >
                                    <span className="despojo-stem" style={{ height: (n / nearTop * 100) + '%' }}>
                                        <span className="despojo-bartip" aria-hidden="true">{fmt(n)} carpetas</span>
                                    </span>
                                    <span className="despojo-barcap">{String(y).slice(2)}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="despojo-yearlinks">
                        <button type="button" onClick={() => setNearYears(decade.slice())}>Todos</button>
                        <button
                            type="button"
                            onClick={() => {
                                const complete = decade.filter(y => !partial[y]);
                                setNearYears([complete.length ? complete[complete.length - 1] : decade[decade.length - 1]]);
                            }}
                        >
                            Solo el último año
                        </button>
                    </div>
                </div>

                <div className="despojo-nearresult">
                    {!nearPoint && (
                        <p className="despojo-legend-note">
                            Elige un punto para contar las carpetas a su alrededor.
                        </p>
                    )}
                    {nearPoint && nearResults && (
                        <React.Fragment>
                            <div className="despojo-countrow">
                                <span className="despojo-count">{fmt(nearResults.total)}</span>
                                <span className="despojo-countlabel">
                                    carpetas en {fmtRadius(nearRadius)}
                                </span>
                            </div>
                            {nearResults.total > 0 ? (
                                <React.Fragment>
                                    <p className="despojo-legend-note">
                                        Ubicaciones aproximadas: ninguna carpeta señala un domicilio en particular.
                                    </p>
                                    <div className="despojo-cases">
                                        {nearResults.cases.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className="despojo-case"
                                                onClick={() => window.dispatchEvent(new CustomEvent('despojoNearFocus', { detail: c }))}
                                                title="Ver esta carpeta en el mapa"
                                            >
                                                <span className="despojo-case-date">
                                                    {c.date ? c.date.split('-').reverse().join('/') : c.year}
                                                </span>
                                                <span className="despojo-case-dist">{fmtDistance(c.distance)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </React.Fragment>
                            ) : (
                                <p className="despojo-legend-note">
                                    Sin carpetas registradas con esos filtros. Prueba un radio mayor o más años.
                                </p>
                            )}
                        </React.Fragment>
                    )}
                </div>

                {reportButton}
            </div>
        );
    }

    return (
        <div className="despojo-panel">
            <h1 className="despojo-title">Despojos de vivienda</h1>
            <p className="despojo-lede">
                Carpetas de investigación por despojo abiertas ante la Fiscalía General de
                Justicia de la Ciudad de México.
            </p>

            <div className="despojo-divider"></div>

            {/* Two readings of the same year. The switch changes how the year is
                drawn, never which year: the player below keeps its place. */}
            {boroughs && (
                <div className="despojo-switch" role="group" aria-label="Modo de visualización">
                    <button
                        type="button"
                        aria-pressed={view === 'points'}
                        onClick={() => setView('points')}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <circle cx="7" cy="8" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                            <circle cx="11" cy="13" r="1.6" /><circle cx="18" cy="15" r="1.6" />
                            <circle cx="6" cy="17" r="1.6" />
                        </svg>
                        Puntos
                    </button>
                    <button
                        type="button"
                        aria-pressed={view === 'boroughs'}
                        onClick={() => setView('boroughs')}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <rect x="3" y="3" width="8" height="8" rx="1.5" />
                            <rect x="13" y="3" width="8" height="8" rx="1.5" />
                            <rect x="3" y="13" width="8" height="8" rx="1.5" />
                            <rect x="13" y="13" width="8" height="8" rx="1.5" />
                        </svg>
                        Alcaldías
                    </button>
                </div>
            )}

            {/* Year, scope and count in two lines: the year stays the anchor of
                the player, and the comparison rides along as a chip. */}
            <div className="despojo-yearrow">
                <span className="despojo-year">{year}</span>
                {selectedBorough && (
                    <span className="despojo-scope-name">· {selectedBorough.name}</span>
                )}
                {partialInfo && (
                    <span
                        className="despojo-tag is-missing"
                        title={`De ${year} el registro público solo tiene ${monthsText(partialInfo)}.`}
                    >
                        ¿Dónde están los datos?
                    </span>
                )}
                {!pointsReady && <span className="despojo-spinner" aria-label="Cargando puntos"></span>}
                {selectedBorough && (
                    <button
                        type="button"
                        className="despojo-scope-clear"
                        onClick={() => setSelected(null)}
                    >
                        Toda la ciudad
                    </button>
                )}
            </div>

            <div className="despojo-countrow">
                <span className="despojo-count">{fmt(count)}</span>
                <span className="despojo-countlabel">carpetas</span>
                {(() => {
                    const chip = deltaChip();
                    return chip && (
                        <span className={'despojo-delta-chip ' + chip.tone} title={chip.title}>
                            {chip.label}
                        </span>
                    );
                })()}
            </div>

            {/* An incomplete year is not a low year. Said next to the number
                rather than only as a tag, because the count is the one thing a
                reader takes away from the panel and 152 against ~3,900 reads as
                a collapse in despojo unless the gap is spelled out. */}
            {partialInfo && (
                <p className="despojo-missing">
                    <span className="despojo-missing-mark" aria-hidden="true">!</span>
                    <span>
                        {/* Neither the question nor the year nor the count is
                            repeated here: the badge asks, the year is the
                            headline above and the number sits right on top of
                            this line. All this has to add is what is missing. */}
                        Solo hay <strong>{(m => m.name || m.count)(monthsPhrase(partialInfo))}</strong>{' '}
                        en el registro público: el conteo no es el total del año.
                    </span>
                </p>
            )}

            {/* transport */}
            <div className="despojo-controls">
                <button
                    className="despojo-play"
                    onClick={() => setPlaying(p => !p)}
                    aria-label={playing ? 'Pausar' : 'Reproducir la década'}
                >
                    <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
                    {playing ? 'Pausa' : 'Reproducir'}
                </button>
                <input
                    className="despojo-scrub"
                    type="range"
                    min="0"
                    max={Math.max(0, decade.length - 1)}
                    step="1"
                    value={Math.max(0, decade.indexOf(year))}
                    onChange={e => { setPlaying(false); setYear(decade[+e.target.value]); }}
                    aria-label="Año del hecho"
                />
            </div>

            {/* alcaldía view: measure, scale and the ranking that carries the
                same information the colour does */}
            {view === 'boroughs' && boroughs && (
                <div className="despojo-choro">
                    <div className="despojo-measure" role="group" aria-label="Medida del mapa">
                        <button
                            type="button"
                            aria-pressed={measure === 'absolute'}
                            onClick={() => setMeasure('absolute')}
                        >
                            Carpetas
                        </button>
                        <button
                            type="button"
                            aria-pressed={measure === 'rate'}
                            onClick={() => setMeasure('rate')}
                            title="Carpetas por cada 100 mil habitantes (Censo 2020)"
                        >
                            Por 100 mil hab.
                        </button>
                    </div>

                    <div className="despojo-legend-scale" aria-hidden="true">
                        {RAMP.map(hex => (
                            <span key={hex} style={{ background: hex }}></span>
                        ))}
                    </div>
                    <div className="despojo-legend-ticks" aria-hidden="true">
                        <span>0</span>
                        {breaks.map((b, i) => <span key={i}>{showMeasure(b)}</span>)}
                        <span>máx</span>
                    </div>
                    <p className="despojo-legend-note">
                        {measure === 'rate'
                            ? 'Carpetas por cada 100 mil habitantes · '
                            : 'Carpetas del año · '}
                        cortes por quintiles, fijos para toda la década
                    </p>

                    <div className="despojo-ranking" role="group" aria-label="Alcaldías del año">
                        {(rankingOpen ? ranking : ranking.slice(0, 6)).map(row => (
                            <button
                                key={row.code}
                                type="button"
                                className={'despojo-rank' + (selected === row.code ? ' is-on' : '')}
                                aria-pressed={selected === row.code}
                                onClick={() => setSelected(selected === row.code ? null : row.code)}
                            >
                                <i style={{ background: colorFor(year, row.code) }}></i>
                                <span className="despojo-rank-name">{row.name}</span>
                                <span className="despojo-rank-value">{showMeasure(row.value)}</span>
                                <span className={'despojo-rank-delta' + (row.delta >= 0 ? ' is-up' : ' is-down')}>
                                    {row.delta === null
                                        ? '—'
                                        : (row.delta >= 0 ? '+' : '') + Math.round(row.delta) + '%'}
                                </span>
                            </button>
                        ))}
                    </div>
                    {ranking.length > 6 && (
                        <button
                            type="button"
                            className="despojo-rank-more"
                            onClick={() => setRankingOpen(o => !o)}
                        >
                            {rankingOpen ? 'Ver solo las seis primeras' : `Ver las ${ranking.length} alcaldías`}
                        </button>
                    )}
                    {unassigned > 0 && (
                        <p className="despojo-legend-note">
                            {fmt(unassigned)} carpetas de {year} sin alcaldía en el registro; no están en el mapa.
                        </p>
                    )}
                </div>
            )}

            {/* per-year bars — also the direct year selector */}
            <div className="despojo-barsection" role="group" aria-label="Seleccionar año">
                <div className="despojo-eyebrow">
                    {selectedBorough
                        ? `Carpetas por año · ${selectedBorough.name}`
                        : 'Carpetas por año del hecho'}
                    {barScale.floor > 0 && (
                        <span className="despojo-eyebrow-note">eje desde {fmt(barScale.floor)}</span>
                    )}
                </div>
                <div className="despojo-bars">
                    {decade.map(y => {
                        const n = byYear[y] || 0;
                        const clipped = n <= barScale.floor;
                        return (
                            <button
                                key={y}
                                type="button"
                                className={'despojo-bar' + (partial[y] ? ' is-partial' : '') + (clipped ? ' is-clipped' : '')}
                                aria-pressed={y === year}
                                aria-label={`${y}: ${fmt(n)} carpetas${partial[y] ? ' (faltan datos del año)' : ''}${clipped ? ' (por debajo del inicio del eje)' : ''}`}
                                onClick={() => { setPlaying(false); setYear(y); }}
                            >
                                <span className="despojo-stem" style={{ height: stemHeight(n) + '%' }}>
                                    {/* Own tooltip rather than `title`: the native one waits a
                                        second, lands under the cursor and covers the year labels.
                                        It hangs off the top of the stem, so it tracks the bar. */}
                                    <span className="despojo-bartip" aria-hidden="true">
                                        {fmt(n)} carpetas
                                        {partial[y] && <em> · faltan datos</em>}
                                        {clipped && <em> · fuera de escala</em>}
                                    </span>
                                </span>
                                {/* The year, not the count: the bars double as the year picker now
                                    that the chip row is gone. The count for the selected year is the
                                    headline number above, and every year's count is in the tooltip. */}
                                <span className="despojo-barcap">{y}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="despojo-divider"></div>

            {view === 'boroughs' ? (
                <React.Fragment>
                    <div className="despojo-legend">
                        <span className="despojo-dot is-square" style={{ background: RAMP[RAMP.length - 1] }}></span>
                        <span>Más carpetas en el año seleccionado</span>
                    </div>
                    <div className="despojo-legend">
                        <span className="despojo-dot is-square" style={{ background: RAMP[0] }}></span>
                        <span>Menos carpetas</span>
                    </div>
                    <div className="despojo-legend">
                        <span className="despojo-dot is-ghost"></span>
                        <span>Los puntos siguen debajo, atenuados</span>
                    </div>
                </React.Fragment>
            ) : (
                <React.Fragment>
                    <div className="despojo-legend">
                        <span className="despojo-dot"></span>
                        <span>Ubicación aproximada del hecho, año seleccionado</span>
                    </div>
                    <div className="despojo-legend">
                        <span className="despojo-dot is-ghost"></span>
                        <span>Resto de la década</span>
                    </div>
                </React.Fragment>
            )}

            {/* The other question this map can answer. Last thing in the panel,
                immediately above the sources, and the only filled control here —
                everything above it is a control for the city-wide view. */}
            <button type="button" className="despojo-nearcta" onClick={openNear}>
                <span className="despojo-nearcta-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                         strokeLinecap="round">
                        <circle cx="12" cy="12" r="3.2" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        <circle cx="12" cy="12" r="8" />
                    </svg>
                </span>
                <span className="despojo-nearcta-text">
                    <span className="despojo-nearcta-title">Despojos cerca de mí</span>
                    <span className="despojo-nearcta-sub">Busca una dirección o usa tu ubicación</span>
                </span>
                <span className="despojo-nearcta-arrow" aria-hidden="true">→</span>
            </button>

            <div className="despojo-note">
                {noteOpen && (
                <p id="despojo-note-body">
                    <strong>¿Qué es el despojo?</strong> Ocupar, usar o impedir el acceso a un inmueble
                    (o a derechos de agua) sin tener derecho a ello, mediante violencia, amenazas, engaño
                    o furtivamente (Art. 237 del Código Penal para la Ciudad de México). No se limita a
                    vivienda: la FGJ registra “DESPOJO” como un solo tipo de delito, sin distinguir si el
                    inmueble es habitacional, comercial o de otro uso.
                </p>
                )}
                {/* The "i" and the sources are one centred row: the button is a
                    flex item rather than an inline glyph nudged into place, so
                    the two line up on their middles at any text size. */}
                <p className="despojo-sources">
                    <button
                        type="button"
                        className="despojo-info"
                        aria-expanded={noteOpen}
                        aria-controls="despojo-note-body"
                        title={noteOpen ? 'Ocultar la definición de despojo' : '¿Qué es el despojo?'}
                        onClick={() => setNoteOpen(o => !o)}
                    >
                        <span aria-hidden="true">i</span>
                        <span className="despojo-sr">¿Qué es el despojo?</span>
                    </button>
                    <span className="despojo-sources-text">
                        Fuentes:{' '}
                        <a href="https://datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico" target="_blank" rel="noopener noreferrer">Datos Abiertos CDMX</a>
                        {' · '}
                        <a href="https://www.congresocdmx.gob.mx/comsoc-incrementan-penas-al-delito-despojo-6812-1.html" target="_blank" rel="noopener noreferrer">Congreso CDMX</a>
                    </span>
                </p>
            </div>
        </div>
    );
}

window.DespojoPlayerPanel = DespojoPlayerPanel;
