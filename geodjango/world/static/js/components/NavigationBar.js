// NavigationBar component - Reusable navigation bar
function NavigationBar({ backgroundColor = "rgba(255, 255, 255, 0.95)" }) {
    const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
    const [analisisOpen, setAnalisisOpen] = React.useState(false);
    const [contactOpen, setContactOpen] = React.useState(false);
    const analisisRef = React.useRef(null);

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
    
    // Close the Análisis dropdown when clicking outside or pressing Escape
    React.useEffect(() => {
        if (!analisisOpen) return;

        const handleClickOutside = (e) => {
            if (analisisRef.current && !analisisRef.current.contains(e.target)) {
                setAnalisisOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setAnalisisOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [analisisOpen]);

    const handleDespojosClick = () => {
        setAnalisisOpen(false);
        if (window.navigate) {
            window.navigate('/proyectos/mapas/despojos-viviendas');
        } else {
            window.location.href = '/proyectos/mapas/despojos-viviendas';
        }
    };

    const handleContactoClick = () => {
        setAnalisisOpen(false);
        setContactOpen(true);
    };

    const handleContactClose = React.useCallback(() => setContactOpen(false), []);

    const handleAcercaDeClick = () => {
        if (window.navigate) {
            window.navigate('/acerca-de');
        } else {
            window.location.href = '/acerca-de';
        }
    };
    
    // Loaded as a separate babel script, so it may not be defined yet.
    const ContactModal = window.ContactForm || (() => null);

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
                    <div className="nav-dropdown" ref={analisisRef}>
                        <button
                            className="nav-button nav-dropdown-toggle"
                            onClick={() => setAnalisisOpen(!analisisOpen)}
                            style={{ color: '#fff' }}
                            aria-haspopup="true"
                            aria-expanded={analisisOpen}
                        >
                            Análisis
                            <span className={`nav-dropdown-caret ${analisisOpen ? 'open' : ''}`} aria-hidden="true">▾</span>
                        </button>
                        {analisisOpen && (
                            <div className="nav-dropdown-menu" role="menu">
                                <button
                                    className="nav-dropdown-item"
                                    onClick={handleDespojosClick}
                                    role="menuitem"
                                >
                                    Despojos
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        className="nav-button"
                        onClick={handleContactoClick}
                        style={{ color: '#fff' }}
                    >
                        Contacto
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

            <ContactModal open={contactOpen} onClose={handleContactClose} />
        </nav>
    );
}

// Make the component available globally
window.NavigationBar = NavigationBar; 