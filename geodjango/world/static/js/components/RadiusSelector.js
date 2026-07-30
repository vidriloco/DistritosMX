function RadiusSelector({ selectedRadius, onRadiusChange }) {
    const radiusOptions = [300, 500, 1000, 2000];
    
    return (
        <div className="radius-selector-panel">
            <div className="radius-selector-header">
                <h3 className="radius-selector-title">Radio de Análisis</h3>
                <p>Selecciona alguna de las isocronas para analizar este mapa.</p>
            </div>
            <div className="radius-selector-content">
                <div className="radius-buttons">
                    {radiusOptions.map((radius) => (
                        <button
                            key={radius}
                            className={`radius-button ${selectedRadius === radius ? 'active' : ''}`}
                            onClick={() => onRadiusChange(radius)}
                        >
                            {radius} m
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Make the component available globally
window.RadiusSelector = RadiusSelector; 