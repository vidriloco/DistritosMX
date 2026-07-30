const StationDetailsPanel = React.forwardRef(({ selectedStation, onClose }, ref) => {
    // Get transportSystems from global scope with state to trigger re-renders
    const [transportSystems, setTransportSystems] = React.useState(window.transportSystems || {});
    const panelRef = React.useRef(null);

    // Update transportSystems when it becomes available
    React.useEffect(() => {
        const checkTransportSystems = () => {
            if (window.transportSystems && Object.keys(window.transportSystems).length > 0) {
                setTransportSystems(window.transportSystems);
            }
        };
        
        // Check immediately
        checkTransportSystems();
        
        // Also check after a short delay in case it's loaded asynchronously
        const timer = setTimeout(checkTransportSystems, 100);
        
        return () => clearTimeout(timer);
    }, []);

    // Expose the ref to the parent component
    React.useImperativeHandle(ref, () => ({
        scrollIntoView: () => {
            if (panelRef.current) {
                // Get the panel's position
                const panelRect = panelRef.current.getBoundingClientRect();
                const container = panelRef.current.closest('.vertical-panel-content');
                
                if (container) {
                    // Calculate the scroll position with 20px offset
                    const scrollTop = container.scrollTop + panelRect.top - 20;
                    container.scrollTo({
                        top: scrollTop,
                        behavior: 'smooth'
                    });
                } else {
                    // Fallback to default scrollIntoView
                    panelRef.current.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest' 
                    });
                }
            }
        }
    }));

    if (!selectedStation) return null;

    // Get the translated system name with fallback
    const systemInfo = transportSystems && transportSystems[selectedStation.system];
    let systemName = selectedStation.system; // Default to the raw system key
    
    if (systemInfo && systemInfo.name) {
        systemName = systemInfo.name;
    } else {
        // Fallback: try to map common system keys to display names
        const systemNameMap = {
            'metro': 'STC Metro',
            'metrobus': 'Metrobús',
            'trolebus': 'Trolebús',
            'cablebus': 'Cablebús',
            'ecobici': 'Ecobici',
            'rtp': 'Red de Transporte de Pasajeros',
            'concesionados': 'Transporte Concesionado',
            'tren-interurbano': 'Tren Interurbano',
            'tren-suburbano': 'Tren Suburbano',
            'mexibus': 'Mexibús',
            'mexicable': 'Mexicable',
            'tren-ligero': 'Tren Ligero'
        };
        
        systemName = systemNameMap[selectedStation.system] || selectedStation.system;
    }
    
    // Debug logging
    console.log('StationDetailsPanel:', {
        selectedStation,
        transportSystems: !!transportSystems,
        systemInfo: !!systemInfo,
        systemName,
        systemKey: selectedStation.system
    });

    return (
        <div className="floating-actions-container" ref={panelRef}>
            <div className="floating-actions-header">
                <h3 className="floating-actions-title">Detalles de la Estación</h3>
                <button className="close-floating-actions-button" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div className="floating-actions-content">
                <div className="floating-actions-section">
                    <div className="station-details-content">
                        <img src={selectedStation.icon} alt={systemName} className="station-details-icon" />
                        <h4 className="station-details-name">{selectedStation.name}</h4>
                        <p className="station-details-system">{systemName}</p>
                        <p className="station-details-line">Línea {selectedStation.line_number}: {selectedStation.line_name}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

// Make the component available globally
window.StationDetailsPanel = StationDetailsPanel; 