function LandAnalysis({ onElementAnalysisClick, selectedRadius, onRadiusChange }) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = React.useState(null);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const handleElementAnalysisClick = (element) => {
        setSelectedAnalysis(element);
        onElementAnalysisClick(element);
    };

    const handleBackClick = () => {
        // Clear the selected analysis first
        setSelectedAnalysis(null);
        // Notify parent to clear layers and handle state
        onElementAnalysisClick(null);
    };

    // Helper function to get the title of the selected analysis
    const getAnalysisTitle = (analysis) => {
        switch(analysis) {
            case 'hexbin': return 'Hexbin';
            case 'agebs': return 'Agebs';
            case 'neighborhood': return 'Colonia';
            case 'polygon': return 'Polígono';
            case 'isochrones': return 'Isocronas';
            default: return '';
        }
    };

    // Helper function to get the description of the selected analysis
    const getAnalysisDescription = (analysis) => {
        switch(analysis) {
            case 'hexbin': return 'Agrupa los datos en celdas hexagonales para visualizar patrones de densidad.';
            case 'agebs': return 'Analiza datos por Áreas Geoestadísticas Básicas definidas por INEGI.';
            case 'neighborhood': return 'Visualiza datos agrupados por colonias o barrios de la ciudad.';
            case 'polygon': return 'Dibuja un polígono personalizado para analizar un área específica.';
            case 'isochrones': return 'Muestra áreas accesibles en un tiempo determinado desde un punto.';
            default: return '';
        }
    };

    return (
        <div className="land-analysis-container">
            <div className="land-analysis-header" onClick={toggleCollapse}>
                <h3 className="land-analysis-title">Agrupaciones espaciales</h3>
                <button className="land-analysis-toggle-button">
                    <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        className={`land-analysis-chevron ${isCollapsed ? 'collapsed' : 'expanded'}`}
                    >
                        <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                </button>
            </div>
            {!isCollapsed && (
                <div className="land-analysis-content">
                    {selectedAnalysis ? (
                        <div className="land-analysis-selected-view">
                            <button 
                                className="land-analysis-back-button"
                                onClick={handleBackClick}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5"/>
                                    <path d="M12 19l-7-7 7-7"/>
                                </svg>
                            </button>
                            <div className="land-analysis-selected-info">
                                <h2 className="land-analysis-selected-title">
                                    {getAnalysisTitle(selectedAnalysis)}
                                </h2>
                                <p className="land-analysis-selected-description">
                                    {getAnalysisDescription(selectedAnalysis)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="land-analysis-buttons">
                            <button 
                                className="land-analysis-button disabled"
                                disabled
                                title="Próximamente"
                            >
                                <div className="land-analysis-icon">
                                    <CustomizableIcon category="hexbin" />
                                </div>
                                <span>Hexbin</span>
                            </button>
                            <button 
                                className={`land-analysis-button ${selectedAnalysis === 'agebs' ? 'selected' : ''}`}
                                onClick={() => handleElementAnalysisClick('agebs')}
                            >
                                <div className="land-analysis-icon">
                                    <CustomizableIcon category="agebs" />
                                </div>
                                <span>Agebs</span>
                            </button>
                            <button 
                                className={`land-analysis-button ${selectedAnalysis === 'neighborhood' ? 'selected' : ''}`}
                                onClick={() => handleElementAnalysisClick('neighborhood')}
                            >
                                <div className="land-analysis-icon">
                                    <CustomizableIcon category="neighborhood" />
                                </div>
                                <span>Colonia</span>
                            </button>
                            <button 
                                className="land-analysis-button"
                                onClick={() => handleElementAnalysisClick('isochrones')}
                            >
                                <div className="land-analysis-icon">
                                    <CustomizableIcon category="isochrones" />
                                </div>
                                <span>Isocronas</span>
                            </button>
                        </div>
                    )}
                    {selectedAnalysis === 'isochrones' && (
                        <React.Fragment>
                            <div className="land-analysis-divider"></div>
                            <div className="radius-selector-content">
                                <div className="radius-buttons">
                                    {[300, 500, 1000, 2000].map((radius) => (
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
                        </React.Fragment>
                    )}
                </div>
            )}
        </div>
    );
}

// Make the component available globally
window.LandAnalysis = LandAnalysis; 