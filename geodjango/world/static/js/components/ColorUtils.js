// Color utility functions for map visualization
// Based on the Python implementation in geo_zone.py

// Shared color schemes for different data types
const SHARED_COLOR_SCHEMES = {
    // Population (Red monochromatic - traditional population heatmap)
    population: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 25000,
        maxColor: '#d73027'
    },
    // Companies (Blue monochromatic - business/corporate)
    companies: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 7200,
        maxColor: '#2166ac'
    },
    // Jobs (Purple monochromatic - employment)
    jobs: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 36000,
        maxColor: '#762a83'
    },
    // Education (Green monochromatic - learning/growth)
    education: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 200,
        maxColor: '#1b7837'
    },
    // Health (Orange monochromatic - health/wellness)
    health: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 700,
        maxColor: '#e08214'
    },
    // Provision/Commerce (Teal monochromatic - retail/commerce)
    provision: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 5000,
        maxColor: '#018571'
    },
    // Leisure (Yellow monochromatic - recreation)
    leisure: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 50,
        maxColor: '#f1b82d'
    },
    // Housing (Brown monochromatic - residential)
    housing: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 5600,
        maxColor: '#8c510a'
    },
    // Crime color schemes - shared across years
    thefts: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 80,
        maxColor: '#d73027'
    },

    sexual_assault: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 30,
        maxColor: '#e08214'
    },

    house_thefts: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 15,
        maxColor: '#1b7837'
    },
    business_thefts: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 20,
        maxColor: '#762a83'
    },
    // Airbnb color schemes
    airbnb_listings: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 100,
        maxColor: '#4575b4'
    },
    airbnb_listings_price: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 180000,
        maxColor: '#d73027'
    },
    airbnb_listings_price_average: {
        minValue: 300,
        minColor: '#ffffff',
        maxValue: 12000,
        maxColor: '#1b7837'
    },
    // New Airbnb color schemes for different room types
    airbnb_listings_full_house: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 80,
        maxColor: '#4575b4'
    },
    airbnb_listings_full_house_price: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 150000,
        maxColor: '#d73027'
    },
    airbnb_listings_full_house_price_average: {
        minValue: 500,
        minColor: '#ffffff',
        maxValue: 15000,
        maxColor: '#1b7837'
    },
    airbnb_listings_private_room: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 60,
        maxColor: '#762a83'
    },
    airbnb_listings_private_room_price: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 80000,
        maxColor: '#e08214'
    },
    airbnb_listings_private_room_price_average: {
        minValue: 300,
        minColor: '#ffffff',
        maxValue: 8000,
        maxColor: '#018571'
    },
    airbnb_listings_shared_room: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 20,
        maxColor: '#f1b82d'
    },
    airbnb_listings_shared_room_price: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 20000,
        maxColor: '#f9c74f'
    },
    airbnb_listings_shared_room_price_average: {
        minValue: 200,
        minColor: '#ffffff',
        maxValue: 3000,
        maxColor: '#f1b82d'
    },
    airbnb_listings_entire_hotel: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 15,
        maxColor: '#8c510a'
    },
    airbnb_listings_entire_hotel_price: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 30000,
        maxColor: '#d73027'
    },
    airbnb_listings_entire_hotel_price_average: {
        minValue: 500,
        minColor: '#ffffff',
        maxValue: 5000,
        maxColor: '#8c510a'
    },
    // Movilidad color schemes
    ecobici_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 10,
        maxColor: '#4575b4'
    },
    cablebus_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 5,
        maxColor: '#d73027'
    },
    metro_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 4,
        maxColor: '#762a83'
    },
    metrobus_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 20,
        maxColor: '#1b7837'
    },
    rtp_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 60,
        maxColor: '#e08214'
    },
    concesionados_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 120,
        maxColor: '#018571'
    },
    tren_interurbano_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 8,
        maxColor: '#f1b82d'
    },
    tren_suburbano_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 12,
        maxColor: '#4575b4'
    },
    mexibus_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 18,
        maxColor: '#4575b4'
    },
    mexicable_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 6,
        maxColor: '#d73027'
    },
    tren_ligero_stations: {
        minValue: 0,
        minColor: '#ffffff',
        maxValue: 10,
        maxColor: '#762a83'
    }
};

