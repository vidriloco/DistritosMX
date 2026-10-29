// ExplorerTopBar - the slim white bar at the top of /explorar.
// Logo, search, the spatial unit as chips and the section links.
function ExplorerTopBar({
    selectedAnalysis,
    onAnalysisSelect,
    onSearchClick,
    onHelpClick
}) {
    const units = [
        { id: 'hexbin', label: 'Hexbin', disabled: true },
        { id: 'agebs', label: 'AGEB' },
        { id: 'neighborhood', label: 'Colonia' },
        { id: 'isochrones', label: 'Isocronas' }
    ];

    const navigate = (path) => {
        if (window.navigate) {
            window.navigate(path);
        } else {
            window.location.href = path;
        }
    };

    const handleUnitClick = (unit) => {
        if (unit.disabled) return;
        // Clicking the active chip again clears the spatial unit.
        onAnalysisSelect(selectedAnalysis === unit.id ? null : unit.id);
    };

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

            <button type="button" className="xb-search" onClick={onSearchClick}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                </svg>
                <span className="xb-search-placeholder">Buscar línea o estación</span>
            </button>

            <div className="xb-units" role="group" aria-label="Unidad espacial">
                {units.map((unit) => (
                    <button
                        key={unit.id}
                        type="button"
                        className={`xb-chip${selectedAnalysis === unit.id ? ' is-active' : ''}${unit.disabled ? ' is-disabled' : ''}`}
                        onClick={() => handleUnitClick(unit)}
                        disabled={unit.disabled}
                        title={unit.disabled ? 'Próximamente' : undefined}
                        aria-pressed={selectedAnalysis === unit.id}
                    >
                        {unit.label}
                    </button>
                ))}
            </div>

            <ExplorerSiteLinks onHelpClick={onHelpClick} />
        </header>
    );
}

window.ExplorerTopBar = ExplorerTopBar;
