function LinesNavigator({ transportData, transportSystems, onClose, map, onLineSelect, setIsClosePanelVisible }) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedLine, setSelectedLine] = React.useState(null);

    // Sort function for systems and lines
    const sortTransportData = (data) => {
        // Sort systems alphabetically
        const sortedSystems = Object.keys(data).sort((a, b) => {
            const nameA = (transportSystems[a] && transportSystems[a].name) || a;
            const nameB = (transportSystems[b] && transportSystems[b].name) || b;
            return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        });

        // Sort lines within each system
        const sortedData = {};
        sortedSystems.forEach(system => {
            sortedData[system] = [...data[system]].sort((a, b) => {
                // Get line numbers as strings
                const lineNumA = String(a.line_number || '');
                const lineNumB = String(b.line_number || '');
                
                // Check if both are numbers
                const isNumA = !isNaN(parseInt(lineNumA));
                const isNumB = !isNaN(parseInt(lineNumB));
                
                if (isNumA && isNumB) {
                    // Both are numbers, sort numerically
                    return parseInt(lineNumA) - parseInt(lineNumB);
                } else if (isNumA) {
                    // A is number, B is letter - numbers come first
                    return -1;
                } else if (isNumB) {
                    // A is letter, B is number - numbers come first
                    return 1;
                } else {
                    // Both are letters, sort alphabetically
                    return lineNumA.localeCompare(lineNumB, 'es', { sensitivity: 'base' });
                }
            });
        });

        return sortedData;
    };

    // Sort initial data
    const sortedInitialData = React.useMemo(() => {
        return sortTransportData(transportData);
    }, [transportData, transportSystems]);

    const filteredData = React.useMemo(() => {
        if (!searchQuery) return sortedInitialData;

        const query = searchQuery.toLowerCase();
        const filtered = {};

        Object.entries(sortedInitialData).forEach(([system, lines]) => {
            if (!lines || !Array.isArray(lines)) return;

            const systemInfo = transportSystems[system];
            const systemName = systemInfo ? systemInfo.name : system;
            
            if (systemName.toLowerCase().includes(query)) {
                filtered[system] = lines;
            } else {
                const matchingLines = lines.filter(line => {
                    if (!line) return false;
                    const composed_name = line.name + ': ' + line.route;
                    return composed_name.toLowerCase().includes(query);
                });
                
                if (matchingLines.length > 0) {
                    filtered[system] = matchingLines;
                }
            }
        });

        return sortTransportData(filtered);
    }, [sortedInitialData, transportSystems, searchQuery]);

    // Check if transportData is loaded
    if (!transportData || Object.keys(transportData).length === 0) {
        return (
            <div className="overlay">
                <div className="search-dialog">
                    <div className="search-dialog-header">
                        <h3 className="search-dialog-title">Buscar Líneas</h3>
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>
                    <div className="search-dialog-content">
                        <div className="loading-message">Cargando datos de transporte...</div>
                    </div>
                </div>
            </div>
        );
    }

    const handleLineClick = (system, line) => {
        setSelectedLine({ system, line });
        
        // Calculate bounds of the line
        const bounds = new mapboxgl.LngLatBounds();
        line.paths.forEach(path => {
            path.coordinates.forEach(coord => {
                bounds.extend(coord);
            });
        });

        // Add some padding around the bounds
        const padding = {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
        };

        // Center map on the line
        map.current.fitBounds(bounds, {
            padding: padding,
            duration: 1000
        });
        
        // Hide all lines except the selected one
        Object.entries(transportData).forEach(([currentSystem, currentLines]) => {
            currentLines.forEach(currentLine => {
                const lineId = `${currentSystem}-line-${currentLine.id}`;
                const stationsId = `${currentSystem}-stations-${currentLine.id}`;
                
                if (map.current.getLayer(lineId)) {
                    if (currentSystem === system && currentLine.id === line.id) {
                        // Show selected line
                        map.current.setLayoutProperty(lineId, 'visibility', 'visible');
                        map.current.setLayoutProperty(stationsId, 'visibility', 'visible');
                    } else {
                        // Hide other lines
                        map.current.setLayoutProperty(lineId, 'visibility', 'none');
                        map.current.setLayoutProperty(stationsId, 'visibility', 'none');
                    }
                }
            });
        });

        // Notify parent component about line selection
        if (onLineSelect) {
            onLineSelect({ system, line });
        }
        
        // Collapse the transport systems menu
        if (setIsClosePanelVisible) {
            setIsClosePanelVisible(false);
        }
        
        // Minimize the search dialog
        onClose();
    };

    const handleClose = () => {
        // Reset all line opacities when closing
        Object.entries(transportData).forEach(([system, lines]) => {
            lines.forEach(line => {
                const lineId = `${system}-line-${line.id}`;
                const stationsId = `${system}-stations-${line.id}`;
                
                if (map.current.getLayer(lineId)) {
                    map.current.setLayoutProperty(lineId, 'visibility', 'visible');
                    map.current.setLayoutProperty(stationsId, 'visibility', 'visible');
                }
            });
        });
        setSelectedLine(null);
        onClose();
    };

    return (
        <div className="overlay">
            <div className="search-dialog">
                <div className="search-dialog-header">
                    <h3 className="search-dialog-title">Buscar</h3>
                    <button className="close-button" onClick={handleClose}>×</button>
                </div>
                <div className="search-input-container">
                    <svg 
                        className="search-icon-input"
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar líneas y sistemas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="search-dialog-content">
                    {Object.entries(filteredData).length === 0 ? (
                        <div className="no-results">No se encontraron resultados</div>
                    ) : (
                        Object.entries(filteredData).map(([system, lines]) => {
                            const systemInfo = transportSystems[system];
                            const systemName = systemInfo ? systemInfo.name : system;
                            
                            return (
                                <div key={system} className="transport-section">
                                    <div className="transport-section-title">
                                        {systemName}
                                    </div>
                                    {lines.map(line => {
                                        const lineNumber = parseInt(line.line_number);
                                        const displayNumber = lineNumber && lineNumber !== 0 ? lineNumber : line.line_number;
                                        const isSelected = selectedLine && 
                                            selectedLine.system === system && 
                                            selectedLine.line.id === line.id;
                                        
                                        return (
                                            <div 
                                                key={line.id} 
                                                className={`line-item ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleLineClick(system, line)}
                                            >
                                                <span className="line-name">
                                                    <span className="line-number">Línea {displayNumber}: {line.route}</span>
                                                    {line.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

// Make the component available globally
window.LinesNavigator = LinesNavigator; 