// Field to color scheme mapping
const FIELD_TO_SCHEME_MAPPING = {
    // Direct mappings for non-crime data
    population: 'population',
    companies: 'companies',
    jobs: 'jobs',
    education: 'education',
    health: 'health',
    provision: 'provision',
    leisure: 'leisure',
    housing: 'housing',
    
    // Crime data mappings - all years use the same color schemes
    thefts_2020: 'thefts',
    thefts_2021: 'thefts',
    thefts_2022: 'thefts',
    thefts_2023: 'thefts',
    thefts_2024: 'thefts',
    
    cell_phone_thefts_2020: 'cell_phone_thefts',
    cell_phone_thefts_2021: 'cell_phone_thefts',
    cell_phone_thefts_2022: 'cell_phone_thefts',
    cell_phone_thefts_2023: 'cell_phone_thefts',
    cell_phone_thefts_2024: 'cell_phone_thefts',
    
    harrasment_2020: 'harrasment',
    harrasment_2021: 'harrasment',
    harrasment_2022: 'harrasment',
    harrasment_2023: 'harrasment',
    harrasment_2024: 'harrasment',
    
    sexual_assault_2020: 'sexual_assault',
    sexual_assault_2021: 'sexual_assault',
    sexual_assault_2022: 'sexual_assault',
    sexual_assault_2023: 'sexual_assault',
    sexual_assault_2024: 'sexual_assault',
    
    taxi_thefts_2020: 'taxi_thefts',
    taxi_thefts_2021: 'taxi_thefts',
    taxi_thefts_2022: 'taxi_thefts',
    taxi_thefts_2023: 'taxi_thefts',
    taxi_thefts_2024: 'taxi_thefts',
    
    house_thefts_2020: 'house_thefts',
    house_thefts_2021: 'house_thefts',
    house_thefts_2022: 'house_thefts',
    house_thefts_2023: 'house_thefts',
    house_thefts_2024: 'house_thefts',
    
    business_thefts_2020: 'business_thefts',
    business_thefts_2021: 'business_thefts',
    business_thefts_2022: 'business_thefts',
    business_thefts_2023: 'business_thefts',
    business_thefts_2024: 'business_thefts',
    
    // Airbnb data mappings
    airbnb_listings: 'airbnb_listings',
    airbnb_listings_price: 'airbnb_listings_price',
    airbnb_listings_price_average: 'airbnb_listings_price_average',
    airbnb_listings_full_house: 'airbnb_listings_full_house',
    airbnb_listings_full_house_price: 'airbnb_listings_full_house_price',
    airbnb_listings_full_house_price_average: 'airbnb_listings_full_house_price_average',
    airbnb_listings_private_room: 'airbnb_listings_private_room',
    airbnb_listings_private_room_price: 'airbnb_listings_private_room_price',
    airbnb_listings_private_room_price_average: 'airbnb_listings_private_room_price_average',
    airbnb_listings_shared_room: 'airbnb_listings_shared_room',
    airbnb_listings_shared_room_price: 'airbnb_listings_shared_room_price',
    airbnb_listings_shared_room_price_average: 'airbnb_listings_shared_room_price_average',
    airbnb_listings_entire_hotel: 'airbnb_listings_entire_hotel',
    airbnb_listings_entire_hotel_price: 'airbnb_listings_entire_hotel_price',
    airbnb_listings_entire_hotel_price_average: 'airbnb_listings_entire_hotel_price_average',
    
    // Movilidad data mappings
    ecobici_stations: 'ecobici_stations',
    cablebus_stations: 'cablebus_stations',
    metro_stations: 'metro_stations',
    metrobus_stations: 'metrobus_stations',
    rtp_stations: 'rtp_stations',
    concesionados_stations: 'concesionados_stations',
    tren_interurbano_stations: 'tren_interurbano_stations',
    tren_suburbano_stations: 'tren_suburbano_stations',
    mexibus_stations: 'mexibus_stations',
    mexicable_stations: 'mexicable_stations',
    tren_ligero_stations: 'tren_ligero_stations'
};

