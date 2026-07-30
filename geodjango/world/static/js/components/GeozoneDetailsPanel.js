const GeozoneDetailsPanel = React.forwardRef(({ selectedGeozone, onClose }, ref) => {
    const panelRef = React.useRef(null);
    const starPlotRef = React.useRef(null);
    const [selectedCategory, setSelectedCategory] = React.useState(null);
    const [starPlotData, setStarPlotData] = React.useState([]);
    const [extendedData, setExtendedData] = React.useState({});
    const [showIndexSelector, setShowIndexSelector] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState('onu');

    // Index options
    const indexOptions = [
        { id: 'onu', name: 'Índice de habitabilidad de la ONU' },
        { id: 'ocde', name: 'Índice para una mejor vida de la OCDE' },
        { id: 'aarp', name: 'Índice de habitabilidad de la AARP' }
    ];

    // Generate random values once when component mounts
    React.useEffect(() => {
        // Generate random spider plot data
        const categories = ['Vivienda', 'Transporte', 'Seguridad', 'Oportunidades', 'Agua'];
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];
        
        const randomStarPlotData = categories.map((name, index) => ({
            name,
            value: Math.random() * 0.4 + 0.4, // Random value between 0.4 and 0.8
            color: colors[index]
        }));
        
        setStarPlotData(randomStarPlotData);

        // Generate random extended data
        const randomExtendedData = {
            vivienda: {
                airbnbs: Math.floor(Math.random() * 2000) + 100,
                airbnbs_price: Math.floor(Math.random() * 1000) + 300,
                housing_density: Math.random() * 0.4 + 0.5,
                property_values: Math.random() * 0.4 + 0.5,
                rental_prices: Math.random() * 0.4 + 0.5,
                housing_quality: Math.random() * 0.4 + 0.5
            },
            transporte: {
                metro_stations: Math.floor(Math.random() * 15) + 2,
                bus_stops: Math.floor(Math.random() * 40) + 10,
                bike_lanes: Math.floor(Math.random() * 20) + 5,
                walkability_score: Math.random() * 0.4 + 0.5,
                transit_frequency: Math.random() * 0.4 + 0.5,
                connectivity_index: Math.random() * 0.4 + 0.5
            },
            seguridad: {
                house_robbery: Math.floor(Math.random() * 100) + 10,
                thefts_without_violence: Math.floor(Math.random() * 120) + 20,
                thefts_with_violence: Math.floor(Math.random() * 50) + 10,
                sexual_assaults: Math.floor(Math.random() * 30) + 5,
                vehicle_thefts: Math.floor(Math.random() * 60) + 15,
                public_disorder: Math.floor(Math.random() * 50) + 10
            },
            oportunidades: {
                job_opportunities: Math.floor(Math.random() * 300) + 50,
                educational_institutions: Math.floor(Math.random() * 15) + 3,
                healthcare_facilities: Math.floor(Math.random() * 20) + 5,
                cultural_centers: Math.floor(Math.random() * 10) + 2,
                business_density: Math.random() * 0.4 + 0.5,
                economic_growth: Math.random() * 0.4 + 0.5
            },
            agua: {
                water_quality: Math.random() * 0.3 + 0.7,
                water_availability: Math.random() * 0.3 + 0.7,
                infrastructure_condition: Math.random() * 0.3 + 0.7,
                service_reliability: Math.random() * 0.3 + 0.7,
                pressure_consistency: Math.random() * 0.3 + 0.7,
                maintenance_frequency: Math.random() * 0.3 + 0.7
            }
        };
        
        setExtendedData(randomExtendedData);
    }, []); // Empty dependency array means this runs once when component mounts

    // Expose the ref to the parent component
    React.useImperativeHandle(ref, () => ({
        scrollIntoView: () => {
            if (panelRef.current) {
                // Get the panel's position
                const panelRect = panelRef.current.getBoundingClientRect();
                const container = panelRef.current.closest('.vertical-panel-content');
                
                if (container) {
                    // Calculate the scroll position with 20px offset
                    const scrollTop = container.scrollTop + panelRect.top - 20;
                    container.scrollTo({
                        top: scrollTop,
                        behavior: 'smooth'
                    });
                } else {
                    // Fallback to default scrollIntoView
                    panelRef.current.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest' 
                    });
                }
            }
        }
    }));

    if (!selectedGeozone) return null;

    console.log('starPlotData defined:', starPlotData);

    const SimpleStarPlot = ({ data, size = 300, onCategoryClick }) => {
        const [tooltip, setTooltip] = React.useState({ show: false, content: '', x: 0, y: 0 });

        // Calculate overall ranking score (average of all values)
        const overallScore = (data.reduce((sum, item) => sum + item.value, 0) / data.length) * 10;
        
        // Determine color based on score range
        const getRankingColor = (score) => {
            if (score >= 0 && score < 4) return '#ef4444'; // red
            if (score >= 4 && score < 5) return '#f97316'; // orange
            if (score >= 5 && score < 7) return '#eab308'; // yellow
            if (score >= 7 && score <= 10) return '#22c55e'; // green
            return '#6b7280'; // default gray
        };

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - 50;
        const numPoints = data.length;
        const angleStep = (2 * Math.PI) / numPoints;

        // Create star polygon points
        const starPoints = data.map((item, index) => {
            const angle = index * angleStep - Math.PI / 2; // Start from top
            const x = centerX + Math.cos(angle) * radius * item.value;
            const y = centerY + Math.sin(angle) * radius * item.value;
            return `${x},${y}`;
        }).join(' ');

        // Create background grid points
        const gridPoints = data.map((item, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            return `${x},${y}`;
        }).join(' ');

        // Create background circles
        const backgroundCircles = [];
        for (let i = 1; i <= 5; i++) {
            const circleRadius = (radius * i) / 5;
            backgroundCircles.push(
                <circle
                    key={`bg-${i}`}
                    cx={centerX}
                    cy={centerY}
                    r={circleRadius}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="0.5"
                    opacity="0.3"
                />
            );
        }

        // Create axis lines
        const axisLines = data.map((item, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            return (
                <line
                    key={`axis-${index}`}
                    x1={centerX}
                    y1={centerY}
                    x2={x}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    opacity="0.5"
                />
            );
        });

        // Create data points with hover tooltips and click functionality
        const dataPoints = data.map((item, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius * item.value;
            const y = centerY + Math.sin(angle) * radius * item.value;
            const score = Math.round(item.value * 10);
            
            return (
                <circle
                    key={`point-${index}`}
                    cx={x}
                    cy={y}
                    r="5"
                    fill={item.color}
                    stroke="#fff"
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                        const rect = e.target.getBoundingClientRect();
                        setTooltip({
                            show: true,
                            content: `${item.name}: ${score}/10`,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10
                        });
                    }}
                    onMouseLeave={() => {
                        setTooltip({ show: false, content: '', x: 0, y: 0 });
                    }}
                    onClick={() => onCategoryClick(item.name.toLowerCase())}
                />
            );
        });

        // Create labels
        const labels = data.map((item, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const labelRadius = radius + 25;
            const x = centerX + Math.cos(angle) * labelRadius;
            const y = centerY + Math.sin(angle) * labelRadius;
            
            return (
                <text
                    key={`label-${index}`}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="12"
                    fontWeight="500"
                    fill="#6B7280"
                >
                    {item.name}
                </text>
            );
        });

        return (
            <div className="simple-star-plot-container">
                <div className="star-plot-ranking" style={{ backgroundColor: getRankingColor(overallScore), color: 'white' }}>{overallScore.toFixed(1)}</div>
                <svg 
                    width={size} 
                    height={size} 
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ 
                        backgroundColor: '#ffffff',
                        borderRadius: '8px'
                    }}
                >
                    {/* Background circles */}
                    {backgroundCircles}
                    
                    {/* Axis lines */}
                    {axisLines}
                    
                    {/* Background grid */}
                    <polygon
                        points={gridPoints}
                        fill="none"
                        stroke="#e0e0e0"
                        strokeWidth="1"
                        opacity="0.5"
                    />
                    
                    {/* Star shape */}
                    <polygon
                        points={starPoints}
                        fill="rgba(59, 130, 246, 0.2)"
                        stroke="#3b82f6"
                        strokeWidth="2"
                    />
                    
                    {/* Data points */}
                    {dataPoints}
                    
                    {/* Labels */}
                    {labels}
                </svg>
                
                {/* Tooltip */}
                {tooltip.show && (
                    <div
                        style={{
                            position: 'fixed',
                            left: tooltip.x,
                            top: tooltip.y,
                            transform: 'translateX(-50%) translateY(-100%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            fontFamily: 'Ruda, sans-serif',
                            pointerEvents: 'none',
                            zIndex: 1000,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tooltip.content}
                    </div>
                )}
            </div>
        );
    };

    // Component to display extended information
    const ExtendedInfoSection = ({ category, data, color }) => {
        if (!category || !data) return null;

        const categoryNames = {
            vivienda: 'Vivienda',
            transporte: 'Transporte',
            seguridad: 'Seguridad',
            oportunidades: 'Oportunidades',
            agua: 'Agua'
        };

        const formatValue = (key, value) => {
            if (typeof value === 'number' && value < 1) {
                return `${Math.round(value * 100)}%`;
            }
            return value.toString();
        };

        const getIndicatorName = (key) => {
            const names = {
                // Vivienda
                airbnbs: 'Airbnbs',
                airbnbs_price: 'Precio promedio Airbnb',
                housing_density: 'Densidad habitacional',
                property_values: 'Valor de propiedades',
                rental_prices: 'Precios de renta',
                housing_quality: 'Calidad de vivienda',
                
                // Transporte
                metro_stations: 'Estaciones de metro',
                bus_stops: 'Paradas de autobús',
                bike_lanes: 'Carriles de bicicleta',
                walkability_score: 'Índice de caminabilidad',
                transit_frequency: 'Frecuencia de transporte',
                connectivity_index: 'Índice de conectividad',
                
                // Seguridad
                house_robbery: 'Robos a casa habitación',
                thefts_without_violence: 'Robos sin violencia',
                thefts_with_violence: 'Robos con violencia',
                sexual_assaults: 'Agressiones sexuales',
                vehicle_thefts: 'Robo de vehículos',
                public_disorder: 'Alteración del orden público',
                
                // Oportunidades
                job_opportunities: 'Oportunidades laborales',
                educational_institutions: 'Instituciones educativas',
                healthcare_facilities: 'Centros de salud',
                cultural_centers: 'Centros culturales',
                business_density: 'Densidad de negocios',
                economic_growth: 'Crecimiento económico',
                
                // Agua
                water_quality: 'Calidad del agua',
                water_availability: 'Disponibilidad de agua',
                infrastructure_condition: 'Estado de infraestructura',
                service_reliability: 'Confiabilidad del servicio',
                pressure_consistency: 'Consistencia de presión',
                maintenance_frequency: 'Frecuencia de mantenimiento'
            };
            return names[key] || key;
        };

        const indicators = Object.entries(data).slice(0, 6);

        return (
            <div className="extended-info-section">
                <div className="extended-info-header">
                    <h4 className="extended-info-title">{categoryNames[category]}</h4>
                    <button 
                        className="close-extended-info"
                        onClick={() => setSelectedCategory(null)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="extended-info-grid">
                    {indicators.map(([key, value]) => (
                        <div 
                            key={key} 
                            className="indicator-grid-item" 
                            style={{ '--category-color': color }}
                        >
                            <div className="indicator-value">{formatValue(key, value)}</div>
                            <div className="indicator-label">{getIndicatorName(key)}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const getGeozoneTitle = () => {
        switch (selectedGeozone.type) {
            case 'ageb':
                return `AGEB ${selectedGeozone.properties.cve_ageb || selectedGeozone.id}`;
            case 'neighborhood':
                return selectedGeozone.properties.name || selectedGeozone.properties.nombre || 'Colonia';
            case 'municipality':
                return selectedGeozone.properties.name || selectedGeozone.properties.nombre || 'Municipio';
            default:
                return 'Zona Geográfica';
        }
    };

    const getGeozoneType = () => {
        switch (selectedGeozone.type) {
            case 'ageb':
                return 'Área Geoestadística Básica';
            case 'neighborhood':
                return 'Colonia';
            case 'municipality':
                return 'Municipio';
            default:
                return 'Zona Geográfica';
        }
    };

    const getGeozoneDetails = () => {
        const details = [];
        
        if (selectedGeozone.properties.cvegeo) {
            details.push({ label: 'CVEGEO', value: selectedGeozone.properties.cvegeo });
        }
        
        if (selectedGeozone.properties.cve_ageb) {
            details.push({ label: 'AGEB', value: selectedGeozone.properties.cve_ageb });
        }
        
        if (selectedGeozone.properties.cve_mun) {
            details.push({ label: 'Municipio', value: selectedGeozone.properties.cve_mun });
        }
        
        if (selectedGeozone.properties.cve_ent) {
            details.push({ label: 'Entidad', value: selectedGeozone.properties.cve_ent });
        }
        
        if (selectedGeozone.properties.nombre) {
            details.push({ label: 'Nombre', value: selectedGeozone.properties.nombre });
        }
        
        if (selectedGeozone.properties.name) {
            details.push({ label: 'Nombre', value: selectedGeozone.properties.name });
        }

        return details;
    };

    const details = getGeozoneDetails();

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
    };

    return (
        <div className="floating-actions-container" ref={panelRef}>
            <div className="floating-actions-header">
                <div className="geozone-header-content">
                    <h3 className="floating-actions-title">{getGeozoneTitle()}</h3>
                    <span className="geozone-type-badge">{getGeozoneType()}</span>
                </div>
                <button className="close-floating-actions-button" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div className="floating-actions-content">
                {/* Ranking Section */}
                <div className="floating-actions-section">
                    <div className="ranking-section">
                        <div className="ranking-content">
                            <h2 className="ranking-title">Rankeado #2</h2>
                            {!showIndexSelector ? (
                                <div className="ranking-caption-container">
                                    <p className="ranking-caption">Según el {(function() {
                                        const selectedOption = indexOptions.find(index => index.id === selectedIndex);
                                        return selectedOption.name;
                                    })()}</p>
                                    <button 
                                        className="other-indices-link"
                                        onClick={() => setShowIndexSelector(true)}
                                    >
                                        Ver otros índices
                                    </button>
                                </div>
                            ) : (
                                <div className="index-selector">
                                    <p className="index-selector-title">Estos son algunos de los índices disponibles:</p>
                                    <div className="index-buttons">
                                        {indexOptions.map((index) => (
                                            <button
                                                key={index.id}
                                                className={`index-button ${selectedIndex === index.id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedIndex(index.id);
                                                    setShowIndexSelector(false);
                                                }}
                                            >
                                                {index.name}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        className="close-index-selector"
                                        onClick={() => setShowIndexSelector(false)}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="section-divider"></div>
                </div>

                {/* Scrollable Content Area */}
                <div className="scrollable-content-area">
                    {/* Star Plot Section */}
                    <div className="floating-actions-section">
                        {console.log('Rendering D3StarPlot with data:', starPlotData)}
                        <SimpleStarPlot data={starPlotData} size={300} onCategoryClick={handleCategoryClick} />
                    </div>

                    {/* Extended Information Section */}
                    {selectedCategory && (
                        <div className="floating-actions-section">
                            <ExtendedInfoSection 
                                category={selectedCategory} 
                                data={extendedData[selectedCategory]}
                                color={(function() {
                                    const item = starPlotData.find(item => item.name.toLowerCase() === selectedCategory);
                                    return item ? item.color : '#6b7280';
                                })()}
                            />
                        </div>
                    )}

                    <div className="floating-actions-section">
                        <div className="geozone-details-content">
                            
                            {!selectedCategory && (
                                <div className="geozone-info-message">
                                    <div className="info-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <path d="M12 16v-4"></path>
                                            <path d="M12 8h.01"></path>
                                        </svg>
                                    </div>
                                    <span>Selecciona un aspecto de la gráfica para ver estadísticas detalladas de esta zona.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// Make the component available globally
window.GeozoneDetailsPanel = GeozoneDetailsPanel;
 