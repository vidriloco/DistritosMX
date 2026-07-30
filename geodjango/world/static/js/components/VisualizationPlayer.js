/**
 * Visualization Player Component
 * Music player-style control for animating through days
 */
function VisualizationPlayer({ selectedPolygon, onDayChange, availableDays = [] }) {
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [playbackSpeed, setPlaybackSpeed] = React.useState(1000); // milliseconds per day
    const [visualizationStyle, setVisualizationStyle] = React.useState('heatmap'); // 'heatmap', 'elevaciones', or 'barras'
    const [currentMonth, setCurrentMonth] = React.useState('2024-11'); // Current month in format 'YYYY-MM'
    const intervalRef = React.useRef(null);
    
    // Available months for selection
    const availableMonths = [
        { key: '2024-11', label: 'Nov 2024' },
        { key: '2024-12', label: 'Dic 2024' },
        { key: '2025-06', label: 'Jun 2025' },
        { key: '2025-07', label: 'Jul 2025' }
    ];
    
    // Get month abbreviation from month key (Spanish)
    const getMonthAbbreviation = (monthKey) => {
        const monthMap = {
            '2024-11': 'Nov',
            '2024-12': 'Dic',
            '2025-06': 'Jun',
            '2025-07': 'Jul'
        };
        return monthMap[monthKey] || 'Nov';
    };
    
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
    
    // Get available days from selected polygon, memoized to only recalculate when month, polygon, or availableDays prop changes
    const days = React.useMemo(() => {
        if (availableDays && availableDays.length > 0) {
            // Filter availableDays based on actual days in the selected month
            const maxDays = getMaxDaysInMonth(currentMonth);
            return availableDays.filter(day => {
                const dayNum = parseInt(day, 10);
                return !isNaN(dayNum) && dayNum >= 1 && dayNum <= maxDays;
            });
        }
        
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
        
        const daysData = monthData.days;
        if (!daysData || typeof daysData !== 'object') {
            return [];
        }
        
        let dayKeys = Object.keys(daysData).sort();
        
        // Filter to only include valid days for the selected month
        const maxDays = getMaxDaysInMonth(currentMonth);
        dayKeys = dayKeys.filter(day => {
            const dayNum = parseInt(day, 10);
            return !isNaN(dayNum) && dayNum >= 1 && dayNum <= maxDays;
        });
        
        return dayKeys;
    }, [currentMonth, selectedPolygon, availableDays]);
    
    const maxIndex = days.length > 0 ? days.length - 1 : 0;
    
    // Ensure currentIndex is within valid range when days change
    React.useEffect(() => {
        if (currentIndex > maxIndex && maxIndex >= 0) {
            setCurrentIndex(Math.max(0, maxIndex));
        }
    }, [maxIndex]);
    
    // Update current day when index or month changes
    React.useEffect(() => {
        if (days.length > 0 && currentIndex >= 0 && currentIndex < days.length) {
            const day = days[currentIndex];
            if (onDayChange) {
                onDayChange(day);
            }
            // Dispatch custom event for map updates with both day and month
            window.dispatchEvent(new CustomEvent('touristDayChanged', { 
                detail: { day, month: currentMonth } 
            }));
        }
    }, [currentIndex, days, currentMonth]);
    
    // Dispatch month change event
    React.useEffect(() => {
        window.dispatchEvent(new CustomEvent('touristMonthChanged', { 
            detail: currentMonth 
        }));
    }, [currentMonth]);
    
    // Handle play/pause
    const handlePlayPause = () => {
        if (days.length === 0) return;
        
        if (isPlaying) {
            // Pause
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsPlaying(false);
        } else {
            // Play
            setIsPlaying(true);
            
            // If at the end, restart from beginning
            if (currentIndex >= maxIndex) {
                setCurrentIndex(0);
            }
            
            // Start animation
            intervalRef.current = setInterval(() => {
                setCurrentIndex(prev => {
                    if (prev >= maxIndex) {
                        // Stop at the end
                        setIsPlaying(false);
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        return prev;
                    }
                    return prev + 1;
                });
            }, playbackSpeed);
        }
    };
    
    // Handle slider change
    const handleSliderChange = (event) => {
        const index = parseInt(event.target.value, 10);
        if (index >= 0 && index <= maxIndex) {
            setCurrentIndex(index);
            
            // Stop playback if playing
            if (isPlaying) {
                setIsPlaying(false);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        }
    };
    
    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);
    
    // Reset when polygon changes
    React.useEffect(() => {
        setCurrentIndex(0);
        setIsPlaying(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [selectedPolygon]);
    
    // Reset index when month changes
    React.useEffect(() => {
        setCurrentIndex(0);
        setIsPlaying(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [currentMonth]);
    
    // Handle month change
    const handleMonthChange = (monthKey) => {
        setCurrentMonth(monthKey);
    };
    
    // Check if disabled for functionality, but don't show visual disabled state
    // We allow interaction even when there is no selected polygon, as long as there are days to animate
    const isDisabled = days.length === 0;
    
    const sliderPercentage = maxIndex > 0 ? (currentIndex / maxIndex) * 100 : 0;
    
    // Compact, modern design
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: '8px',
            padding: '12px 16px',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            fontFamily: "'Ruda', sans-serif"
        }}>
            {/* Compact horizontal layout: Play button + Slider + Current day */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                {/* Play/Pause Button - Colorless SVG */}
                <button
                    onClick={handlePlayPause}
                    disabled={isDisabled}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        padding: 0
                    }}
                >
                    {isPlaying ? (
                        // Pause icon SVG
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="6" y="4" width="4" height="16" fill="#000" rx="1"/>
                            <rect x="14" y="4" width="4" height="16" fill="#000" rx="1"/>
                        </svg>
                    ) : (
                        // Play icon SVG
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 5v14l11-7z" fill="#000"/>
                        </svg>
                    )}
                </button>
                
                {/* Slider - takes remaining space */}
                <div style={{
                    flex: 1,
                    minWidth: 0
                }}>
                    <input
                        key={`slider-${currentMonth}-${maxIndex}`}
                        type="range"
                        min="0"
                        max={maxIndex}
                        value={currentIndex}
                        onChange={handleSliderChange}
                        disabled={isDisabled}
                        style={{
                            width: '100%',
                            height: '4px',
                            borderRadius: '2px',
                            background: isDisabled 
                                ? '#e8e8e8'
                                : `linear-gradient(to right, #000 0%, #000 ${sliderPercentage}%, #e8e8e8 ${sliderPercentage}%, #e8e8e8 100%)`,
                            outline: 'none',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            WebkitAppearance: 'none',
                            appearance: 'none'
                        }}
                    />
                    <style>{`
                        input[type="range"]::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            appearance: none;
                            width: 14px;
                            height: 14px;
                            border-radius: 50%;
                            background: #000;
                            cursor: pointer;
                            border: 2px solid #fff;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                            transition: transform 0.1s ease;
                        }
                        input[type="range"]::-webkit-slider-thumb:hover {
                            transform: scale(1.15);
                        }
                        input[type="range"]::-moz-range-thumb {
                            width: 14px;
                            height: 14px;
                            border-radius: 50%;
                            background: #000;
                            cursor: pointer;
                            border: 2px solid #fff;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                            transition: transform 0.1s ease;
                        }
                        input[type="range"]::-moz-range-thumb:hover {
                            transform: scale(1.15);
                        }
                    `}</style>
                </div>
                
                {/* Current day indicator - larger */}
                <div style={{
                    minWidth: '60px',
                    textAlign: 'center',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#000',
                    flexShrink: 0
                }}>
                    {days.length > 0 && currentIndex >= 0 && currentIndex < days.length ? (() => {
                        const day = days[currentIndex];
                        // Remove leading zero and add month abbreviation
                        const dayNumber = parseInt(day, 10);
                        const monthAbbr = getMonthAbbreviation(currentMonth);
                        return `${dayNumber} ${monthAbbr}`;
                    })() : '--'}
                </div>
            </div>
            
            {/* Month selector buttons */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '12px',
                flexWrap: 'wrap'
            }}>
                {availableMonths.map(month => (
                    <button
                        key={month.key}
                        onClick={() => handleMonthChange(month.key)}
                        style={{
                            padding: '6px 12px',
                            border: `1px solid ${currentMonth === month.key ? '#000' : '#e0e0e0'}`,
                            borderRadius: '4px',
                            backgroundColor: currentMonth === month.key ? '#000' : '#fff',
                            color: currentMonth === month.key ? '#fff' : '#333',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            fontFamily: "'Ruda', sans-serif"
                        }}
                        onMouseEnter={(e) => {
                            if (currentMonth !== month.key) {
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                                e.currentTarget.style.borderColor = '#ccc';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentMonth !== month.key) {
                                e.currentTarget.style.backgroundColor = '#fff';
                                e.currentTarget.style.borderColor = '#e0e0e0';
                            }
                        }}
                    >
                        {month.label}
                    </button>
                ))}
            </div>
            
            {/* Separator */}
            <div style={{
                height: '1px',
                backgroundColor: '#e0e0e0',
                margin: '16px 0'
            }}></div>
            
            {/* Visualization style selector */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    fontSize: '12px',
                    color: '#666',
                    fontWeight: '500'
                }}>
                    Estilo de la visualización
                </div>
                
                {/* Style toggle button */}
                <button
                    onClick={() => {
                        // Cycle through: heatmap -> elevaciones -> barras -> heatmap
                        let newStyle;
                        if (visualizationStyle === 'heatmap') {
                            newStyle = 'elevaciones';
                        } else if (visualizationStyle === 'elevaciones') {
                            newStyle = 'barras';
                        } else {
                            newStyle = 'heatmap';
                        }
                        setVisualizationStyle(newStyle);
                        // Dispatch custom event for map updates
                        const event = new CustomEvent('touristVisualizationStyleChanged', { detail: newStyle });
                        window.dispatchEvent(event);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#333',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                        e.currentTarget.style.borderColor = '#ccc';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fff';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                >
                    {visualizationStyle === 'heatmap' ? (
                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                            React.createElement('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
                                React.createElement('rect', { x: '2', y: '2', width: '8', height: '8', fill: '#e3f2fd', stroke: '#333', strokeWidth: '1' }),
                                React.createElement('rect', { x: '12', y: '2', width: '8', height: '8', fill: '#90caf9', stroke: '#333', strokeWidth: '1' }),
                                React.createElement('rect', { x: '2', y: '12', width: '8', height: '8', fill: '#42a5f5', stroke: '#333', strokeWidth: '1' }),
                                React.createElement('rect', { x: '12', y: '12', width: '8', height: '8', fill: '#0277bd', stroke: '#333', strokeWidth: '1' })
                            ),
                            React.createElement('span', null, 'Heatmap')
                        )
                    ) : visualizationStyle === 'elevaciones' ? (
                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                            React.createElement('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
                                React.createElement('rect', { x: '4', y: '12', width: '4', height: '8', fill: '#333', opacity: '0.8' }),
                                React.createElement('rect', { x: '10', y: '8', width: '4', height: '12', fill: '#333', opacity: '0.9' }),
                                React.createElement('rect', { x: '16', y: '6', width: '4', height: '14', fill: '#333' }),
                                React.createElement('line', { x1: '4', y1: '12', x2: '4', y2: '20', stroke: '#333', strokeWidth: '1' }),
                                React.createElement('line', { x1: '10', y1: '8', x2: '10', y2: '20', stroke: '#333', strokeWidth: '1' }),
                                React.createElement('line', { x1: '16', y1: '6', x2: '16', y2: '20', stroke: '#333', strokeWidth: '1' })
                            ),
                            React.createElement('span', null, 'Elevaciones')
                        )
                    ) : (
                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                            React.createElement('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
                                // Cylinder shape - ellipse for top, rectangle for body, ellipse for bottom
                                React.createElement('ellipse', { cx: '12', cy: '6', rx: '6', ry: '2', fill: '#333', opacity: '0.7' }),
                                React.createElement('rect', { x: '6', y: '6', width: '12', height: '12', fill: '#333' }),
                                React.createElement('ellipse', { cx: '12', cy: '18', rx: '6', ry: '2', fill: '#333', opacity: '0.5' }),
                                // Vertical line to show it's a cylinder
                                React.createElement('line', { x1: '6', y1: '6', x2: '6', y2: '18', stroke: '#333', strokeWidth: '1', opacity: '0.8' }),
                                React.createElement('line', { x1: '18', y1: '6', x2: '18', y2: '18', stroke: '#333', strokeWidth: '1', opacity: '0.8' })
                            ),
                            React.createElement('span', null, 'Barras')
                        )
                    )}
                </button>
            </div>
        </div>
    );
}

// Make the component available globally
window.VisualizationPlayer = VisualizationPlayer;

