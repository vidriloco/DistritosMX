function useBusinessLocationStats() {
    const [statsData, setStatsData] = React.useState(null);
    const [statsLoading, setStatsLoading] = React.useState(false);
    const [statsError, setStatsError] = React.useState(null);

    const fetchLocationStats = React.useCallback(async (selectedCodes, coordinates, radius) => {
        try {
            setStatsLoading(true);
            setStatsError(null);
            
            const response = await fetch('/api/business/location/stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selected_codes: selectedCodes,
                    coordinates: coordinates,
                    radius: radius
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                setStatsData(result.data);
            } else {
                throw new Error(result.message || 'Failed to fetch location stats');
            }
            
        } catch (error) {
            console.error('Error fetching business location stats:', error);
            setStatsError(error.message);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    return {
        statsData,
        statsLoading,
        statsError,
        fetchLocationStats
    };
}

// Make the hook available globally
window.useBusinessLocationStats = useBusinessLocationStats;
