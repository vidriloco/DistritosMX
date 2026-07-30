import React from 'react';

function useBusinessLocationStats() {
    const [statsData, setStatsData] = React.useState(null);
    const [statsLoading, setStatsLoading] = React.useState(false);
    const [statsError, setStatsError] = React.useState(null);

    const fetchLocationStats = React.useCallback(async (selectedCodes, coordinates, radius) => {
        try {
            setStatsLoading(true);
            setStatsError(null);
            
            console.log('Fetching business location stats...', {
                selectedCodes,
                coordinates,
                radius
            });
            
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
                console.log('Business location stats fetched successfully:', result);
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

export default useBusinessLocationStats;
