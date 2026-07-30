// NavigationBar component - Reusable navigation bar
function NavigationBar({ backgroundColor = "rgba(255, 255, 255, 0.95)" }) {
    const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
    
    // Listen for path changes
    React.useEffect(() => {
        const updatePath = () => {
            const newPath = window.location.pathname;
            setCurrentPath(newPath);
        };
        
        // Update path immediately
        updatePath();
        
        // Listen for custom pathchange event
        const handlePathChange = (e) => {
            if (e.detail && e.detail.path) {
                setCurrentPath(e.detail.path);
            } else {
                updatePath();
            }
        };
        
        // Also listen for popstate (browser back/forward)
        const handlePopState = () => {
            updatePath();
        };
        
        window.addEventListener('pathchange', handlePathChange);
        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('pathchange', handlePathChange);
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);
    
    const handleExplorarClick = () => {
        if (window.navigate) {
            window.navigate('/explorar');
        } else {
            window.location.href = '/explorar';
        }
    };
    
    const handleNegociosClick = () => {
        if (window.navigate) {
            window.navigate('/negocios');
        } else {
            window.location.href = '/negocios';
        }
    };
    
    const handleAcercaDeClick = () => {
        if (window.navigate) {
            window.navigate('/acerca-de');
        } else {
            window.location.href = '/acerca-de';
        }
    };
    
    // Check path - use both state and direct check for reliability
    const currentPathCheck = currentPath || window.location.pathname;
    const isMundial2025 = currentPathCheck === '/proyectos/mundial-2025';
    
    
    return (
        <nav className="navigation-bar">
            <div 
                className="nav-content"
                style={{ 
                    '--nav-background-color': backgroundColor
                }}
            >
                <div className="nav-logo">
                    <img 
                        src="/static/images/distritos-mx-logo.png" 
                        alt="Distrito MX Logo" 
                        className="logo-image"
                        onError={(e) => {
                            // Fallback to text if image fails to load
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                </div>
                
                <div className="nav-actions">
                    <button 
                        className="nav-button"
                        onClick={handleExplorarClick}
                        style={{ color: '#fff' }}
                    >
                        Explorar
                    </button>
                    <button 
                        className="nav-button"
                        onClick={handleNegociosClick}
                        style={{ color: '#fff' }}
                    >
                        Negocios
                    </button>
                    {isMundial2025 && (
                        <div 
                            className="nav-title"
                            style={{
                                color: '#fff',
                                display: 'block',
                                visibility: 'visible',
                                opacity: 1
                            }}
                        >
                            Mundial 2025
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

// Make the component available globally
window.NavigationBar = NavigationBar; 