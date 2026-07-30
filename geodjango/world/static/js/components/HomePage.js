// HomePage component - Landing page with state showcase background
function HomePage({ initialStateIndex = 0, showCatchLead = false }) {
    // Detect if we're on the transporte page
    const isTransportePage = window.location.pathname === '/transporte';
    
    // Set initial state based on URL
    const effectiveInitialStateIndex = isTransportePage ? 3 : initialStateIndex;
    const effectiveShowCatchLead = isTransportePage ? true : showCatchLead;
    const catchLeadInit = isTransportePage ? 'mobility' : 'housing';
    
    const [currentState, setCurrentState] = React.useState({
        backgroundColor: "#fff",
        textColor: "#000",
        sliderColor: "#667eea"
    });
    
    const [showCatchLeadPanel, setShowCatchLeadPanel] = React.useState(effectiveShowCatchLead);

    // Listen for URL changes
    React.useEffect(() => {
        const handleUrlChange = () => {
            const currentPath = window.location.pathname;
            if (currentPath === '/transporte') {
                setShowCatchLeadPanel(true);
            }
        };

        // Listen for popstate events (back/forward navigation)
        window.addEventListener('popstate', handleUrlChange);
        
        // Listen for pushstate/replacestate events (programmatic navigation)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            handleUrlChange();
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            handleUrlChange();
        };

        return () => {
            window.removeEventListener('popstate', handleUrlChange);
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
        };
    }, []);
    
    const handleExploreClick = () => {
        // Use the simple navigation
        if (window.navigate) {
            window.navigate('/explorar');
        } else {
            // Fallback to manual navigation
            window.location.href = '/explorar';
        }
    };
    
    const handleAboutClick = () => {
        // TODO: Implement about functionality
        console.log('About clicked');
    };
    
    const handleHelpClick = () => {
        // TODO: Implement help functionality
        console.log('Help clicked');
    };
    
    const handleStateChange = (newState) => {
        setCurrentState(newState);
    };
    
    const handleCloseCatchLeadPanel = () => {
        setShowCatchLeadPanel(false);
    };
    
    const handleShowCatchLeadPanel = () => {
        setShowCatchLeadPanel(true);
    };
    
    return (
        <div className="home-page">
            {/* Navigation Bar */}
            <NavigationBar backgroundColor={`${currentState.backgroundColor}cc`} />
            
            {/* State Showcase Background */}
            <div className="map-background">
                <StateShowcaser 
                    onStateChange={handleStateChange} 
                    initialStateIndex={effectiveInitialStateIndex}
                    onShowCatchLead={handleShowCatchLeadPanel}
                />
            </div>
            
            {/* CatchLead Panel */}
            {showCatchLeadPanel && (
                <CatchLeadPanel onClose={handleCloseCatchLeadPanel} init={catchLeadInit} />
            )}
        </div>
    );
}

// Make the component available globally
window.HomePage = HomePage; 