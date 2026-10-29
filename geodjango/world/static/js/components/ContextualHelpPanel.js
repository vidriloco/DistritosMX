// ContextualHelpPanel component - A help panel that appears below the navigation bar
function ContextualHelpPanel({ isVisible, onClose, routeType, cookieName }) {
    const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
    
    // Cookie utility functions
    const setCookie = (name, value, days = 365) => {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    };
    
    // Listen for path changes
    React.useEffect(() => {
        const handlePathChange = () => {
            setCurrentPath(window.location.pathname);
        };
        
        // Listen for popstate events (browser back/forward)
        window.addEventListener('popstate', handlePathChange);
        
        // Listen for pushstate events (programmatic navigation)
        const originalPushState = window.history.pushState;
        window.history.pushState = function(...args) {
            originalPushState.apply(window.history, args);
            handlePathChange();
        };
        
        return () => {
            window.removeEventListener('popstate', handlePathChange);
            window.history.pushState = originalPushState;
        };
    }, []);
    
    // Check if panel should be visible based on explicit isVisible prop or path
    const shouldShow = isVisible !== undefined ? isVisible : (currentPath === '/explore' || currentPath === '/negocios');
    
    if (!shouldShow) return null;

    // Content configuration based on route
    const getContentForRoute = () => {
        // Use routeType prop first, then fall back to currentPath
        const route = routeType || (currentPath === '/explore' ? 'explore' : currentPath === '/negocios' ? 'negocios' : null);
        
        if (route === 'explore' || currentPath === '/explore') {
            return {
                title: '¿Cómo usar esta herramienta?',
                image: '/static/images/help-image.png',
                steps: [
                    {
                        number: '1',
                        text: 'Elige la unidad espacial en la barra superior: AGEB, colonia o isocronas'
                    },
                    {
                        number: '2',
                        text: 'Elige un tema en el panel de la derecha y un indicador; las zonas se pintan según su valor'
                    },
                    {
                        number: '3',
                        text: 'Pasa el cursor sobre el mapa para ver el valor de cada zona, o mueve el pin para cambiar el radio'
                    }
                ]
            };
        } else if (route === 'negocios' || currentPath === '/negocios') {
            return {
                title: '¿Cómo usar esta herramienta?',
                image: '/static/images/help-image.png',
                steps: [
                    {
                        number: '1',
                        text: 'Escribe una dirección en la barra superior, o haz clic en el mapa para poner el pin'
                    },
                    {
                        number: '2',
                        text: 'Elige hasta tres giros: los chips sobre el mapa los muestran u ocultan'
                    },
                    {
                        number: '3',
                        text: 'Lee el informe de la derecha, cambia el radio y descárgalo en PDF'
                    }
                ]
            };
        }
        return null;
    };

    const handleClose = () => {
        // Set the appropriate cookie if cookieName is provided
        if (cookieName) {
            setCookie(cookieName, 'true');
        }
        
        // Call the parent's onClose handler
        if (onClose) {
            onClose();
        }
    };

    const content = getContentForRoute();
    if (!content) return null;
    const route = routeType || (currentPath === '/explore' ? 'explore' : currentPath === '/negocios' ? 'negocios' : null);

    return (
        <div className={"explore-help-panel" + (route === 'explore' || route === 'negocios' ? ' xb-help' : '')}>
            <div className="help-panel-content">
                <div className="help-panel-image-container">
                    <img 
                        src={content.image} 
                        alt="Ayuda"
                    />
                </div>
                
                <div className="help-panel-text">
                    <h1 className="help-panel-title">
                        {content.title}
                    </h1>
                    
                    
                    <div className="help-panel-steps">
                        {content.steps.map((step, index) => (
                            <div key={index} className="help-step-item">
                                <div className="step-number-large">{step.number}</div>
                                <div className="step-text-below">
                                    {step.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <button 
                    className="help-panel-close-btn"
                    onClick={handleClose}
                    aria-label="Cerrar panel de ayuda"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}

// Make the component available globally
window.ContextualHelpPanel = ContextualHelpPanel; 