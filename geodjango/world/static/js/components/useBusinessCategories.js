function useBusinessCategories(shouldLoad = true) {
    const [categoriesData, setCategoriesData] = React.useState(null);
    const [categoriesLoading, setCategoriesLoading] = React.useState(shouldLoad);
    const [categoriesError, setCategoriesError] = React.useState(null);

    const fetchCategoriesData = React.useCallback(async () => {
        try {
            setCategoriesLoading(true);
            setCategoriesError(null);
            
            const response = await fetch('/api/business/categories');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                setCategoriesData(result.data);
            } else {
                throw new Error(result.message || 'Failed to fetch categories');
            }
            
        } catch (error) {
            console.error('Error fetching business categories:', error);
            setCategoriesError(error.message);
        } finally {
            setCategoriesLoading(false);
        }
    }, []);

    // Fetch categories data when component mounts
    React.useEffect(() => {
        if (shouldLoad) {
            fetchCategoriesData();
        }
    }, [fetchCategoriesData, shouldLoad]);

    return {
        categoriesData,
        categoriesLoading,
        categoriesError,
        fetchCategoriesData
    };
}

// Make the hook available globally
window.useBusinessCategories = useBusinessCategories;