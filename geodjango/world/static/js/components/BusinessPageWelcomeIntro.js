// Cookie utility functions (reused from ExplorePageWelcomeIntro)
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

const setCookie = (name, value, days = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

// Introduction component for the business section
function BusinessIntroduction({ onComplete }) {
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    const handleComplete = () => {
        if (dontShowAgain) {
            setCookie('businessSectionIntro', 'completed');
        }
        onComplete();
    };

    return (
        <div className="business-introduction-overlay">
            <div className="business-introduction-container">
                <div className="business-introduction-content">
                    <div className="business-intro-image">
                        <img 
                            src="/static/images/business-section.jpg" 
                            alt="Negocios sección" 
                            className="intro-image"
                        />
                    </div>
                    <div className="business-intro-text">
                        <h2 className="intro-title">Distritos MX <br /> <span className="intro-emphasis">Analítica de Negocios</span></h2>
                        <p className="intro-description">
                            Descubre oportunidades de negocio mediante el análisis de datos geográficos y socioeconómicos de la República Mexicana.
                        </p>
                        <div className="intro-actions-container">
                            <div className="intro-checkbox-container">
                                <input 
                                    type="checkbox" 
                                    id="dont-show-intro" 
                                    className="intro-checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                />
                                <label htmlFor="dont-show-intro" className="intro-checkbox-label">
                                    No mostrar de nuevo
                                </label>
                            </div>
                            
                            <button 
                                className="empezar-button"
                                onClick={handleComplete}
                            >
                                Empezar
                                    <svg 
                                        className="chevron-right" 
                                        width="16" 
                                        height="16" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                    >
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// BusinessPageWelcomeIntro component - Wraps the existing MapAdminApp for the /negocios route
function BusinessPageWelcomeIntro() {
    const [showIntro, setShowIntro] = React.useState(false);
    const [showWizard, setShowWizard] = React.useState(false);
    const [showHelpPanel, setShowHelpPanel] = React.useState(false);
    const [isHelpPanelAutomatic, setIsHelpPanelAutomatic] = React.useState(false);
    
    // Business stats state
    const [wizardData, setWizardData] = React.useState(null);
    const [categoryColorMapping, setCategoryColorMapping] = React.useState({});
    const [wizardInitialState, setWizardInitialState] = React.useState('location-selection');
    const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

    // Check for cookies and route on component mount
    React.useEffect(() => {
        const introCompleted = getCookie('businessSectionIntro');
        
        // If we're on the base /negocios route
        if (currentPath === '/negocios') {
            if (!introCompleted) {
                // Show welcome first if cookie is not set
                setShowIntro(true);
                setShowWizard(false);
            } else {
                // Show wizard in first state if welcome cookie is set
                setShowIntro(false);
                setShowWizard(true);
                setWizardInitialState('location-selection');
            }
        }
    }, [currentPath]);

    // Listen for path changes (both popstate and custom pathchange events)
    React.useEffect(() => {
        const handlePathChange = () => {
            setCurrentPath(window.location.pathname);
        };
        
        const handleCustomPathChange = (event) => {
            setCurrentPath(event.detail.path);
        };
        
        window.addEventListener('popstate', handlePathChange);
        window.addEventListener('pathchange', handleCustomPathChange);
        
        return () => {
            window.removeEventListener('popstate', handlePathChange);
            window.removeEventListener('pathchange', handleCustomPathChange);
        };
    }, []);

    // Parse URL parameters for /negocios/review route
    React.useEffect(() => {
        // Use the currentPath state instead of window.location.pathname
        console.log('🔄 URL parsing effect triggered for path:', currentPath);
        
        // Reset state if we're on the base /negocios route
        if (currentPath === '/negocios') {
            console.log('🏠 On base /negocios route - checking cookies and setting state');
            setWizardData(null);
            setWizardInitialState('location-selection');
            
            // Check cookies to determine what to show
            const introCompleted = getCookie('businessSectionIntro');
            
            if (!introCompleted) {
                setShowIntro(true);
                setShowWizard(false);
            } else {
                setShowIntro(false);
                setShowWizard(true);
            }
            return;
        }
        
        // Check if we're on the review route
        if (currentPath.startsWith('/negocios/review')) {
            const urlParams = new URLSearchParams(window.location.search);
            const coordinates = urlParams.get('c');
            const radius = urlParams.get('r');
            const categories = urlParams.get('i');
            
            console.log('🔍 Parsing URL parameters for review route:', { coordinates, radius, categories });
            
            if (coordinates && radius && categories) {
                // Parse coordinates (format: "lat,lng")
                const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    // Parse radius
                    const radiusValue = parseInt(radius);
                    
                    // Parse categories (format: "code1,code2,code3")
                    const categoryCodes = categories.split(',').map(code => code.trim());
                    
                    console.log('📊 Parsed parameters:', {
                        lat,
                        lng,
                        radius: radiusValue,
                        categoryCodes
                    });
                    
                    // Create initial data for the wizard
                    const initialData = {
                        location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, // Temporary location name
                        coordinates: { lat, lng },
                        selectedCategories: [], // Will be populated when categories data loads
                        selectedRadius: radiusValue,
                        selectedLocation: {
                            lat: lat.toString(),
                            lon: lng.toString(),
                            display_name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                        }
                    };
                    
                    // Set the wizard to review state with the parsed data
                    setWizardInitialState('review-of-selection');
                    setWizardData(initialData);
                    setShowWizard(true);
                    setShowIntro(false); // Skip intro when coming from URL
                    
                    // Store category codes for later use when categories data loads
                    window.pendingCategoryCodes = categoryCodes;
                    
                    // Store initialData globally for persistence across state changes
                    window.businessWizardInitialData = initialData;
                    
                    console.log('✅ Initialized wizard with URL parameters');
                } else {
                    console.error('❌ Invalid coordinates format:', coordinates);
                }
            } else {
                console.warn('⚠️ Missing required URL parameters for review route');
            }
        }
        // Check if we're on the stats route
        else if (currentPath.startsWith('/negocios/stats')) {
            const urlParams = new URLSearchParams(window.location.search);
            const coordinates = urlParams.get('c');
            const radius = urlParams.get('r');
            const categories = urlParams.get('i');
            
            console.log('📊 Parsing URL parameters for stats route:', { coordinates, radius, categories });
            
            if (coordinates && radius && categories) {
                // Parse coordinates (format: "lat,lng")
                const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    // Parse radius
                    const radiusValue = parseInt(radius);
                    
                    // Parse categories (format: "code1,code2,code3")
                    const categoryCodes = categories.split(',').map(code => code.trim());
                    
                    console.log('📊 Parsed stats parameters:', {
                        lat,
                        lng,
                        radius: radiusValue,
                        categoryCodes
                    });
                    
                    // Create wizard data for stats pane
                    const statsWizardData = {
                        location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                        coordinates: { lat, lng },
                        selectedCategories: [], // Will be populated when categories data loads
                        selectedRadius: radiusValue,
                        selectedLocation: {
                            lat: lat.toString(),
                            lon: lng.toString(),
                            display_name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                        }
                    };
                    
                    // Set the stats data and show stats pane
                    setWizardData(statsWizardData);
                    setShowWizard(false);
                    setShowIntro(false);
                    
                    // Store category codes for later use when categories data loads
                    window.pendingStatsCategoryCodes = categoryCodes;
                    
                    // Store pending stats data for reconstruction
                    window.pendingStatsData = {
                        coordinates: { lat, lng },
                        radius: radiusValue,
                        categoryCodes: categoryCodes
                    };
                    
                    console.log('✅ Initialized stats pane with URL parameters');
                } else {
                    console.error('❌ Invalid coordinates format for stats route:', coordinates);
                }
            } else {
                console.warn('⚠️ Missing required URL parameters for stats route');
            }
        }
    }, [currentPath]);

    const handleIntroComplete = () => {
        setShowIntro(false);
        // After intro completion, show wizard in first state
        setShowWizard(true);
        setWizardInitialState('location-selection');
    };

    const handleWizardComplete = (wizardData) => {
        console.log('Business wizard completed with data:', wizardData);
        setWizardData(wizardData);
        setCategoryColorMapping(wizardData.categoryColorMapping || {});
        setCookie('businessWizardCompleted', 'true');
        setShowWizard(false);
    };

    const handleReturnToWizard = () => {
        setWizardInitialState('review-of-selection');
        setShowWizard(true);
        // Clear the global stats data so the pane doesn't show again immediately
        window.businessStatsData = null;
    };

    const handleHelpClick = () => {
        if (showHelpPanel) {
            // If help panel is already visible, close it
            setShowHelpPanel(false);
            setIsHelpPanelAutomatic(false);
        } else {
            // Manual help click - don't hide VerticalPanel
            setShowHelpPanel(true);
            setIsHelpPanelAutomatic(false);
        }
    };

    const handleHelpPanelClose = () => {
        setShowHelpPanel(false);
        setIsHelpPanelAutomatic(false);
        // Cookie setting is now handled by ContextualHelpPanel
    };

    return (
        <div className="business-page">
            {showIntro ? (
                <BusinessIntroduction onComplete={handleIntroComplete} />
            ) : (showWizard && !currentPath.startsWith('/negocios/stats')) ? (
                <div>
                    <MapAdminApp 
                        onHelpClick={handleHelpClick} 
                        hideVerticalPanel={true}
                    />
                    <BusinessWizard 
                        onComplete={handleWizardComplete}
                        onClose={() => setShowWizard(false)}
                        initialState={wizardInitialState}
                        initialData={wizardData}
                    />
                    <ContextualHelpPanel 
                        isVisible={showHelpPanel} 
                        onClose={handleHelpPanelClose}
                        routeType="negocios"
                        cookieName="businessHelpPanelSeen"
                    />
                </div>
            ) : (
                <div>
                    <MapAdminApp 
                        onHelpClick={handleHelpClick} 
                        hideVerticalPanel={true}
                    />
                    <BusinessStatsPane 
                        onReturnToWizard={handleReturnToWizard}
                    />
                    <ContextualHelpPanel 
                        isVisible={showHelpPanel} 
                        onClose={handleHelpPanelClose}
                        routeType="negocios"
                        cookieName="businessHelpPanelSeen"
                    />
                </div>
            )}
        </div>
    );
}

// Make the component available globally
window.BusinessPageWelcomeIntro = BusinessPageWelcomeIntro; 