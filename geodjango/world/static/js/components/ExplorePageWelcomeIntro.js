// Cookie utility functions
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

// Introduction component for the explore section
function ExploreIntroduction({ onComplete }) {
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    const handleComplete = () => {
        if (dontShowAgain) {
            setCookie('exploreSectionIntro', 'completed');
        }
        onComplete();
    };

    return (
        <div className="explore-introduction-overlay">
            <div className="explore-introduction-container">
                <div className="explore-introduction-content">
                    <div className="explore-intro-image">
                        <img 
                            src="/static/images/risks-heatmap.jpg" 
                            alt="Explorar sección" 
                            className="intro-image"
                        />
                    </div>
                    <div className="explore-intro-text">
                        <h2 className="intro-title">Distritos MX <br /> <span className="intro-emphasis">Explorador de capas</span></h2>
                        <p className="intro-description">
                            Visualiza de forma interactiva datos del INEGI y otras fuentes para entender fenómenos de alcance territorial en México.
                        </p>
                        <p className="intro-small-text">
                            Esta herramienta está en modo beta, por lo que puede presentar errores.
                        </p>
                        <p className="intro-tiny-text">
                            Se recomienda usar esta herramienta en un navegador de escritorio.
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
                                className="intro-button"
                                onClick={handleComplete}
                            >
                                Explorar
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

// ExplorePageWelcomeIntro component - Wraps the existing MapAdminApp for the /explorar route
function ExplorePageWelcomeIntro() {
    const [showIntro, setShowIntro] = React.useState(false);
    const [showHelpPanel, setShowHelpPanel] = React.useState(false);
    const [isHelpPanelAutomatic, setIsHelpPanelAutomatic] = React.useState(false);

    // Check for cookies on component mount
    React.useEffect(() => {
        const introCompleted = getCookie('exploreSectionIntro');
        const helpPanelSeen = getCookie('exploreHelpPanelSeen');
        
        if (!introCompleted) {
            setShowIntro(true);
        } else if (!helpPanelSeen) {
            // If intro was completed but help panel hasn't been seen, show help panel automatically
            setShowHelpPanel(true);
            setIsHelpPanelAutomatic(true);
        }
    }, []);

    const handleIntroComplete = () => {
        setShowIntro(false);
        // After intro completion, check if help panel should be shown automatically
        const helpPanelSeen = getCookie('exploreHelpPanelSeen');
        if (!helpPanelSeen) {
            setShowHelpPanel(true);
            setIsHelpPanelAutomatic(true);
        }
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
        <div className="explore-page">
            {showIntro ? (
                <ExploreIntroduction onComplete={handleIntroComplete} />
            ) : (
                <div>
                    <MapAdminApp 
                        onHelpClick={handleHelpClick} 
                        hideVerticalPanel={showHelpPanel && isHelpPanelAutomatic}
                    />
                    <ContextualHelpPanel 
                        isVisible={showHelpPanel} 
                        onClose={handleHelpPanelClose}
                        routeType="explore"
                        cookieName="exploreHelpPanelSeen"
                    />
                </div>
            )}
        </div>
    );
}

// Make the component available globally
window.ExplorePageWelcomeIntro = ExplorePageWelcomeIntro; 