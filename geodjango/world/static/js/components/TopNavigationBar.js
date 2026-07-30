// TopNavigationBar component - Always visible navigation at the top
function TopNavigationBar({ onHelpClick }) {
    // State to track current path for highlighting active section
    const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    
    // Check if device is mobile
    const isMobile = () => {
        return window.innerWidth <= 768;
    };
    
    // Listen for URL changes (both programmatic and browser navigation)
    React.useEffect(() => {
        const handlePopState = () => {
            setCurrentPath(window.location.pathname);
        };
        
        const handleThemeChange = () => {
            // Force re-render when theme changes to apply new CSS variables
            setCurrentPath(window.location.pathname);
        };
        
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('themeChanged', handleThemeChange);
        
        // Also listen for programmatic navigation
        const originalPushState = window.history.pushState;
        window.history.pushState = function(...args) {
            originalPushState.apply(window.history, args);
            setCurrentPath(window.location.pathname);
        };
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('themeChanged', handleThemeChange);
            window.history.pushState = originalPushState;
        };
    }, []);
    
    // Handle body scroll when mobile menu is open
    React.useEffect(() => {
        if (mobileMenuOpen) {
            document.body.classList.add('menu-open');
        } else {
            document.body.classList.remove('menu-open');
        }
        
        return () => {
            document.body.classList.remove('menu-open');
        };
    }, [mobileMenuOpen]);
    
    // Helper function to check if a path is active
    const isActive = (path) => {
        if (path === '/') {
            return currentPath === '/' || currentPath === '';
        }
        return currentPath.startsWith(path);
    };
    
    // Navigation handler
    const handleNavigation = (path) => {
        // Close mobile menu when navigating
        setMobileMenuOpen(false);
        
        if (window.navigate) {
            window.navigate(path);
        } else {
            window.location.href = path;
        }
    };
    
    // Mobile menu handlers
    const handleMobileMenuToggle = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };
    
    const handleMobileMenuClose = () => {
        setMobileMenuOpen(false);
    };
    
    return (
        <div className="top-navigation-bar">
            <div className="nav-content">
                <div className="nav-logo" onClick={() => handleNavigation('/')} style={{ cursor: 'pointer' }}>
                    <img 
                        src="/static/images/distritos-mx-logo-black.png" 
                        alt="Distritos MX" 
                        className="logo-image"
                        onError={(e) => {
                            // Fallback to text if image fails to load
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <span className="logo-text">Wikiando</span>
                </div>
                
                {/* Desktop Navigation */}
                <div className="nav-actions desktop-nav">
                    <button 
                        className={`nav-button ${isActive('/') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/')}
                    >
                        Inicio
                    </button>
                    <button 
                        className={`nav-button ${isActive('/explorar') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/explorar')}
                    >
                        Explorar
                    </button>
                    <button 
                        className={`nav-button ${isActive('/negocios') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/negocios')}
                    >
                        Negocios
                    </button>
                    <button 
                        className="nav-button help-button"
                        onClick={onHelpClick}
                        title="Ayuda"
                        aria-label="Mostrar ayuda">
                            <svg 
                                width="18" 
                                height="18" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path 
                                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" 
                                    fill="currentColor"
                                />
                            </svg>
                    </button>
                </div>
                
                {/* Mobile Hamburger Menu */}
                <button 
                    className="mobile-menu-button"
                    onClick={handleMobileMenuToggle}
                    aria-label="Abrir menú de navegación"
                >
                    <svg 
                        className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}
                        width="24" 
                        height="24" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                    >
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            {/* Mobile Menu Sidebar */}
            <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}
            >
                <div className="mobile-menu-header">
                    <h3>Menú</h3>
                    <button 
                        className="mobile-menu-close"
                        onClick={handleMobileMenuClose}
                        aria-label="Cerrar menú"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div className="mobile-menu-content">
                    <button 
                        className={`mobile-nav-button ${isActive('/') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/')}
                    >
                        Inicio
                    </button>
                    <button 
                        className={`mobile-nav-button ${isActive('/explorar') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/explorar')}
                    >
                        Explorar
                    </button>
                    <button 
                        className={`mobile-nav-button ${isActive('/negocios') ? 'active' : ''}`}
                        onClick={() => handleNavigation('/negocios')}
                    >
                        Negocios
                    </button>
                    <button 
                        className="mobile-nav-button help-button"
                        onClick={() => {
                            onHelpClick();
                            handleMobileMenuClose();
                        }}
                    >
                        Ayuda
                    </button>
                </div>
            </div>
        </div>
    );
}

// Make the component available globally
window.TopNavigationBar = TopNavigationBar; 