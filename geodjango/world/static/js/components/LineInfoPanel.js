function LineInfoPanel({ selectedLine, transportSystems, onClose }) {
    if (!selectedLine) return null;

    const { system, line } = selectedLine;
    const systemInfo = transportSystems[system];
    const systemName = systemInfo ? systemInfo.name : system;
    const systemIcon = systemInfo ? systemInfo.icon : 'no-transports.png';
    const lineNumber = parseInt(line.line_number);
    const displayNumber = lineNumber && lineNumber !== 0 ? lineNumber : line.line_number;

    return (
        <div className="floating-info-panel">
            <div className="info-panel-header">
                <div className="info-panel-header-content">
                    <img src={systemIcon} alt={system} className="info-panel-icon" />
                    <h3 className="info-panel-title">{systemName}</h3>
                </div>
                <button className="close-info-button" onClick={onClose}>×</button>
            </div>
            <div className="info-panel-content">
                <div className="info-line">
                    <div className="info-number">Línea {displayNumber}</div>
                    <div className="info-route">{line.route}</div>
                </div>
                <div className="info-line">
                    {line.stations && line.stations.length > 0 ? (
                        <div className="station-list">
                            {line.stations.map((station, index) => (
                                <div key={station.id || index} className="station-item">
                                    <div className={`station-marker ${system}`} />
                                    <span className="station-name">{station.name}</span>
                                    {station.identifier && (
                                        <span className="station-identifier">({station.identifier})</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-stations">No hay estaciones disponibles para esta línea</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Make the component available globally
window.LineInfoPanel = LineInfoPanel; 