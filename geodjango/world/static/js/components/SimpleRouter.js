// Simple custom router implementation
function SimpleRouter() {
    const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
    // Show modal by default if on mundial-2025 path, will be updated after auth check
    const [showPasswordModal, setShowPasswordModal] = React.useState(
        window.location.pathname === '/proyectos/mundial-2025'
    );
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = React.useState(
        window.location.pathname === '/proyectos/mundial-2025'
    );
    // State for layers panel collapse
    const [isLayersPanelCollapsed, setIsLayersPanelCollapsed] = React.useState(true);
    // State for table modal
    const [showTableModal, setShowTableModal] = React.useState(false);
    const [tableCsvUrl, setTableCsvUrl] = React.useState('https://distritosmexico.s3.us-east-2.amazonaws.com/projects/mundial/matching-trips.csv');
    const [tableModalTitle, setTableModalTitle] = React.useState('Tabla de viajes entre polígonos');
    
    // Prevent body scroll when table modal is open
    React.useEffect(() => {
        if (showTableModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showTableModal]);
    
    // Check authentication status for mundial-2025
    const checkAuthentication = async () => {
        if (currentPath === '/proyectos/mundial-2025') {
            setIsCheckingAuth(true);
            try {
                // Check if authenticated by making a request to verify session
                const response = await fetch('/api/mundial-2025/check-auth', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.authenticated) {
                        setIsAuthenticated(true);
                        setShowPasswordModal(false);
                        setIsCheckingAuth(false);
                        return;
                    }
                }
                // If not authenticated or error, show modal
                setIsAuthenticated(false);
                setShowPasswordModal(true);
                setIsCheckingAuth(false);
            } catch (error) {
                // On error, show modal
                setIsAuthenticated(false);
                setShowPasswordModal(true);
                setIsCheckingAuth(false);
            }
        } else {
            setIsAuthenticated(false);
            setShowPasswordModal(false);
            setIsCheckingAuth(false);
        }
    };
    
    // Check authentication when path changes to mundial-2025
    React.useEffect(() => {
        if (currentPath === '/proyectos/mundial-2025') {
            checkAuthentication();
        }
    }, [currentPath]);
    
    // Track initial page load events
    React.useEffect(() => {
        if (window.analyticsService) {
            const path = window.location.pathname;
            if (path === '/explorar' || path === '/explorar/') {
                window.analyticsService.track('EXPLORE_VISITED', {
                    page_path: path,
                    navigation_type: 'initial_load'
                });
            } else if (path.startsWith('/negocios')) {
                window.analyticsService.track('BUSINESS_VISITED', {
                    page_path: path,
                    navigation_type: 'initial_load'
                });
            } else if (path === '/transporte') {
                window.analyticsService.track('TRANSPORT_VISITED', {
                    page_path: path,
                    navigation_type: 'initial_load'
                });
            } else if (path === '/proyectos/mundial-2025') {
                window.analyticsService.track('RECORRIDOS_VISITED', {
                    page_path: path,
                    navigation_type: 'initial_load'
                });
            }
        }
    }, []);
    
    // Listen for browser back/forward buttons
    React.useEffect(() => {
        const handlePopState = () => {
            const newPath = window.location.pathname;
            setCurrentPath(newPath);
            
            // Update SEO tags for the new route
            if (window.updatePageSEO) {
                window.updatePageSEO(newPath);
            }
            
            // Track navigation events for back/forward
            if (window.analyticsService) {
                            if (newPath === '/explorar' || newPath === '/explorar/') {
                window.analyticsService.track('EXPLORE_VISITED', {
                    page_path: newPath,
                    navigation_type: 'browser_navigation',
                    previous_path: currentPath
                });
            } else if (newPath.startsWith('/negocios')) {
                window.analyticsService.track('BUSINESS_VISITED', {
                    page_path: newPath,
                    navigation_type: 'browser_navigation',
                    previous_path: currentPath
                });
            } else if (newPath === '/transporte') {
                window.analyticsService.track('TRANSPORT_VISITED', {
                    page_path: newPath,
                    navigation_type: 'browser_navigation',
                    previous_path: currentPath
                });
            } else if (newPath === '/proyectos/mundial-2025') {
                window.analyticsService.track('RECORRIDOS_VISITED', {
                    page_path: newPath,
                    navigation_type: 'browser_navigation',
                    previous_path: currentPath
                });
            }
            }
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [currentPath]);
    
    // Function to navigate programmatically
    const navigate = (path) => {
        window.history.pushState({}, '', path);
        setCurrentPath(path);
        
        // Update SEO tags for the new route
        if (window.updatePageSEO) {
            window.updatePageSEO(path);
        }
        
        // Track navigation events
        if (window.analyticsService) {
            if (path === '/explorar' || path === '/explorar/') {
                window.analyticsService.track('EXPLORE_VISITED', {
                    page_path: path,
                    navigation_type: 'programmatic',
                    previous_path: currentPath
                });
            } else if (path.startsWith('/negocios')) {
                window.analyticsService.track('BUSINESS_VISITED', {
                    page_path: path,
                    navigation_type: 'programmatic',
                    previous_path: currentPath
                });
            } else if (path === '/transporte') {
                window.analyticsService.track('TRANSPORT_VISITED', {
                    page_path: path,
                    navigation_type: 'programmatic',
                    previous_path: currentPath
                });
            } else if (path === '/proyectos/mundial-2025') {
                window.analyticsService.track('RECORRIDOS_VISITED', {
                    page_path: path,
                    navigation_type: 'programmatic',
                    previous_path: currentPath
                });
            }
        }
        
        // Trigger custom event for components that need to know about navigation
        window.dispatchEvent(new CustomEvent('pathchange', { detail: { path } }));
    };
    
    // Make navigate available globally
    window.navigate = navigate;
    
    // Handle password modal success
    const handlePasswordSuccess = () => {
        setIsAuthenticated(true);
        setShowPasswordModal(false);
        setIsCheckingAuth(false);
    };
    
    // Render based on current path
    if (currentPath === '/explorar') {
        return <ExplorePageWelcomeIntro />;
    } else if (currentPath.startsWith('/negocios')) {
        return <BusinessPageWelcomeIntro />;
    } else if (currentPath === '/transporte') {
        return <TransportPageWelcomeIntro />;
    } else if (currentPath === '/proyectos/mundial-2025') {
        // Don't render any content until authentication is checked and confirmed
        // Show password modal if checking auth or not authenticated
        if (isCheckingAuth || showPasswordModal || !isAuthenticated) {
            return React.createElement(PasswordModal, {
                isVisible: true,
                onSuccess: handlePasswordSuccess,
                onError: () => {}
            });
        }
        
        const toggleLayersPanel = () => {
            setIsLayersPanelCollapsed(prev => !prev);
        };
        
        // Only render content if authenticated
        // Use window components to ensure they're available
        const TripsPanelComponent = window.TripsPanel || (() => React.createElement('div', null, 'Loading...'));
        const DaySelectorComponent = window.DaySelector || (() => null);
        const LayersPanelComponent = window.LayersPanel || (() => null);
        const NavigationBarComponent = window.NavigationBar || (() => null);
        const MapAdminAppComponent = window.MapAdminApp || (() => null);
        const TableComponent = window.TableComponent || (() => null);
        
        // Function to show table modal with a specific CSV URL
        const handleShowTableModal = (csvUrl) => {
            setTableCsvUrl(csvUrl);
            // Set modal title based on CSV URL
            if (csvUrl && csvUrl.includes('trips-stats.csv')) {
                setTableModalTitle('Estadísticas de polígonos');
            } else {
                setTableModalTitle('Tabla de viajes entre polígonos');
            }
            setShowTableModal(true);
        };
        
        // Calculate heights based on collapsed state
        // Container height is calc(100vh - 100px), gap is 12px
        // When collapsed: layers panel = 70px (header only), trips panel takes the rest
        // When expanded: split 50/50, accounting for gap
        const layersPanelHeight = isLayersPanelCollapsed ? '70px' : 'calc((100vh - 100px - 12px) / 2)';
        const tripsPanelHeight = isLayersPanelCollapsed ? 'calc(100vh - 100px - 12px - 70px)' : 'calc((100vh - 100px - 12px) / 2)';
        
        return React.createElement('div', { className: "recorridos-page" },
            React.createElement(NavigationBarComponent, null),
            React.createElement('div', {
                className: "left-panels-container",
                style: {
                    position: 'fixed',
                    top: '80px',
                    left: '20px',
                    width: '360px',
                    height: 'calc(100vh - 100px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    zIndex: 1000
                }
            },
                React.createElement('div', {
                    style: { 
                        height: tripsPanelHeight, 
                        flexShrink: 0,
                        transition: 'height 0.3s ease'
                    }
                },
                    React.createElement(TripsPanelComponent, null)
                ),
                React.createElement('div', {
                    className: isLayersPanelCollapsed ? 'layers-panel-collapsed' : '',
                    style: { 
                        height: layersPanelHeight, 
                        flexShrink: 0,
                        overflow: 'hidden',
                        transition: 'height 0.3s ease'
                    }
                },
                    React.createElement(LayersPanelComponent, {
                        isCollapsed: isLayersPanelCollapsed,
                        onToggleCollapse: toggleLayersPanel,
                        onShowTableModal: (csvUrl) => handleShowTableModal(csvUrl || 'https://distritosmexico.s3.us-east-2.amazonaws.com/projects/mundial/matching-trips.csv')
                    })
                )
            ),
            React.createElement('div', {
                className: "map-container",
                style: { height: 'calc(100vh - 60px)' }
            },
                React.createElement(MapAdminAppComponent, {
                    hideVerticalPanel: true,
                    mapStyle: "mapbox://styles/vidriloco/clwy6gs85010i01qp6127bp3x"
                })
            ),
            React.createElement(DaySelectorComponent, null),
            // Table Modal - rendered above the map
            showTableModal && React.createElement('div', {
                key: 'table-modal-overlay',
                className: 'table-modal-overlay',
                style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2147483647,
                    overflow: 'hidden',
                    isolation: 'isolate'
                },
                onClick: (e) => {
                    if (e.target.className === 'table-modal-overlay' || e.target.className.includes('table-modal-overlay')) {
                        setShowTableModal(false);
                    }
                }
            }, React.createElement('div', {
                className: 'table-modal',
                style: {
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '0',
                    width: '95vw',
                    height: '95vh',
                    maxWidth: '95vw',
                    maxHeight: '95vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 2147483647
                },
                onClick: (e) => e.stopPropagation()
            }, [
                // Modal header
                React.createElement('div', {
                    key: 'modal-header',
                    style: {
                        padding: '20px 24px',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }
                }, [
                    React.createElement('h2', {
                        key: 'modal-title',
                        style: {
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#1f2937'
                        }
                    }, tableModalTitle),
                    React.createElement('button', {
                        key: 'close-button',
                        onClick: () => setShowTableModal(false),
                        style: {
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '0',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px'
                        },
                        onMouseEnter: (e) => {
                            e.target.style.backgroundColor = '#f3f4f6';
                            e.target.style.color = '#1f2937';
                        },
                        onMouseLeave: (e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#6b7280';
                        }
                    }, '×')
                ]),
                // Modal body with TableComponent
                React.createElement('div', {
                    key: 'modal-body',
                    style: {
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }
                }, React.createElement(TableComponent, {
                    key: 'table-component',
                    csvUrl: tableCsvUrl,
                    onClose: () => setShowTableModal(false)
                }))
            ]))
        );
    } else if (currentPath === '/proyectos/mapas/turistas-cdmx-2024-2025') {
        // Render map, navigation bar, and tourist viewer panel for turistas CDMX page
        const NavigationBarComponent = window.NavigationBar || (() => null);
        const MapAdminAppComponent = window.MapAdminApp || (() => null);
        const TouristViewerPanelComponent = window.TouristViewerPanel || (() => null);
        const VisualizationPlayerComponent = window.VisualizationPlayer || (() => null);
        const HoodComponent = window.HoodComponent || (() => null);
        
        // State for selected polygon, day, and time period
        const [selectedPolygon, setSelectedPolygon] = React.useState(null);
        const [selectedDay, setSelectedDay] = React.useState('01');
        const [selectedTimePeriod, setSelectedTimePeriod] = React.useState('m'); // Default to 'm' (mañana)
        const [showHoodCard, setShowHoodCard] = React.useState(true);
        const [currentMonth, setCurrentMonth] = React.useState('2024-11'); // Current month in format 'YYYY-MM'
        
        // Listen for month changes from VisualizationPlayer
        React.useEffect(() => {
            const handleMonthChange = (event) => {
                const newMonth = event.detail;
                setCurrentMonth(newMonth);
            };
            
            window.addEventListener('touristMonthChanged', handleMonthChange);
            
            return () => {
                window.removeEventListener('touristMonthChanged', handleMonthChange);
            };
        }, []);
        
        // Get maximum number of days in a given month/year
        const getMaxDaysInMonth = (monthYear) => {
            if (!monthYear || typeof monthYear !== 'string') {
                return 31; // Default fallback
            }
            
            const [year, month] = monthYear.split('-');
            if (!year || !month) {
                return 31; // Default fallback
            }
            
            const yearNum = parseInt(year, 10);
            const monthNum = parseInt(month, 10);
            
            if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                return 31; // Default fallback
            }
            
            // Days in each month (0-indexed, so monthNum - 1)
            const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            
            // Check for leap year (February)
            if (monthNum === 2) {
                // Leap year if divisible by 4, except if divisible by 100 unless also divisible by 400
                const isLeapYear = (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0);
                return isLeapYear ? 29 : 28;
            }
            
            return daysInMonth[monthNum - 1];
        };
        
        // Get available days from selected polygon, memoized to recalculate when month or polygon changes
        const availableDaysFromSelection = React.useMemo(() => {
            if (!selectedPolygon || !selectedPolygon.properties) {
                return [];
            }
            
            const info = selectedPolygon.properties.tourist_visitors_info;
            if (!info || typeof info !== 'object') {
                return [];
            }
            
            const monthData = info[currentMonth];
            if (!monthData || typeof monthData !== 'object') {
                return [];
            }
            
            const days = monthData.days;
            if (!days || typeof days !== 'object') {
                return [];
            }
            
            let dayKeys = Object.keys(days).sort();
            
            // Filter to only include valid days for the selected month using calendar
            const maxDays = getMaxDaysInMonth(currentMonth);
            dayKeys = dayKeys.filter(day => {
                const dayNum = parseInt(day, 10);
                return !isNaN(dayNum) && dayNum >= 1 && dayNum <= maxDays;
            });
            
            return dayKeys;
        }, [selectedPolygon, currentMonth]);
        
        // Fallback: allow the VisualizationPlayer to animate even when no polygon is selected
        // Use correct number of days for current month
        const maxDaysInMonth = getMaxDaysInMonth(currentMonth);
        const defaultDays = React.useMemo(() => {
            return Array.from({ length: maxDaysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
        }, [maxDaysInMonth]);
        
        const availableDays = availableDaysFromSelection.length > 0 ? availableDaysFromSelection : defaultDays;
        
        // Listen for neighbourhood selection events
        React.useEffect(() => {
            const handleNeighbourhoodSelected = (event) => {
                setSelectedPolygon(event.detail);
                setShowHoodCard(true); // Show card when new polygon is selected
            };
            
            window.addEventListener('neighbourhoodSelected', handleNeighbourhoodSelected);
            
            // Also check if there's already a selected neighbourhood
            if (window.selectedNeighbourhood) {
                setSelectedPolygon(window.selectedNeighbourhood);
                setShowHoodCard(true);
            }
            
            return () => {
                window.removeEventListener('neighbourhoodSelected', handleNeighbourhoodSelected);
            };
        }, []);
        
        return React.createElement('div', { className: "turistas-cdmx-page" },
            React.createElement(NavigationBarComponent, null),
            React.createElement('div', {
                className: "map-container",
                style: { 
                    height: 'calc(100vh - 60px)'
                }
            },
                React.createElement(MapAdminAppComponent, {
                    hideVerticalPanel: true,
                    mapStyle: "mapbox://styles/mapbox/light-v11"
                })
            ),
            // Container for both panels - positioned on the left
            // TouristViewerPanel appears first (higher on screen), VisualizationPlayer below it
            React.createElement('div', {
                style: {
                    position: 'fixed',
                    left: '10px',
                    bottom: '10px',
                    width: '400px',
                    display: 'flex',
                    flexDirection: 'column', // Normal column: first element on top
                    gap: '10px',
                    zIndex: 1000,
                    // Allow interaction with the floating panels (TouristViewerPanel, HoodComponent, VisualizationPlayer)
                    pointerEvents: 'auto',
                    alignItems: 'stretch'
                }
            },
                React.createElement(TouristViewerPanelComponent, {
                    selectedPolygon: selectedPolygon,
                    selectedDay: selectedDay,
                    onDayChange: setSelectedDay,
                    selectedTimePeriod: selectedTimePeriod,
                    onTimePeriodChange: setSelectedTimePeriod
                }),
                showHoodCard && React.createElement(HoodComponent, {
                    selectedPolygon: selectedPolygon,
                    onClose: () => setShowHoodCard(false)
                }),
                React.createElement(VisualizationPlayerComponent, {
                    selectedPolygon: selectedPolygon,
                    availableDays: availableDays,
                    onDayChange: setSelectedDay
                })
            )
        );
    } else if (currentPath === '/proyectos/mapas/despojos-viviendas') {
        const DespojoPageComponent = window.DespojoPage || (() => null);
        return <DespojoPageComponent />;
    } else if (currentPath === '/vivienda') {
        return <HomePage initialStateIndex={1} showCatchLead={true} />;
    } else if (currentPath === '/trip-faker') {
        return <TripFakerPage />;
    } else if (currentPath === '/acerca-de') {
        return <div className="acerca-de-page">
            <NavigationBar />
            <div className="acerca-de-content">
                <h1>Acerca de Distrito MX</h1>
                <p>Información sobre el proyecto...</p>
                <button onClick={() => navigate('/')}>Volver al inicio</button>
            </div>
        </div>;
    } else {
        return <HomePage />;
    }
}

// Make the component available globally
window.SimpleRouter = SimpleRouter; 