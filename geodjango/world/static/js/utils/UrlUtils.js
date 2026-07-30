// Utility functions for building URLs based on environment
const UrlUtils = {
    // Environment detection
    isDev: () => {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    },

    // Base URLs for different data types
    getBaseUrl: (dataType) => {
        const IS_DEV = UrlUtils.isDev();
        
        const baseUrls = {
            agebs: {
                prod: 'https://wikiando.s3.us-east-2.amazonaws.com/agebs',
                dev: '/data/agebs'  // Use relative URL for development
            },
            transports: {
                prod: 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons',
                dev: '/data/transports'  // Use relative URL for development
            },
            transportAssets: {
                prod: 'https://wikiando.s3.us-east-2.amazonaws.com/transports/systems',
                dev: 'https://wikiando.s3.us-east-2.amazonaws.com/transports/systems'
            }
        };

        const urls = baseUrls[dataType];
        if (!urls) {
            throw new Error(`Unknown data type: ${dataType}`);
        }

        return IS_DEV ? urls.dev : urls.prod;
    },

    // Build URL for specific data type and file
    buildUrl: (dataType, filename) => {
        const baseUrl = UrlUtils.getBaseUrl(dataType);
        return `${baseUrl}/${filename}`;
    },

    // Specific helpers for common use cases
    getAgebsUrl: (filename = 'enriched-v3.json') => {
        const url = UrlUtils.buildUrl('agebs', filename);
        console.log('🌐 Generated AGEBS URL:', url);
        return url;
    },

    getNeighborhoodUrl: () => {
        return UrlUtils.buildUrl('agebs', 'hoods.json');
    },

    getTransportUrl: (system) => {
        return UrlUtils.buildUrl('transports', `${system}.geojson`);
    },

    // Transport system logo URLs
    getTransportSystemLogoUrl: (system) => {
        return UrlUtils.buildUrl('transportAssets', `${system}-logo.png`);
    },

    // Transport station image URLs
    getTransportStationImageUrl: (system, lineNumber, stationIdentifier) => {
        return UrlUtils.buildUrl('transportAssets', `stations/${system}/${lineNumber}/${stationIdentifier}.png`);
    }
};

export default UrlUtils;
