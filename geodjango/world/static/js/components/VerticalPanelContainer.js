
function VerticalPanelContainer({ 
    map, 
    showSearchDialog, 
    setShowSearchDialog, 
    onLineSelect, 
    indicatorsData, 
    indicatorsLoading, 
    indicatorsError, 
    indicatorsVisible, 
    setIndicatorsVisible,
    transportSystemsVisible,
    setTransportSystemsVisible,
    onElementAnalysisClick,
    intersectingFeatures,
    hoveredFeature,
    selectedIndicator,
    onIndicatorSelect,
    selectedRadius,
    onRadiusChange,
    selectedYearCrime,
    onCrimeYearChange,
    selectedStation,
    onCloseStationDetails,
    selectedLine,
    onCloseLineDetails,
    lineDetailsPanelRef,
    selectedGeozone,
    onCloseGeozoneDetails,
    geozoneDetailsPanelRef,
    scopeAnalysis,
    // Add new props for layer management
    removeAllAnalysisLayers,
    removeAgebDataLayers,
    setSelectedIndicator,
    setIsClearingDueToSectionClose,
    // New props for TransportSystemsPanel
    onStationSelect,
    onShowFloatingActions,
    onLayerPanelCollapse
}) {
    // Get transportSystems from global scope
    const transportSystems = window.transportSystems || {};

    // Add state to track the selected analysis
    const [selectedAnalysis, setSelectedAnalysis] = React.useState(null);
    
    // Add state to track which sections are active
    const [activeSections, setActiveSections] = React.useState({
        oportunidades: false,
        inseguridad: false,
        rentas_temporales: false,
        movilidad: false
    });

    // Add refs for the panels
    const stationPanelRef = React.useRef(null);
    const indicatorsPanelRef = React.useRef(null);
    const layersListPanelRef = React.useRef(null);
    
    // Add state for transport data (managed by TransportSystemsPanel)
    const [transportData, setTransportData] = React.useState({});
    
    // Add state to track if we're on mobile
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

    // Handle window resize for mobile detection
    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Expand LayersListPanel when scopeAnalysis is set
    React.useEffect(() => {
        if (scopeAnalysis && layersListPanelRef.current && layersListPanelRef.current.expand) {
            layersListPanelRef.current.expand();
        }
    }, [scopeAnalysis]);

    // Handler for when an analysis type is selected
    const handleAnalysisSelect = (analysis) => {
        setSelectedAnalysis(analysis);
        onElementAnalysisClick(analysis);
    };
    
    // Handler for when indicators panel is closed
    const handleIndicatorsClose = () => {
        setIndicatorsVisible(false);
        setActiveSections({
            oportunidades: false,
            inseguridad: false,
            rentas_temporales: false,
            movilidad: false
        });
        
        // Remove all analysis layers when indicators panel is closed
        if (removeAllAnalysisLayers) {
            removeAllAnalysisLayers();
        }
    };
    
    // Handler for when a specific section is closed
    const handleSectionClose = (sectionName) => {
        setActiveSections(prev => ({
            ...prev,
            [sectionName]: false
        }));
        
        // Clear the selected indicator if it belongs to the closed section
        let shouldRemoveLayers = false;
        if (selectedIndicator) {
            const indicatorBelongsToSection = (indicator, section) => {
                switch (section) {
                    case 'oportunidades':
                        return ['population', 'companies', 'jobs', 'education', 'health', 'provision', 'leisure'].includes(indicator);
                    case 'inseguridad':
                        return indicator.startsWith('thefts_') || 
                               indicator.startsWith('sexual_assault_') || 
                               indicator.startsWith('house_thefts_') || 
                               indicator.startsWith('business_thefts_');
                    case 'rentas_temporales':
                        return indicator.startsWith('airbnb_listings');
                    case 'movilidad':
                        return indicator.endsWith('_stations');
                    default:
                        return false;
                }
            };
            
            if (indicatorBelongsToSection(selectedIndicator, sectionName)) {
                // Set the clearing flag to prevent layer recreation
                if (setIsClearingDueToSectionClose) {
                    setIsClearingDueToSectionClose(true);
                }
                
                // Clear the selected indicator since its section was closed
                // Don't call onIndicatorSelect to avoid triggering layer recreation
                // The useEffect in MapAdminApp will handle the state change
                setSelectedIndicator(null);
                shouldRemoveLayers = true;
            }
        }
        
        // Check if no sections will be active after closing this one
        const newSections = { ...activeSections, [sectionName]: false };
        const noSectionsActive = !Object.values(newSections).some(active => active);
        
        // Remove map layers only if:
        // 1. The selected indicator belongs to the closed section, OR
        // 2. No sections will be active after closing this one
        if ((shouldRemoveLayers || noSectionsActive) && map && removeAgebDataLayers) {
            // Remove the data visualization layers for the closed section
            removeAgebDataLayers();
        }
        
        // If no sections are active, hide the indicators panel
        if (noSectionsActive) {
            setIndicatorsVisible(false);
            
            // Remove all analysis layers when no sections are active
            if (removeAllAnalysisLayers) {
                removeAllAnalysisLayers();
            }
        }
    };

    // Handler for when the first indicator group is selected
    const handleFirstIndicatorSelection = (sectionName) => {
        // Check if this is the first indicator group being activated
        const isFirstSelection = !Object.values(activeSections).some(active => active);
        
        if (isFirstSelection) {
            // Collapse the LayersListPanel
            if (layersListPanelRef.current && layersListPanelRef.current.collapse) {
                layersListPanelRef.current.collapse();
            }
        }
        
        // Always scroll to the top of the IndicatorsPanel when a new section is activated
        setTimeout(() => {
            console.log('Attempting to scroll to top of IndicatorsPanel...');
            if (indicatorsPanelRef.current && indicatorsPanelRef.current.scrollIntoView) {
                indicatorsPanelRef.current.scrollIntoView();
            }
        }, 200); // Increased delay to ensure panel is fully rendered
    };

    // Enhanced setActiveSections that triggers the first selection behavior
    const handleSetActiveSections = (newSectionsOrFunction) => {

        // Handle both direct state updates and functional updates
        let newSections;
        if (typeof newSectionsOrFunction === 'function') {
            newSections = newSectionsOrFunction(activeSections);
        } else {
            newSections = newSectionsOrFunction;
        }
                
        // Check if this is the first time any section is being activated
        const wasAnyActive = Object.values(activeSections).some(active => active);
        const willBeActive = Object.values(newSections).some(active => active);
        
        // Find which new sections are being activated
        const newlyActivatedSections = Object.keys(newSections).filter(key => 
            newSections[key] && !activeSections[key]
        );
                
        if (!wasAnyActive && willBeActive) {
            // Find which section is being activated
            const activatedSection = Object.keys(newSections).find(key => newSections[key] && !activeSections[key]);
            
            if (activatedSection) {
                handleFirstIndicatorSelection(activatedSection);
                // Auto-select the first indicator for the newly activated section
                autoSelectFirstIndicator(activatedSection);
            }
        } else if (wasAnyActive && willBeActive) {
            // Check if a new section is being added (not just the first one)
            const newSectionsArray = Object.keys(newSections).filter(key => newSections[key]);
            const currentSectionsArray = Object.keys(activeSections).filter(key => activeSections[key]);
            
            // If there are more active sections now than before, a new one was added
            if (newSectionsArray.length > currentSectionsArray.length) {
                const newSection = newSectionsArray.find(key => !currentSectionsArray.includes(key));
                
                // Auto-select the first indicator for the newly activated section
                if (newSection) {
                    autoSelectFirstIndicator(newSection);
                }
                
                // Scroll to the top of the IndicatorsPanel for any new section
                setTimeout(() => {
                    console.log('Attempting to scroll to top of IndicatorsPanel for new section...');
                    if (indicatorsPanelRef.current && indicatorsPanelRef.current.scrollIntoView) {
                        indicatorsPanelRef.current.scrollIntoView();
                    }
                }, 200);
            }
        }
        
        setActiveSections(newSections);
    };

    // Function to auto-select the first indicator for a given section
    const autoSelectFirstIndicator = (sectionName) => {
        
        let firstIndicator = null;
        
        // Define the first indicator for each section
        switch (sectionName) {
            case 'oportunidades':
                firstIndicator = { property: 'population', name: 'Población' };
                break;
            case 'inseguridad':
                // For crime indicators, we need to use the current selected year
                const crimeYear = selectedYearCrime || 2022;
                firstIndicator = { property: `thefts_${crimeYear}`, name: 'Robos en transporte público' };
                break;
            case 'rentas_temporales':
                firstIndicator = { property: 'airbnb_listings', name: 'Número de Airbnbs' };
                break;
            case 'movilidad':
                firstIndicator = { property: 'ecobici_stations', name: 'Estaciones Ecobici' };
                break;
            default:
                return;
        }
                
        // Call the onIndicatorSelect function to select the first indicator with a small delay
        if (onIndicatorSelect && firstIndicator) {
            setTimeout(() => {
                onIndicatorSelect(firstIndicator);
            }, 100); // Small delay to ensure panel is rendered
        }
    };

    // Scroll to station panel when selectedStation changes
    React.useEffect(() => {
        if (selectedStation && stationPanelRef.current) {
            // Small delay to ensure the panel is rendered
            setTimeout(() => {
                stationPanelRef.current.scrollIntoView();
            }, 100);
        }
    }, [selectedStation]);

    // Scroll to line panel when selectedLine changes
    React.useEffect(() => {
        if (selectedLine && lineDetailsPanelRef && lineDetailsPanelRef.current) {
            // Small delay to ensure the panel is rendered
            setTimeout(() => {
                lineDetailsPanelRef.current.scrollIntoView();
            }, 100);
        }
    }, [selectedLine, lineDetailsPanelRef]);
    
    // Scroll to geozone panel when selectedGeozone changes
    React.useEffect(() => {
        if (selectedGeozone && geozoneDetailsPanelRef && geozoneDetailsPanelRef.current) {
            // Small delay to ensure the panel is rendered
            setTimeout(() => {
                geozoneDetailsPanelRef.current.scrollIntoView();
            }, 100);
        }
    }, [selectedGeozone, geozoneDetailsPanelRef]);
    
    // Handle crime year changes - update selected indicator if it's a crime indicator
    React.useEffect(() => {
        if (selectedIndicator && selectedIndicator.startsWith('thefts_') || 
            selectedIndicator && selectedIndicator.startsWith('sexual_assault_') ||
            selectedIndicator && selectedIndicator.startsWith('house_thefts_') ||
            selectedIndicator && selectedIndicator.startsWith('business_thefts_')) {
            
            // Extract the crime type from the current indicator
            let crimeType = null;
            let crimeName = null;
            if (selectedIndicator.startsWith('thefts_')) {
                crimeType = 'thefts';
                crimeName = 'Robos en transporte público';
            } else if (selectedIndicator.startsWith('sexual_assault_')) {
                crimeType = 'sexual_assault';
                crimeName = 'Delitos sexuales';
            } else if (selectedIndicator.startsWith('house_thefts_')) {
                crimeType = 'house_thefts';
                crimeName = 'Robos a casa habitación';
            } else if (selectedIndicator.startsWith('business_thefts_')) {
                crimeType = 'business_thefts';
                crimeName = 'Robos a negocios';
            }
            
            if (crimeType) {
                const newIndicator = `${crimeType}_${selectedYearCrime}`;
                if (onIndicatorSelect) {
                    onIndicatorSelect({ property: newIndicator, name: crimeName });
                }
            }
        }
    }, [selectedYearCrime, selectedIndicator, onIndicatorSelect]);
    
    return (
        <div className="vertical-panel-container">
            <div className="vertical-panel-content">
                    <Spacer value={100} axis="vertical" />
                    {isMobile ? (
                        <MobilePrimaryPanel />
                    ) : (
                        // Desktop: Show normal panels
                        <React.Fragment>
                            <LandAnalysis 
                                onElementAnalysisClick={handleAnalysisSelect}
                                selectedRadius={selectedRadius}
                                onRadiusChange={onRadiusChange}
                            />
                            {selectedGeozone ? (
                                // Show only GeozoneDetailsPanel when a geozone is selected
                                <GeozoneDetailsPanel 
                                    ref={geozoneDetailsPanelRef}
                                    selectedGeozone={selectedGeozone}
                                    onClose={onCloseGeozoneDetails}
                                />
                            ) : (
                                // Show all other panels when no geozone is selected
                                <React.Fragment>
                    {indicatorsVisible && (
                        <IndicatorsPanel 
                            ref={indicatorsPanelRef}
                            indicatorsData={indicatorsData}
                            onClose={handleIndicatorsClose}
                            intersectingFeatures={intersectingFeatures}
                            hoveredFeature={hoveredFeature}
                            selectedIndicator={selectedIndicator}
                            onIndicatorSelect={onIndicatorSelect}
                            selectedYearCrime={selectedYearCrime}
                            onCrimeYearChange={onCrimeYearChange}
                            activeSections={activeSections}
                            onSectionClose={handleSectionClose}
                        />
                    )}
                    {transportSystemsVisible && (
                        (() => {
                            return window.TransportSystemsPanel ? (
                            <TransportSystemsPanel 
                                onClose={() => setTransportSystemsVisible(false)}
                                map={map}
                                onTransportDataChange={setTransportData}
                                onLineSelect={onLineSelect}
                                onStationSelect={onStationSelect}
                                onShowFloatingActions={onShowFloatingActions}
                                onLayerPanelCollapse={onLayerPanelCollapse}
                                lineDetailsPanelRef={lineDetailsPanelRef}
                            />
                        ) : (
                            <div className="floating-actions-container">
                                <div className="floating-actions-header">
                                    <button className="close-floating-actions-button" onClick={() => setTransportSystemsVisible(false)}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                    <h3 className="floating-actions-title">Sistemas de Transporte</h3>
                                </div>
                                <div className="floating-actions-content">
                                    <div className="floating-actions-section">
                                        <p>Cargando sistemas de transporte...</p>
                                    </div>
                                </div>
                            </div>
                        );
                        })()
                    )}
                            </React.Fragment>
                            )}
                            <LayersListPanel 
                                ref={layersListPanelRef}
                                map={map}
                                showSearchDialog={showSearchDialog}
                                setShowSearchDialog={setShowSearchDialog}
                                onLineSelect={onLineSelect}
                                indicatorsData={indicatorsData}
                                indicatorsLoading={indicatorsLoading}
                                indicatorsError={indicatorsError}
                                indicatorsVisible={indicatorsVisible}
                                setIndicatorsVisible={setIndicatorsVisible}
                                transportSystemsVisible={transportSystemsVisible}
                                setTransportSystemsVisible={setTransportSystemsVisible}
                                selectedAnalysis={selectedAnalysis}
                                activeSections={activeSections}
                                setActiveSections={handleSetActiveSections}
                            />
                            {selectedLine && (
                                <LineDetailsPanel 
                                    ref={lineDetailsPanelRef}
                                    selectedLine={selectedLine}
                                    transportSystems={transportSystems}
                                    onClose={onCloseLineDetails}
                                />
                            )}
                            {selectedStation && (
                                <StationDetailsPanel 
                                    ref={stationPanelRef}
                                    selectedStation={selectedStation}
                                    onClose={onCloseStationDetails}
                                />
                            )}
                        </React.Fragment>
                    )}
            </div>
        </div>
    );
}

// Make the component available globally
window.VerticalPanelContainer = VerticalPanelContainer;