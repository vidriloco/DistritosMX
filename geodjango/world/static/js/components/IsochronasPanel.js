function IsochronasPanel({ onClose, selectedRadius, onRadiusChange }) {
    const radiusOptions = [300, 500, 1000, 2000];
    
    return (
        <div className="floating-actions-container">
            <div className="floating-actions-header">
                <button className="close-floating-actions-button" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <h3 className="floating-actions-title">Isocronas</h3>
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
window.IsochronasPanel = IsochronasPanel; 