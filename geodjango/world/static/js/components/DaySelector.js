// DaySelector component - Shows day buttons for selected device
function DaySelector() {
    const [deviceDateRange, setDeviceDateRange] = React.useState(null);
    const [selectedDay, setSelectedDay] = React.useState(null);

    // Listen to global state changes
    React.useEffect(() => {
        const handleStateChange = (state) => {
            setDeviceDateRange(state.deviceDateRange);
            setSelectedDay(state.selectedDay);
        };

        // Check initial state immediately
        if (window.DaySelectorState) {
            const initialState = {
                deviceDateRange: window.DaySelectorState.deviceDateRange,
                selectedDay: window.DaySelectorState.selectedDay
            };
            setDeviceDateRange(initialState.deviceDateRange);
            setSelectedDay(initialState.selectedDay);
        }

        // Add listener
        if (window.DaySelectorState) {
            window.DaySelectorState.addListener(handleStateChange);
        }

        // Cleanup listener on unmount
        return () => {
            if (window.DaySelectorState) {
                window.DaySelectorState.removeListener(handleStateChange);
            }
        };
    }, []);

    // Helper function to format date for display
    const formatDateForDisplay = (date) => {
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long'
        });
    };

    // Handle day selection
    const handleDaySelection = (dayIndex) => {
        setSelectedDay(dayIndex);
        window.DaySelectorState.setSelectedDay(dayIndex);
    };

    // Don't render if no date range
    if (!deviceDateRange || !deviceDateRange.days || deviceDateRange.days.length === 0) {
        return null;
    }

    return React.createElement('div', {
        className: 'day-selector-container'
    }, [
        React.createElement('div', {
            key: 'day-selector',
            className: 'day-selector'
        }, deviceDateRange.days.map((day, index) => 
            React.createElement('button', {
                key: index,
                className: `day-button ${selectedDay === index ? 'selected' : ''}`,
                onClick: () => handleDaySelection(index)
            }, [
                React.createElement('div', {
                    key: 'day-number',
                    className: 'day-number'
                }, `Día ${index + 1}`),
                React.createElement('div', {
                    key: 'day-date',
                    className: 'day-date'
                }, formatDateForDisplay(day))
            ])
        ))
    ]);
}

// Export for use in other components
window.DaySelector = DaySelector;