const ColorUtils = {
    // Get color scheme from SHARED_COLOR_SCHEMES using field mapping
    getColorScheme: (field) => {
        const schemeName = FIELD_TO_SCHEME_MAPPING[field];
        const brackets = SHARED_COLOR_SCHEMES[schemeName];
        if (!brackets) return ['', '#90be6d', '#f9c74f', '#f9844a', '#f94144', '#9b2226']; // Default colors
        return ['', brackets.minColor, brackets.maxColor];
    },

    // Get manual ranges for a field
    getManualRanges: (field) => {
        const schemeName = FIELD_TO_SCHEME_MAPPING[field];
        const brackets = SHARED_COLOR_SCHEMES[schemeName];
        if (!brackets) return [];
        return [{
            min: brackets.minValue,
            max: brackets.maxValue,
            color: brackets.minColor,
            endColor: brackets.maxColor
        }];
    },

    // Get color for a specific value using gradient interpolation
    getManualColorForValue: (field, value, minValue = null, maxValue = null, startColor = null, endColor = null, transformType = 'sqrt') => {
        const schemeName = FIELD_TO_SCHEME_MAPPING[field];
        const brackets = SHARED_COLOR_SCHEMES[schemeName];
        
        // If no range is provided, fall back to bracket logic
        if (minValue === null || maxValue === null) {
            if (!brackets) return '#90be6d';
            if (value <= brackets.minValue) return brackets.minColor;
            if (value >= brackets.maxValue) return brackets.maxColor;
            // Use gradient between min and max for values in between
            const normalizedValue = ColorUtils.normalizeWithTransform(value, brackets.minValue, brackets.maxValue, transformType);
            return ColorUtils.interpolateColor(brackets.minColor, brackets.maxColor, normalizedValue);
        }

        // Use provided colors or default gradient colors
        const c0 = startColor || (brackets ? brackets.minColor : '#90be6d');
        const c100 = endColor || (brackets ? brackets.maxColor : '#9b2226');

        // Normalize the value with the specified transformation to shift distribution towards zero
        const normalizedValue = ColorUtils.normalizeWithTransform(value, minValue, maxValue, transformType);

        // Interpolate between the two colors
        return ColorUtils.interpolateColor(c0, c100, normalizedValue);
    },

    // Normalize value with various transformations to shift distribution towards zero
    normalizeWithTransform: (value, minValue, maxValue, transformType = 'sqrt') => {
        // Ensure value is within bounds
        const clampedValue = Math.max(minValue, Math.min(maxValue, value));
        
        // Handle edge cases
        if (minValue === maxValue) return 0;
        if (clampedValue === minValue) return 0;
        if (clampedValue === maxValue) return 1;
        
        // First normalize to 0-1 range linearly
        const linearNormalized = (clampedValue - minValue) / (maxValue - minValue);
        
        // Apply transformation based on type
        switch (transformType) {
            case 'linear':
                return linearNormalized;
            
            case 'sqrt':
                // Square root transformation - moderate shift towards zero
                return Math.sqrt(linearNormalized);
            
            case 'cbrt':
                // Cube root transformation - strong shift towards zero
                return Math.pow(linearNormalized, 1/3);
            
            case 'log':
                // Logarithmic transformation - very strong shift towards zero
                if (linearNormalized === 0) return 0;
                const logBase = 10; // Can be adjusted for different effects
                return Math.log(linearNormalized * (logBase - 1) + 1) / Math.log(logBase);
            
            case 'power2':
                // Quadratic transformation - shift away from zero (opposite effect)
                return Math.pow(linearNormalized, 2);
            
            case 'power3':
                // Cubic transformation - strong shift away from zero
                return Math.pow(linearNormalized, 3);
            
            default:
                // Default to square root
                return Math.sqrt(linearNormalized);
        }
    },

    // Normalize value with logarithmic transformation to shift distribution towards zero
    normalizeWithLogTransform: (value, minValue, maxValue) => {
        // This function is kept for backward compatibility
        return ColorUtils.normalizeWithTransform(value, minValue, maxValue, 'log');
    },

    // Helper function to interpolate between two hex colors
    interpolateColor: (color1, color2, factor) => {
        // Convert hex to RGB
        const hex2rgb = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        };

        // Convert RGB to hex
        const rgb2hex = (r, g, b) => {
            const toHex = (n) => {
                const hex = Math.round(n).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        };

        const [r1, g1, b1] = hex2rgb(color1);
        const [r2, g2, b2] = hex2rgb(color2);

        // Guard against NaN inputs (non-numeric values, bad hex): an
        // unparseable color like "#NaNNaNNaN" crashes the Mapbox GL worker
        if (![r1, g1, b1, r2, g2, b2, factor].every(Number.isFinite)) {
            return color1 && /^#[0-9a-fA-F]{6}$/.test(color1) ? color1 : '#90be6d';
        }

        const r = r1 + (r2 - r1) * factor;
        const g = g1 + (g2 - g1) * factor;
        const b = b1 + (b2 - b1) * factor;

        return rgb2hex(r, g, b);
    },

    // Get color for a specific value from ranges
    getColorForValue: (value, ranges) => {
        for (const range of ranges) {
            if (value >= range.min && value < range.max) {
                return range.color;
            }
        }
        return ranges.length > 0 ? ranges[0].color : '#90be6d';
    },

    // Add color properties to features
    addColorsToFeatures: (features, field) => {
        // Get the min and max values from SHARED_COLOR_SCHEMES for this field
        const schemeName = FIELD_TO_SCHEME_MAPPING[field];
        const brackets = SHARED_COLOR_SCHEMES[schemeName];
        let minValue = null;
        let maxValue = null;
        let startColor = null;
        let endColor = null;
        
        if (brackets) {
            minValue = brackets.minValue;
            maxValue = brackets.maxValue;
            startColor = brackets.minColor;
            endColor = brackets.maxColor;
        }

        return features.map(feature => ({
            ...feature,
            properties: {
                ...feature.properties,
                [`${field}Color`]: ColorUtils.getManualColorForValue(
                    field, 
                    feature.properties[field] || 0,
                    minValue,
                    maxValue,
                    startColor,
                    endColor,
                    'cbrt' // Use cube root for strong shift towards zero
                )
            }
        }));
    },

    // Calculate ranges using cubic root transformation (same as Python)
    calculateRanges: (field, minValue, maxValue) => {
        if (minValue === null || maxValue === null || minValue === maxValue) {
            return [];
        }

        const colors = ColorUtils.getColorScheme(field);
        const step = (Math.pow(maxValue, 1/3) - Math.pow(minValue, 1/3)) / 5;
        const items = [];
        
        for (let i = 0; i < 6; i++) {
            items.push(Math.floor(Math.pow(Math.pow(minValue, 1/3) + i * step, 3)));
        }
        
        const ranges = [];
        for (let i = 1; i < 6; i++) {
            const bottomValue = items[i - 1];
            const topValue = i === 5 ? items[i] + 1 : items[i];
            
            ranges.push({
                min: bottomValue,
                max: topValue,
                color: colors[i],
                label: `${bottomValue.toLocaleString()} - ${(topValue - 1).toLocaleString()}`
            });
        }
        
        return ranges;
    },

    // Calculate ranges for a collection of features
    calculateRangesForFeatures: (features, field) => {
        const values = features
            .map(f => f.properties[field] || 0)
            .filter(v => v > 0);
        
        if (values.length === 0) {
            return [];
        }
        
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        
        return ColorUtils.calculateRanges(field, minValue, maxValue);
    },

    // Get legend data for a field
    getLegendData: (field, minValue, maxValue) => {
        const ranges = ColorUtils.calculateRanges(field, minValue, maxValue);
        return ranges.map(range => ({
            color: range.color,
            label: range.label,
            min: range.min,
            max: range.max
        }));
    },

    // Get color range (min and max colors) for a field
    getColorRange: (field) => {
        const schemeName = FIELD_TO_SCHEME_MAPPING[field];
        const brackets = SHARED_COLOR_SCHEMES[schemeName];
        if (!brackets) {
            return { minColor: '#ffffff', maxColor: '#90be6d' };
        }
        return { minColor: brackets.minColor, maxColor: brackets.maxColor };
    },

    // Helper function to add new crime type mappings for multiple years
    addCrimeTypeMapping: (crimeType, years = [2020, 2021, 2022, 2023, 2024]) => {
        years.forEach(year => {
            const fieldName = `${crimeType}_${year}`;
            FIELD_TO_SCHEME_MAPPING[fieldName] = crimeType;
        });
    },

    // Helper function to get all available fields for a specific crime type
    getFieldsForCrimeType: (crimeType) => {
        return Object.keys(FIELD_TO_SCHEME_MAPPING).filter(field => 
            FIELD_TO_SCHEME_MAPPING[field] === crimeType
        );
    },

    // Helper function to get all available crime types
    getAvailableCrimeTypes: () => {
        const crimeTypes = new Set();
        Object.values(FIELD_TO_SCHEME_MAPPING).forEach(scheme => {
            if (SHARED_COLOR_SCHEMES[scheme] && scheme !== 'population' && 
                scheme !== 'companies' && scheme !== 'jobs' && scheme !== 'education' && 
                scheme !== 'health' && scheme !== 'provision' && scheme !== 'leisure' && 
                scheme !== 'housing') {
                crimeTypes.add(scheme);
            }
        });
        return Array.from(crimeTypes);
    },
};

// Make the component available globally
window.ColorUtils = ColorUtils;

// Export for use in other components
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorUtils;
} 