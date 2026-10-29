// BusinessTopBar - the top bar of /negocios, the same slim bar as /explorar.
// The search slot holds the address of the point under study (typing in it
// looks the address up), the chips hold the radius, then the section links.

const NB_SEARCH_DEBOUNCE = 400;

function BusinessTopBar({
    address,
    hasPoint,
    radii,
    radius,
    onRadiusChange,
    onPlaceSelect,
    onUseMyLocation,
    onClear,
    onHelpClick
}) {
    const [query, setQuery] = React.useState('');
    const [editing, setEditing] = React.useState(false);
    const [results, setResults] = React.useState([]);
    const [searching, setSearching] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const timerRef = React.useRef(null);
    const requestRef = React.useRef(0);
    const inputRef = React.useRef(null);

    const navigate = (path) => {
        if (window.navigate) window.navigate(path); else window.location.href = path;
    };

    // While not editing, the input mirrors the address of the chosen point.
    const shown = editing ? query : (address || '');

    const search = async (text) => {
        const id = ++requestRef.current;
        setSearching(true);
        try {
            const response = await fetch(
                'https://nominatim.openstreetmap.org/search?' +
                'q=' + encodeURIComponent(text) +
                '&format=json&limit=6&countrycodes=mx&addressdetails=1&accept-language=es&dedupe=1'
            );
            const data = response.ok ? await response.json() : [];
            if (id !== requestRef.current) return;
            // Nominatim returns one row per segment of a long street; the
            // reader only needs one of each name.
            const seen = {};
            const unique = (Array.isArray(data) ? data : []).filter((r) => {
                const key = nbShortAddress(r) + '|' + nbAddressContext(r);
                if (seen[key]) return false;
                seen[key] = true;
                return true;
            });
            setResults(unique);
        } catch (error) {
            if (id === requestRef.current) setResults([]);
        } finally {
            if (id === requestRef.current) setSearching(false);
        }
    };

    const handleChange = (event) => {
        const text = event.target.value;
        setQuery(text);
        setEditing(true);
        setOpen(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (text.trim().length < 3) { setResults([]); setSearching(false); return; }
        timerRef.current = setTimeout(() => search(text.trim()), NB_SEARCH_DEBOUNCE);
    };

    const handleFocus = () => {
        setEditing(true);
        setQuery('');
        setOpen(true);
    };

    const handleBlur = () => {
        // Give a click on a suggestion time to land before the list goes.
        setTimeout(() => { setOpen(false); setEditing(false); }, 200);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') { setOpen(false); setEditing(false); inputRef.current && inputRef.current.blur(); }
        if (event.key === 'Enter' && results.length > 0) pick(results[0]);
    };

    const pick = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        if (isNaN(lat) || isNaN(lng)) return;
        setOpen(false);
        setEditing(false);
        setResults([]);
        onPlaceSelect({ lat, lng, address: nbShortAddress(result) });
    };

    const handleClear = (event) => {
        event.preventDefault();
        setQuery('');
        setResults([]);
        setEditing(false);
        setOpen(false);
        onClear();
    };

    React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    const showList = open && editing;

    return (
        <header className="xb-topbar">
            <a
                className="xb-brand"
                href="/"
                aria-label="Ciudad MX — ir al inicio"
                onClick={(e) => { e.preventDefault(); navigate('/'); }}
            >
                <img src="/static/images/distritos-mx-logo-black.png" alt="Ciudad MX" />
            </a>

            <div className="nb-search-wrap">
                <label className="xb-search nb-search">
                    <svg className="nb-search-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={shown}
                        placeholder={hasPoint ? 'Buscando la dirección…' : 'Dirección o colonia donde quieres abrir'}
                        aria-label="Dirección de la zona"
                        autoComplete="off"
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                    />
                    {searching ? <span className="nb-search-busy" aria-hidden="true"></span> : null}
                    {hasPoint && !editing ? (
                        <button type="button" className="nb-search-clear" onMouseDown={handleClear} aria-label="Quitar la zona" title="Quitar la zona">
                            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                    ) : null}
                </label>

                {showList && (
                    <div className="nb-suggest" role="listbox" aria-label="Sugerencias">
                        {query.trim().length < 3 && (
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); setOpen(false); setEditing(false); onUseMyLocation(); }}>
                                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>
                                <span><span className="nb-suggest-main">Usar mi ubicación</span><span className="nb-suggest-sub">O haz clic en el mapa para poner el pin</span></span>
                            </button>
                        )}
                        {results.map((result) => (
                            <button type="button" key={result.place_id} onMouseDown={(e) => { e.preventDefault(); pick(result); }}>
                                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                <span>
                                    <span className="nb-suggest-main">{nbShortAddress(result)}</span>
                                    <span className="nb-suggest-sub">{nbAddressContext(result)}</span>
                                </span>
                            </button>
                        ))}
                        {query.trim().length >= 3 && !searching && results.length === 0 && (
                            <div className="nb-suggest-empty">Sin resultados en México para “{query.trim()}”.</div>
                        )}
                    </div>
                )}
            </div>

            <div className="xb-units nb-radius" role="group" aria-label="Radio de alcance">
                <span className="xb-eyebrow">Radio</span>
                {radii.map((value) => (
                    <button
                        key={value}
                        type="button"
                        className={'xb-chip' + (radius === value ? ' is-active' : '')}
                        aria-pressed={radius === value}
                        onClick={() => onRadiusChange(value)}
                    >
                        {value >= 1000 ? (value / 1000) + ' km' : value + ' m'}
                    </button>
                ))}
            </div>

            <ExplorerSiteLinks onHelpClick={onHelpClick} />
        </header>
    );
}

// "Calle 12, Roma Norte" rather than Nominatim's full comma list.
function nbShortAddress(result) {
    const a = result.address || {};
    const street = a.road || a.pedestrian || a.footway || a.square || a.amenity || a.shop || a.building || a.tourism || '';
    const number = a.house_number ? ' ' + a.house_number : '';
    const area = a.neighbourhood || a.suburb || a.quarter || a.village || a.town || a.city_district || '';
    if (street && area) return street + number + ', ' + area;
    if (street) return street + number;
    if (area) return area;
    return (result.display_name || '').split(',').slice(0, 2).join(',').trim();
}

function nbAddressContext(result) {
    const a = result.address || {};
    const parts = [a.city || a.town || a.municipality || a.county, a.state].filter(Boolean);
    return parts.join(', ');
}

window.BusinessTopBar = BusinessTopBar;
window.nbShortAddress = nbShortAddress;
