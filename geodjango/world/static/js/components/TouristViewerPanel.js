/**
 * Tourist Viewer Panel Component
 * Displays day selector and time period statistics for selected neighbourhood
 */
function TouristViewerPanel({ selectedPolygon, selectedDay, onDayChange, selectedTimePeriod, onTimePeriodChange }) {
    const [day, setDay] = React.useState(selectedDay || '01');
    const [timePeriod, setTimePeriod] = React.useState(selectedTimePeriod || 'm'); // Default to 'm' (mañana)
    const [currentMonth, setCurrentMonth] = React.useState('2024-11'); // Current month in format 'YYYY-MM'
    const [showRangeTooltip, setShowRangeTooltip] = React.useState(false);
    const [showMaxValueTooltip, setShowMaxValueTooltip] = React.useState(false);
    const [maxValueInfo, setMaxValueInfo] = React.useState(null);
    const [maxValueTooltipPosition, setMaxValueTooltipPosition] = React.useState({ top: 0, right: 0 });
    const maxValueRef = React.useRef(null);
    const [neighbourhoodsLoading, setNeighbourhoodsLoading] = React.useState(false);
    
    // Listen for month changes
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
    
    // Get available days from the selected polygon, memoized to only recalculate when month or polygon changes
    const availableDays = React.useMemo(() => {
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
        
        // Get all day keys and sort them
        let dayKeys = Object.keys(days).sort();
        
        // Filter to only include valid days for the selected month
        const maxDays = getMaxDaysInMonth(currentMonth);
        dayKeys = dayKeys.filter(day => {
            const dayNum = parseInt(day, 10);
            return !isNaN(dayNum) && dayNum >= 1 && dayNum <= maxDays;
        });
        
        return dayKeys;
    }, [currentMonth, selectedPolygon]);
    
    const maxDaysInMonth = getMaxDaysInMonth(currentMonth);
    const minDay = availableDays.length > 0 ? parseInt(availableDays[0], 10) : 1;
    const maxDay = availableDays.length > 0 ? parseInt(availableDays[availableDays.length - 1], 10) : maxDaysInMonth;
    const currentDayIndex = availableDays.indexOf(day);
    const sliderValue = currentDayIndex >= 0 ? currentDayIndex : 0;
    
    // Update day when prop changes
    React.useEffect(() => {
        if (selectedDay) {
            setDay(selectedDay);
        }
    }, [selectedDay]);
    
    // Update time period when prop changes
    React.useEffect(() => {
        if (selectedTimePeriod) {
            setTimePeriod(selectedTimePeriod);
        }
    }, [selectedTimePeriod]);
    
    // Monitor global neighbourhoods loading state
    React.useEffect(() => {
        const checkLoading = () => {
            const isLoading = window.neighbourhoodsLoading === true;
            setNeighbourhoodsLoading(isLoading);
        };
        
        // Check immediately
        checkLoading();
        
        // Set up interval to check periodically
        const interval = setInterval(checkLoading, 100);
        
        return () => clearInterval(interval);
    }, []);
    
    // Close tooltip when clicking outside
    React.useEffect(() => {
        if (!showRangeTooltip) return;
        
        const handleClickOutside = (event) => {
            // Close tooltip if clicking outside
            setShowRangeTooltip(false);
        };
        
        // Add event listener after a short delay to avoid immediate closure
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);
        
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showRangeTooltip]);
    
    // Close max value tooltip when clicking outside and update position on scroll/resize
    React.useEffect(() => {
        if (!showMaxValueTooltip || !maxValueRef.current) return;
        
        const handleClickOutside = (event) => {
            // Close tooltip if clicking outside
            setShowMaxValueTooltip(false);
        };
        
        const updatePosition = () => {
            if (maxValueRef.current) {
                const rect = maxValueRef.current.getBoundingClientRect();
                setMaxValueTooltipPosition({
                    top: rect.top,
                    right: window.innerWidth - rect.right
                });
            }
        };
        
        // Add event listener after a short delay to avoid immediate closure
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);
        
        // Update position on scroll and resize
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        
        // Initial position update
        updatePosition();
        
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [showMaxValueTooltip]);
    
    // Update day when polygon or month changes - set to first available day if current day is invalid
    React.useEffect(() => {
        if (selectedPolygon && availableDays.length > 0) {
            if (!availableDays.includes(day)) {
                const firstDay = availableDays[0];
                setDay(firstDay);
                if (onDayChange) {
                    onDayChange(firstDay);
                }
                // Dispatch custom event for map updates
                window.dispatchEvent(new CustomEvent('touristDayChanged', { detail: firstDay }));
            }
        }
    }, [selectedPolygon, currentMonth, availableDays]);
    
    const handleTimePeriodChange = (newTimePeriod) => {
        setTimePeriod(newTimePeriod);
        if (onTimePeriodChange) {
            onTimePeriodChange(newTimePeriod);
        }
        // Dispatch custom event for map updates
        window.dispatchEvent(new CustomEvent('touristTimePeriodChanged', { detail: newTimePeriod }));
    };
    
    const handleDayChange = (newDay) => {
        setDay(newDay);
        if (onDayChange) {
            onDayChange(newDay);
        }
        // Dispatch custom event for map updates
        window.dispatchEvent(new CustomEvent('touristDayChanged', { detail: newDay }));
    };
    
    const handleSliderChange = (event) => {
        const index = parseInt(event.target.value, 10);
        if (index >= 0 && index < availableDays.length) {
            const newDay = availableDays[index];
            handleDayChange(newDay);
        }
    };
    
    // Get values for the selected day and polygon
    const getTimePeriodValue = (timePeriod) => {
        try {
            if (!selectedPolygon || !selectedPolygon.properties) {
                return null;
            }
            
            const props = selectedPolygon.properties;
            
            // Get tourist_visitors_info - structure: {"2024-11": {...}, ...}
            let touristInfo = props.tourist_visitors_info;
            
            // Handle case where it might be a JSON string
            if (typeof touristInfo === 'string') {
                try {
                    touristInfo = JSON.parse(touristInfo);
                } catch (e) {
                    console.error('Error parsing tourist_visitors_info:', e);
                    return null;
                }
            }
            
            if (!touristInfo || typeof touristInfo !== 'object' || touristInfo === null) {
                return null;
            }
            
            // Use current month from state
            const monthKey = currentMonth;
            const monthData = touristInfo[monthKey];
            if (!monthData || typeof monthData !== 'object' || monthData === null) {
                return null;
            }
            
            // Get days object from monthData
            const days = monthData.days;
            if (!days || typeof days !== 'object' || days === null) {
                return null;
            }
            
            // Ensure day is in correct format (e.g., "01" not "1")
            const dayKey = day.length === 1 ? `0${day}` : day;
            
            const dayData = days[dayKey];
            if (!dayData || typeof dayData !== 'object' || dayData === null) {
                return null;
            }
            
            const value = dayData[timePeriod];
            if (value === null || value === undefined) {
                return null;
            }
            
            const numValue = Number(value);
            return !isNaN(numValue) ? numValue : null;
        } catch (error) {
            console.error('Error getting time period value:', error);
            return null;
        }
    };
    
    // Get values using the selected time period for display
    const morningValue = getTimePeriodValue('m');
    const afternoonValue = getTimePeriodValue('a');
    const eveningValue = getTimePeriodValue('e');
    const dailyValue = getTimePeriodValue('d');
    
    // Time period mapping
    const timePeriodMap = {
        'm': { label: 'Mañana', value: morningValue },
        'd': { label: 'Día', value: dailyValue },
        'a': { label: 'Tarde', value: afternoonValue },
        'e': { label: 'Noche', value: eveningValue }
    };
    
    // Format number with thousand separators
    const formatNumber = (value) => {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        return value.toLocaleString('es-MX', { maximumFractionDigits: 0 });
    };
    
    // Format month and year in Spanish from 'YYYY-MM' format
    const formatMonthYear = (monthYear) => {
        if (!monthYear || typeof monthYear !== 'string') {
            return '';
        }
        
        const [year, month] = monthYear.split('-');
        if (!year || !month) {
            return '';
        }
        
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        const monthIndex = parseInt(month, 10) - 1;
        if (monthIndex < 0 || monthIndex >= monthNames.length) {
            return '';
        }
        
        return `${monthNames[monthIndex]} ${year}`;
    };
    
    // Get range for the selected time period across all days
    // Use useMemo to recalculate when timePeriod changes
    const range = React.useMemo(() => {
        // Use the function that gets all values across all days for better accuracy
        if (window.getTouristRangeAllDays) {
            const result = window.getTouristRangeAllDays(timePeriod);
            return result;
        }
        
        // Fallback to the old method if new function not available
        if (!window.getTouristRange) {
            return { min: 0, max: 0 };
        }
        
        // Get range across all available days for the selected time period
        let allValues = [];
        availableDays.forEach(dayKey => {
            const range = window.getTouristRange(dayKey, timePeriod, currentMonth);
            if (range && range.min !== undefined && range.max !== undefined) {
                allValues.push(range.min, range.max);
            }
        });
        
        if (allValues.length === 0) {
            return { min: 0, max: 0 };
        }
        
        return {
            min: Math.min(...allValues),
            max: Math.max(...allValues)
        };
    }, [timePeriod, availableDays, currentMonth]);
    
    // Find the neighbourhood and date where the maximum value occurs
    const findMaxValueInfo = React.useMemo(() => {
        if (!window.neighbourhoodsGeoJSON || !window.neighbourhoodsGeoJSON.features) {
            return null;
        }
        
        const data = window.neighbourhoodsGeoJSON;
        let maxValue = -Infinity;
        let maxNeighbourhood = null;
        let maxDay = null;
        
        // Iterate through all features (neighbourhoods)
        data.features.forEach(feature => {
            const properties = feature.properties;
            if (!properties || !properties.tourist_visitors_info) {
                return;
            }
            
            let touristInfo = properties.tourist_visitors_info;
            
            // Handle case where it might be a JSON string
            if (typeof touristInfo === 'string') {
                try {
                    touristInfo = JSON.parse(touristInfo);
                } catch (e) {
                    return;
                }
            }
            
            if (!touristInfo || typeof touristInfo !== 'object' || touristInfo === null) {
                return;
            }
            
            // Get month data
            const monthData = touristInfo[currentMonth];
            if (!monthData || typeof monthData !== 'object') {
                return;
            }
            
            // Get days object
            const days = monthData.days;
            if (!days || typeof days !== 'object') {
                return;
            }
            
            // Iterate through all available days
            availableDays.forEach(dayKey => {
                const dayData = days[dayKey];
                if (dayData && typeof dayData === 'object') {
                    const value = dayData[timePeriod];
                    if (value !== null && value !== undefined && !isNaN(value)) {
                        const numValue = Number(value);
                        if (numValue > maxValue) {
                            maxValue = numValue;
                            maxNeighbourhood = properties.neighbourhood_name || 'Colonia desconocida';
                            maxDay = dayKey;
                        }
                    }
                }
            });
        });
        
        if (maxNeighbourhood && maxDay) {
            return {
                neighbourhood: maxNeighbourhood,
                day: maxDay,
                value: maxValue
            };
        }
        
        return null;
    }, [timePeriod, availableDays, currentMonth]);
    
    // Generate gradient colors for the legend based on time period
    const generateGradientColors = (steps = 20) => {
        const colors = [];
        let colorStops = [];
        
        // Color schemes matching the map visualization
        if (timePeriod === 'm') {
            // Morning: Light blue to cyan to deep blue
            colorStops = [
                { r: 227, g: 242, b: 253 }, // #e3f2fd - light blue
                { r: 179, g: 229, b: 252 }, // #b3e5fc
                { r: 129, g: 212, b: 250 }, // #81d4fa - light cyan
                { r: 77, g: 182, b: 172 },  // #4dd0e1
                { r: 41, g: 182, b: 246 },  // #29b6f6 - cyan
                { r: 3, g: 169, b: 244 },   // #03a9f4
                { r: 2, g: 119, b: 189 }    // #0277bd - deep blue
            ];
        } else if (timePeriod === 'a') {
            // Afternoon: Light yellow to orange to deep orange
            colorStops = [
                { r: 255, g: 249, b: 196 }, // #fff9c4 - light yellow
                { r: 255, g: 245, b: 157 }, // #fff59d
                { r: 255, g: 235, b: 59 },  // #ffeb3b - yellow
                { r: 255, g: 213, b: 79 },  // #ffd54f
                { r: 255, g: 152, b: 0 },   // #ff9800 - orange
                { r: 255, g: 111, b: 0 },   // #ff6f00
                { r: 230, g: 81, b: 0 }     // #e65100 - deep orange
            ];
        } else if (timePeriod === 'e') {
            // Evening/Night: Light purple to purple to deep purple
            colorStops = [
                { r: 243, g: 229, b: 245 }, // #f3e5f5 - light purple
                { r: 225, g: 190, b: 231 }, // #e1bee7
                { r: 206, g: 147, b: 216 }, // #ce93d8 - purple
                { r: 186, g: 104, b: 200 }, // #ba68c8 - medium purple
                { r: 156, g: 39, b: 176 },  // #9c27b0
                { r: 123, g: 31, b: 162 },  // #7b1fa2
                { r: 106, g: 27, b: 154 }   // #6a1b9a - deep purple
            ];
        } else {
            // Fallback: red gradient
            colorStops = [
                { r: 255, g: 240, b: 240 },
                { r: 255, g: 200, b: 200 },
                { r: 255, g: 160, b: 160 },
                { r: 255, g: 120, b: 120 },
                { r: 255, g: 80, b: 80 },
                { r: 200, g: 20, b: 20 },
                { r: 150, g: 0, b: 0 }
            ];
        }
        
        for (let i = 0; i < steps; i++) {
            const ratio = i / (steps - 1);
            let colorIndex = Math.floor(ratio * (colorStops.length - 1));
            let nextColorIndex = Math.min(colorIndex + 1, colorStops.length - 1);
            let localRatio = (ratio * (colorStops.length - 1)) - colorIndex;
            
            const startColor = colorStops[colorIndex];
            const endColor = colorStops[nextColorIndex];
            
            const r = Math.round(startColor.r + (endColor.r - startColor.r) * localRatio);
            const g = Math.round(startColor.g + (endColor.g - startColor.g) * localRatio);
            const b = Math.round(startColor.b + (endColor.b - startColor.b) * localRatio);
            
            colors.push(`rgb(${r}, ${g}, ${b})`);
        }
        
        return colors;
    };
    
    // Get the top range color (max value color) for a specific time period
    const getTopRangeColor = (period) => {
        if (period === 'm') {
            // Morning: deep blue
            return '#0277bd';
        } else if (period === 'a') {
            // Afternoon: deep orange
            return '#e65100';
        } else if (period === 'e') {
            // Evening/Night: deep purple
            return '#6a1b9a';
        }
        return '#000'; // Fallback
    };
    
    // Get the middle range color (mid value color) for a specific time period
    const getMiddleRangeColor = (period) => {
        if (period === 'm') {
            // Morning: cyan (middle of blue gradient)
            return '#29b6f6';
        } else if (period === 'a') {
            // Afternoon: yellow (middle of yellow-orange gradient)
            return '#ffeb3b';
        } else if (period === 'e') {
            // Evening/Night: purple (middle of purple gradient)
            return '#ce93d8';
        }
        return '#f0f0f0'; // Fallback
    };
    
    // Base styles for floating panel - now relative since it's in a container
    const panelStyle = {
        position: 'relative',
        width: '100%',
        backgroundColor: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '5px',
        padding: '24px',
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        fontFamily: "'Ruda', sans-serif"
    };
    
    // No polygon selected - show welcome card with time period selector
    if (!selectedPolygon) {
        return (
            <div style={panelStyle}>
                <div style={{
                    textAlign: 'center',
                    marginBottom: '20px'
                }}>
                    <h1 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#333',
                        margin: '0 0 12px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}>
                        Visor de turismo
                        {neighbourhoodsLoading && (
                            <span className="neighbourhoods-loading-spinner" style={{
                                display: 'inline-block',
                                width: '16px',
                                height: '16px',
                                border: '2px solid #f3f3f3',
                                borderTop: '2px solid #333',
                                borderRadius: '50%'
                            }}></span>
                        )}
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: '#666',
                        margin: 0,
                        lineHeight: '1.5',
                        marginBottom: '20px'
                    }}>
                        Selecciona alguno de los polígonos para comenzar
                    </p>
                </div>
                
                {/* Time period selector buttons (without values) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px'
                }}>
                    {[
                        { key: 'm', label: 'Mañana', hourRange: '06:00 - 12:00' },
                        { key: 'a', label: 'Tarde', hourRange: '12:00 - 18:00' },
                        { key: 'e', label: 'Noche', hourRange: '18:00 - 24:00' }
                    ].map(({ key, label, hourRange }) => (
                        <div 
                            key={key}
                            onClick={() => handleTimePeriodChange(key)}
                            style={{
                                padding: '14px 10px',
                                backgroundColor: timePeriod === key ? '#f5f5f5' : '#f8f9fa',
                                border: timePeriod === key ? '2px solid #000' : '1px solid #e0e0e0',
                                borderRadius: '6px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (timePeriod !== key) {
                                    e.currentTarget.style.backgroundColor = getMiddleRangeColor(key);
                                    e.currentTarget.style.borderColor = '#000';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (timePeriod !== key) {
                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                    e.currentTarget.style.borderColor = '#e0e0e0';
                                }
                            }}
                        >
                            <div style={{
                                fontSize: '11px',
                                color: '#666',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '4px'
                            }}>
                                {label}
                            </div>
                            <div style={{
                                fontSize: '10px',
                                color: '#999',
                                fontWeight: '400'
                            }}>
                                {hourRange}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    // Polygon selected - show data
    return (
        <div style={panelStyle}>
            {/* Day selector */}
            <div style={{
                textAlign: 'center',
                marginBottom: '20px'
            }}>
                <div style={{
                    fontSize: '42px',
                    fontWeight: '700',
                    color: '#000',
                    marginBottom: '8px',
                    lineHeight: '1'
                }}>
                    {day}
                </div>
                <div style={{
                    fontSize: '15px',
                    color: '#666',
                    marginBottom: '16px',
                    fontWeight: '500'
                }}>
                    {formatMonthYear(currentMonth)}
                </div>
                
            </div>
            
            {/* Divider */}
            <div style={{
                height: '1px',
                backgroundColor: '#e0e0e0',
                margin: '16px 0'
            }}></div>
            
            {/* Time period values - horizontal layout (interactive) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px'
            }}>
                {/* Mañana */}
                <div 
                    onClick={() => handleTimePeriodChange('m')}
                    style={{
                        padding: '14px 10px',
                        backgroundColor: timePeriod === 'm' ? '#f5f5f5' : '#f8f9fa',
                        border: timePeriod === 'm' ? '2px solid #000' : '1px solid #e0e0e0',
                        borderRadius: '6px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        if (timePeriod !== 'm') {
                            e.currentTarget.style.backgroundColor = getMiddleRangeColor('m');
                            e.currentTarget.style.borderColor = '#000';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (timePeriod !== 'm') {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#e0e0e0';
                        }
                    }}
                >
                    <div style={{
                        fontSize: '11px',
                        color: '#666',
                        marginBottom: '8px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        Mañana
                    </div>
                    <div style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: getTopRangeColor('m')
                    }}>
                        {formatNumber(morningValue)}
                    </div>
                </div>
                
                {/* Tarde */}
                <div 
                    onClick={() => handleTimePeriodChange('a')}
                    style={{
                        padding: '14px 10px',
                        backgroundColor: timePeriod === 'a' ? '#f5f5f5' : '#f8f9fa',
                        border: timePeriod === 'a' ? '2px solid #000' : '1px solid #e0e0e0',
                        borderRadius: '6px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        if (timePeriod !== 'a') {
                            e.currentTarget.style.backgroundColor = getMiddleRangeColor('a');
                            e.currentTarget.style.borderColor = '#000';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (timePeriod !== 'a') {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#e0e0e0';
                        }
                    }}
                >
                    <div style={{
                        fontSize: '11px',
                        color: '#666',
                        marginBottom: '8px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        Tarde
                    </div>
                    <div style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: getTopRangeColor('a')
                    }}>
                        {formatNumber(afternoonValue)}
                    </div>
                </div>
                
                {/* Noche */}
                <div 
                    onClick={() => handleTimePeriodChange('e')}
                    style={{
                        padding: '14px 10px',
                        backgroundColor: timePeriod === 'e' ? '#f5f5f5' : '#f8f9fa',
                        border: timePeriod === 'e' ? '2px solid #000' : '1px solid #e0e0e0',
                        borderRadius: '6px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        if (timePeriod !== 'e') {
                            e.currentTarget.style.backgroundColor = getMiddleRangeColor('e');
                            e.currentTarget.style.borderColor = '#000';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (timePeriod !== 'e') {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#e0e0e0';
                        }
                    }}
                >
                    <div style={{
                        fontSize: '11px',
                        color: '#666',
                        marginBottom: '8px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        Noche
                    </div>
                    <div style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: getTopRangeColor('e')
                    }}>
                        {formatNumber(eveningValue)}
                    </div>
                </div>
            </div>
            
            {/* Color scale legend */}
            <div style={{
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #e0e0e0'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    position: 'relative'
                }}>
                    <div style={{
                        fontSize: '12px',
                        color: '#666',
                        fontWeight: '500'
                    }}>
                        Rango de valores
                    </div>
                    {/* Question mark icon */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowRangeTooltip(!showRangeTooltip);
                        }}
                        style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: '1px solid #ccc',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            fontSize: '12px',
                            color: '#666',
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#f0f0f0';
                            e.target.style.borderColor = '#999';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#fff';
                            e.target.style.borderColor = '#ccc';
                        }}
                    >
                        ?
                    </button>
                    
                    {/* Tooltip */}
                    {showRangeTooltip && (
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                bottom: '30px',
                                right: '0',
                                backgroundColor: '#333',
                                color: '#fff',
                                padding: '12px 16px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                lineHeight: '1.5',
                                width: '280px',
                                zIndex: 1000,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                        >
                            Este rango corresponde a los valores minimos y máximos observados a lo largo del periodo ({formatMonthYear(currentMonth)})
                            {/* Tooltip arrow */}
                            <div style={{
                                position: 'absolute',
                                bottom: '-6px',
                                right: '20px',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '6px solid #333'
                            }}></div>
                        </div>
                    )}
                </div>
                <div style={{
                    position: 'relative',
                    height: '30px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: `linear-gradient(to right, ${generateGradientColors(20).join(', ')})`,
                    marginBottom: '8px'
                }}>
                    {/* Min value label */}
                    <div style={{
                        position: 'absolute',
                        left: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#333',
                        textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                    }}>
                        {formatNumber(range.min)}
                    </div>
                    {/* Max value label - clickable */}
                    <div 
                        ref={maxValueRef}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (findMaxValueInfo && maxValueRef.current) {
                                const rect = maxValueRef.current.getBoundingClientRect();
                                setMaxValueInfo(findMaxValueInfo);
                                setMaxValueTooltipPosition({
                                    top: rect.top - 10,
                                    right: window.innerWidth - rect.right
                                });
                                setShowMaxValueTooltip(!showMaxValueTooltip);
                            }
                        }}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#fff',
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            cursor: findMaxValueInfo ? 'pointer' : 'default',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (findMaxValueInfo) {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        {formatNumber(range.max)}
                    </div>
                </div>
            </div>
            
            {/* Max value tooltip - rendered with fixed position to appear above all elements */}
            {showMaxValueTooltip && findMaxValueInfo && (
                <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        top: `${maxValueTooltipPosition.top - 70}px`,
                        right: `${maxValueTooltipPosition.right}px`,
                        backgroundColor: '#333',
                        color: '#fff',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        lineHeight: '1.5',
                        whiteSpace: 'nowrap',
                        zIndex: 99999,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        minWidth: '200px',
                        pointerEvents: 'auto',
                        transform: 'translateX(0)'
                    }}
                >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {findMaxValueInfo.neighbourhood}
                    </div>
                    <div style={{ fontSize: '10px', color: '#ccc' }}>
                        {parseInt(findMaxValueInfo.day, 10)} de {formatMonthYear(currentMonth)}
                    </div>
                    {/* Tooltip arrow */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-6px',
                        right: '20px',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid #333'
                    }}></div>
                </div>
            )}
        </div>
    );
}

// Make the component available globally
window.TouristViewerPanel = TouristViewerPanel;

