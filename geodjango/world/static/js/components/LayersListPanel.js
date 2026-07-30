const LayersListPanel = React.forwardRef(({ transportData, visibleSystems, toggleSystemVisibility, map, showSearchDialog, setShowSearchDialog, onLineSelect, indicatorsData, indicatorsLoading, indicatorsError, indicatorsVisible, setIndicatorsVisible, transportSystemsVisible, setTransportSystemsVisible, selectedAnalysis, activeSections, setActiveSections }, ref) => {
    // Get transportSystems from global scope
    const transportSystems = window.transportSystems || {};
    const [isCollapsed, setIsCollapsed] = React.useState(true);
    
    // Add state to track if we're on mobile
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
    
    // Add state for new layer categories
    const [aguaVisible, setAguaVisible] = React.useState(false);
    const [inseguridadVisible, setInseguridadVisible] = React.useState(false);
    const [fallasGeologicasVisible, setFallasGeologicasVisible] = React.useState(false);
    const [seguridadVialVisible, setSeguridadVialVisible] = React.useState(false);
    const [infraestructuraCiclistaVisible, setInfraestructuraCiclistaVisible] = React.useState(false);
    const [comercioInformalVisible, setComercioInformalVisible] = React.useState(false);
    const [rentasTemporalesVisible, setRentasTemporalesVisible] = React.useState(false);
    const [movilidadVisible, setMovilidadVisible] = React.useState(false);

    // Handle window resize for mobile detection
    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Expose the collapse function through the ref
    React.useImperativeHandle(ref, () => ({
        collapse: () => {
            setIsCollapsed(true);
        },
        expand: () => {
            setIsCollapsed(false);
        },
        toggle: () => {
            setIsCollapsed(!isCollapsed);
        }
    }));

    const handleCloseSearch = () => {
        setShowSearchDialog(false);
    };

    const handleIndicadoresClick = () => {
        if (indicatorsLoading) {
            return; // Don't do anything while loading
        }
        if (indicatorsError) {
            alert('Error al cargar los indicadores: ' + indicatorsError);
            return;
        }
        if (indicatorsData) {
            // Activate oportunidades section and show indicators panel
            setActiveSections(prev => ({
                ...prev,
                oportunidades: true
            }));
            setIndicatorsVisible(true);
        }
    };

    const handleTransportesClick = () => {
        setTransportSystemsVisible(!transportSystemsVisible);
    };

    // Add handlers for new buttons
    const handleAguaClick = () => {
        alert("Lo sentimos, esta capa aún no está disponible");
    };

    const handleInseguridadClick = () => {
        const newInseguridadVisible = !inseguridadVisible;
        setInseguridadVisible(newInseguridadVisible);
        
        // Show indicators panel when inseguridad layer is enabled
        if (newInseguridadVisible) {
            setActiveSections(prev => ({
                ...prev,
                inseguridad: true
            }));
            setIndicatorsVisible(true);
        }
    };

    const handleFallasGeologicasClick = () => {
        alert("Lo sentimos, esta capa aún no está disponible");
    };

    const handleSeguridadVialClick = () => {
        alert("Lo sentimos, esta capa aún no está disponible");
    };

    const handleInfraestructuraCiclistaClick = () => {
        alert("Lo sentimos, esta capa aún no está disponible");
    };

    const handleComercioInformalClick = () => {
        alert("Lo sentimos, esta capa aún no está disponible");
    };

    const handleRentasTemporalesClick = () => {
        const newRentasTemporalesVisible = !rentasTemporalesVisible;
        setRentasTemporalesVisible(newRentasTemporalesVisible);
        
        // Show indicators panel when vivienda layer is enabled
        if (newRentasTemporalesVisible) {
            setActiveSections(prev => ({
                ...prev,
                rentas_temporales: true
            }));
            setIndicatorsVisible(true);
        }
    };

    const handleMovilidadClick = () => {
        const newMovilidadVisible = !movilidadVisible;
        setMovilidadVisible(newMovilidadVisible);
        
        // Show indicators panel when movilidad layer is enabled
        if (newMovilidadVisible) {
            setActiveSections(prev => ({
                ...prev,
                movilidad: true
            }));
            setIndicatorsVisible(true);
        }
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Check if all buttons are hidden (indicators and transport systems are both visible)
    const allButtonsHidden = indicatorsVisible && transportSystemsVisible && aguaVisible && inseguridadVisible && fallasGeologicasVisible && seguridadVialVisible && infraestructuraCiclistaVisible && comercioInformalVisible && rentasTemporalesVisible && movilidadVisible;
    
    // If all buttons are hidden, don't render the panel
    if (allButtonsHidden) {
        return null;
    }

    return (
        <div id="should-display-menu">
            <div className="floating-actions-container">
                <div className="floating-actions-header" onClick={toggleCollapse}>
                    <h3 className="floating-actions-title">Capas disponibles</h3>
                    <button className="floating-actions-toggle-button">
                        <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                            className={`floating-actions-chevron ${isCollapsed ? 'collapsed' : 'expanded'}`}
                        >
                            <polyline points="6,9 12,15 18,9"></polyline>
                        </svg>
                    </button>
                </div>
                {!isCollapsed && (
                    <div className="floating-actions-content">
                        <div className="floating-actions-section">
                            {selectedAnalysis === null && (
                                <div className="info-message">
                                    <div className="info-icon">
                                        <svg width="16" height="16" viewBox="0 0 512 512">
                                            <path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>
                                        </svg>
                                    </div>
                                    <span>Selecciona una agrupación espacial para visualizar estas capas</span>
                                </div>
                            )}
                            <div id="spatial-grouping-dependent-layers" className={`floating-actions-buttons ${isMobile ? 'mobile-layout' : ''}`}>
                                {isMobile ? (
                                    // Mobile layout: Single horizontal scrollable container for ALL layers
                                    <div className="mobile-single-scroll-container">
                                        <div className="mobile-buttons-scroll-all">
                                            {/* Primary indicators - shown first */}
                                            {!activeSections.oportunidades && (
                                                <button 
                                                    className={`floating-action-button mobile-button primary ${indicatorsData ? '' : 'disabled'} ${selectedAnalysis === null ? 'disabled' : ''}`}
                                                    onClick={handleIndicadoresClick}
                                                    disabled={!indicatorsData || selectedAnalysis === null}
                                                >
                                                    <div className="floating-action-icon">
                                                        <CustomizableIcon category="oportunidades" />
                                                        {indicatorsError && (
                                                            <div className="error-indicator" title={indicatorsError}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                                                    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span>Oportunidades</span>
                                                </button>
                                            )}
                                            
                                            {!activeSections.inseguridad && (
                                                <button 
                                                    className={`floating-action-button mobile-button primary ${selectedAnalysis === null ? 'disabled' : ''}`}
                                                    onClick={handleInseguridadClick}
                                                    disabled={selectedAnalysis === null}
                                                >
                                                    <div className="floating-action-icon">
                                                        <CustomizableIcon category="inseguridad" />
                                                    </div>
                                                    <span>Inseguridad</span>
                                                </button>
                                            )}

                                            {!activeSections.rentas_temporales && (
                                                <button 
                                                    className={`floating-action-button mobile-button primary ${selectedAnalysis === null ? 'disabled' : ''}`}
                                                    onClick={handleRentasTemporalesClick}
                                                    disabled={selectedAnalysis === null}
                                                >
                                                    <div className="floating-action-icon">
                                                        <CustomizableIcon category="vivienda" />
                                                    </div>
                                                    <span>Vivienda</span>
                                                </button>
                                            )}

                                            {!activeSections.movilidad && (
                                                <button 
                                                    className={`floating-action-button mobile-button primary ${selectedAnalysis === null ? 'disabled' : ''}`}
                                                    onClick={handleMovilidadClick}
                                                    disabled={selectedAnalysis === null}
                                                >
                                                    <div className="floating-action-icon" style={{transform: 'scale(1.2)'}}>
                                                        <CustomizableIcon category="movilidad" />
                                                    </div>
                                                    <span>Movilidad</span>
                                                </button>
                                            )}

                                            {/* Visual separator for coming soon features */}
                                            <div className="mobile-separator"></div>

                                            {/* Coming soon features */}
                                            {!aguaVisible && (
                                                <button 
                                                    className={`floating-action-button mobile-button coming-soon ${selectedAnalysis === null ? 'disabled' : ''}`}
                                                    onClick={handleAguaClick}
                                                    disabled={selectedAnalysis === null}
                                                >
                                                    <div className="floating-action-icon">
                                                        <CustomizableIcon category="agua" />
                                                    </div>
                                                    <span>Agua</span>
                                                </button>
                                            )}

                                            {!fallasGeologicasVisible && (
                                                <button 
                                                    className={`floating-action-button mobile-button coming-soon ${selectedAnalysis === null ? 'disabled' : ''}`}
                                                    onClick={handleFallasGeologicasClick}
                                                    disabled={selectedAnalysis === null}
                                                >
                                                    <div className="floating-action-icon">
                                                        <CustomizableIcon category="fallas_geologicas" />
                                                    </div>
                                                    <span>Riesgos</span>
                                                </button>
                                            )}

                                            {!seguridadVialVisible && (
                                                <button 
                                                    className={`floating-action-button mobile-button coming-soon ${selectedAnalysis === null ? 'disabled' : ''}`}
                                                    onClick={handleSeguridadVialClick}
                                                    disabled={selectedAnalysis === null}
                                                >
                                                    <div className="floating-action-icon">
                                                        <CustomizableIcon category="seguridad_vial" />
                                                    </div>
                                                    <span>Seguridad Vial</span>
                                                </button>
                                            )}

                                            {!comercioInformalVisible && (
                                                <button 
                                                    className={`floating-action-button mobile-button coming-soon ${selectedAnalysis === null ? 'disabled' : ''}`}
                                                    onClick={handleComercioInformalClick}
                                                    disabled={selectedAnalysis === null}
                                                >
                                                    <div className="floating-action-icon">
                                                        <CustomizableIcon category="comercio_informal" />
                                                    </div>
                                                    <span>Comercio</span>
                                                </button>
                                            )}

                                            {/* Visual separator for transport features */}
                                            <div className="mobile-separator"></div>

                                            {/* Transport buttons */}
                                            {!transportSystemsVisible && (
                                                <button 
                                                    className={`floating-action-button mobile-button transport ${transportSystemsVisible ? 'active' : ''}`}
                                                    onClick={handleTransportesClick}
                                                >
                                                    <div className="floating-action-icon" style={{transform: 'scale(1.2)'}}>
                                                        <CustomizableIcon category="transporte_publico" />
                                                    </div>
                                                    <span>Transporte</span>
                                                </button>
                                            )}

                                            {!infraestructuraCiclistaVisible && (
                                                <button 
                                                    className={`floating-action-button mobile-button coming-soon ${infraestructuraCiclistaVisible ? 'active' : ''}`}
                                                    onClick={handleInfraestructuraCiclistaClick}
                                                >
                                                    <div className="floating-action-icon">
                                                        <CustomizableIcon category="infraestructura_ciclista" />
                                                    </div>
                                                    <span>Ciclista</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    // Desktop layout: Keep original vertical grid
                                    <React.Fragment>
                                {/* Indicadores Component - only show when oportunidades section is not active */}
                                {!activeSections.oportunidades && (
                                    <button 
                                        className={`floating-action-button ${indicatorsData ? '' : 'disabled'} ${selectedAnalysis === null ? 'disabled' : ''}`}
                                        onClick={handleIndicadoresClick}
                                        disabled={!indicatorsData || selectedAnalysis === null}
                                    >
                                        <div className="floating-action-icon">
                                            <CustomizableIcon category="oportunidades" />
                                            {indicatorsError && (
                                                <div className="error-indicator" title={indicatorsError}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                                        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <span>Oportunidades</span>
                                    </button>
                                )}

                                {/* Agua Component */}
                                {!aguaVisible && (
                                    <button 
                                        className={`floating-action-button ${aguaVisible ? 'active' : ''} ${selectedAnalysis === null ? 'disabled' : ''}`}
                                        onClick={handleAguaClick}
                                        disabled={selectedAnalysis === null}
                                    >
                                        <div className="floating-action-icon">
                                            <CustomizableIcon category="agua" />
                                        </div>
                                        <span>Agua {aguaVisible ? '(Activo)' : ''}</span>
                                        <span className="coming-soon-label">Próximamente</span>
                                    </button>
                                )}

                                {/* Inseguridad Component */}
                                {!activeSections.inseguridad && (
                                    <button 
                                        className={`floating-action-button ${selectedAnalysis === null ? 'disabled' : ''}`}
                                        onClick={handleInseguridadClick}
                                        disabled={selectedAnalysis === null}
                                    >
                                        <div className="floating-action-icon">
                                            <CustomizableIcon category="inseguridad" />
                                        </div>
                                        <span>Inseguridad</span>
                                    </button>
                                )}

                                {/* Fallas geológicas Component */}
                                {!fallasGeologicasVisible && (
                                    <button 
                                        className={`floating-action-button ${fallasGeologicasVisible ? 'active' : ''} ${selectedAnalysis === null ? 'disabled' : ''}`}
                                        onClick={handleFallasGeologicasClick}
                                        disabled={selectedAnalysis === null}
                                    >
                                        <div className="floating-action-icon">
                                            <CustomizableIcon category="fallas_geologicas" />
                                        </div>
                                        <span>Riesgos geológicos {fallasGeologicasVisible ? '(Activo)' : ''}</span>
                                        <span className="coming-soon-label">Próximamente</span>
                                    </button>
                                )}

                                {/* Seguridad Vial Component */}
                                {!seguridadVialVisible && (
                                    <button 
                                        className={`floating-action-button ${seguridadVialVisible ? 'active' : ''} ${selectedAnalysis === null ? 'disabled' : ''}`}
                                        onClick={handleSeguridadVialClick}
                                        disabled={selectedAnalysis === null}
                                    >
                                        <div className="floating-action-icon">
                                            <CustomizableIcon category="seguridad_vial" />
                                        </div>
                                        <span>Seguridad Vial {seguridadVialVisible ? '(Activo)' : ''}</span>
                                        <span className="coming-soon-label">Próximamente</span>
                                    </button>
                                )}

                                {/* Comercio Informal Component */}
                                {!comercioInformalVisible && (
                                    <button 
                                        className={`floating-action-button ${comercioInformalVisible ? 'active' : ''} ${selectedAnalysis === null ? 'disabled' : ''}`}
                                        onClick={handleComercioInformalClick}
                                        disabled={selectedAnalysis === null}
                                    >
                                        <div className="floating-action-icon">
                                            <CustomizableIcon category="comercio_informal" />
                                        </div>
                                        <span>Comercio Informal {comercioInformalVisible ? '(Activo)' : ''}</span>
                                        <span className="coming-soon-label">Próximamente</span>
                                    </button>
                                )}

                                {/* Vivienda Component */}
                                {!activeSections.rentas_temporales && (
                                    <button 
                                        className={`floating-action-button ${selectedAnalysis === null ? 'disabled' : ''}`}
                                        onClick={handleRentasTemporalesClick}
                                        disabled={selectedAnalysis === null}
                                    >
                                        <div className="floating-action-icon">
                                            <CustomizableIcon category="vivienda" />
                                        </div>
                                        <span>Vivienda</span>
                                    </button>
                                )}

                                {/* Movilidad Component */}
                                {!activeSections.movilidad && (
                                    <button 
                                        className={`floating-action-button ${selectedAnalysis === null ? 'disabled' : ''}`}
                                        onClick={handleMovilidadClick}
                                        disabled={selectedAnalysis === null}
                                    >
                                        <div className="floating-action-icon" style={{transform: 'scale(1.2)'}}>
                                            <CustomizableIcon category="movilidad" />
                                        </div>
                                        <span>Movilidad</span>
                                    </button>
                                        )}
                                    </React.Fragment>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="floating-actions-divider"></div>

                            {/* Transport-related buttons section */}
                            <div className={`floating-actions-buttons transport-buttons ${isMobile ? 'mobile-layout' : ''}`}>
                                {isMobile ? (
                                    // Mobile layout: Transport buttons are included in the main horizontal container above
                                    // This section will be empty on mobile to avoid duplication
                                    null
                                ) : (
                                    // Desktop layout: Keep original
                                    <React.Fragment>
                                {/* Transportes Component - only show when transport systems are not visible */}
                                {!transportSystemsVisible && (
                                    <button 
                                        className={`floating-action-button ${transportSystemsVisible ? 'active' : ''}`}
                                        onClick={handleTransportesClick}
                                    >
                                        <div className="floating-action-icon" style={{transform: 'scale(1.2)'}}>
                                            <CustomizableIcon category="transporte_publico" />
                                        </div>
                                        <span>Red de transporte {transportSystemsVisible ? '(Activo)' : ''}</span>
                                    </button>
                                )}

                                {/* Infraestructura Ciclista Component */}
                                {!infraestructuraCiclistaVisible && (
                                    <button 
                                        className={`floating-action-button ${infraestructuraCiclistaVisible ? 'active' : ''}`}
                                        onClick={handleInfraestructuraCiclistaClick}
                                    >
                                        <div className="floating-action-icon">
                                            <CustomizableIcon category="infraestructura_ciclista" />
                                        </div>
                                        <span>Infraestructura ciclista {infraestructuraCiclistaVisible ? '(Activo)' : ''}</span>
                                        <span className="coming-soon-label">Próximamente</span>
                                    </button>
                                        )}
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {showSearchDialog && (
                <LinesNavigator 
                    transportData={transportData}
                    transportSystems={transportSystems}
                    onClose={handleCloseSearch}
                    map={map}
                    onLineSelect={onLineSelect}
                />
            )}
        </div>
    );
});

// Make the component available globally
window.LayersListPanel = LayersListPanel; 