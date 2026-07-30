function useTerritoryData(shouldLoad = true) {
    const [indicatorsData, setIndicatorsData] = React.useState(null);
    const [indicatorsLoading, setIndicatorsLoading] = React.useState(false);
    const [indicatorsError, setIndicatorsError] = React.useState(null);
    const [downloadProgress, setDownloadProgress] = React.useState(0);
    const [isMobile, setIsMobile] = React.useState(false);

    // Handle mobile detection with useEffect
    React.useEffect(() => {
        const mediaQuery = window.matchMedia("only screen and (max-width: 767px)");
        const handleMediaChange = (e) => setIsMobile(e.matches);
        
        // Set initial value
        setIsMobile(mediaQuery.matches);
        
        // Add listener for changes
        if (mediaQuery.addListener) {
            mediaQuery.addListener(handleMediaChange);
        } else {
            mediaQuery.addEventListener('change', handleMediaChange);
        }
        
        // Cleanup
        return () => {
            if (mediaQuery.removeListener) {
                mediaQuery.removeListener(handleMediaChange);
            } else {
                mediaQuery.removeEventListener('change', handleMediaChange);
            }
        };
    }, []);

    // Check if we're on explore route
    const isExploreRoute = React.useMemo(() => {
        return window.location.pathname === '/explorar' || window.location.pathname === '/explorar/';
    }, []);

    const fetchIndicatorsData = React.useCallback(async (dataType = 'agebs') => {
        // Don't load data if we're on mobile and on explore route
        if (isMobile && isExploreRoute) {
            return;
        }
        try {
            setIndicatorsLoading(true);
            setIndicatorsError(null);
            setDownloadProgress(0);
            
            // Add a small delay to make loading state visible for testing
            await new Promise(resolve => setTimeout(resolve, 1000));
            setDownloadProgress(10);
            
            // Use centralized URL utility
            let dataUrl;
            if (dataType === 'neighbourhood') {
                dataUrl = UrlUtils.getNeighborhoodUrl();
            } else {
                // Default to AGEBs data
                dataUrl = UrlUtils.getAgebsUrl();
            }
            
            const response = await fetch(dataUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Get the total size for progress tracking
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            
            if (total > 0) {
                // Use ReadableStream to track progress
                const reader = response.body.getReader();
                let receivedLength = 0;
                const chunks = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;
                    
                    chunks.push(value);
                    receivedLength += value.length;
                    
                    // Calculate progress percentage
                    const progress = Math.round((receivedLength / total) * 80) + 10; // 10-90% range
                    setDownloadProgress(progress);
                }
                
                // Combine chunks into a single Uint8Array
                const chunksAll = new Uint8Array(receivedLength);
                let position = 0;
                for (const chunk of chunks) {
                    chunksAll.set(chunk, position);
                    position += chunk.length;
                }
                
                // Convert to text and parse JSON
                const text = new TextDecoder().decode(chunksAll);
                const data = JSON.parse(text);
                setDownloadProgress(95);
                
                setIndicatorsData(data);
                
                setDownloadProgress(100);
                
                // Wait a moment to show 100% completion before dismissing
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                // Fallback for when content-length is not available
                const data = await response.json();
                setDownloadProgress(100);
                setIndicatorsData(data);
                
                // Wait a moment to show 100% completion before dismissing
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            setIndicatorsError(error.message);
        } finally {
            setIndicatorsLoading(false);
        }
    }, []);

    // Fetch indicators data when component mounts (default to AGEBs)
    React.useEffect(() => {
        if (shouldLoad && !(isMobile && isExploreRoute)) {
            fetchIndicatorsData('agebs');
        }
    }, [fetchIndicatorsData, shouldLoad, isMobile, isExploreRoute]);

    return {
        indicatorsData,
        indicatorsLoading,
        indicatorsError,
        downloadProgress,
        fetchIndicatorsData
    };
}

// Make the hook available globally
window.useTerritoryData = useTerritoryData; 