// Utility functions for building URLs based on environment
const UrlUtils = {
    // Environment detection
    isDev: () => {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    },

    // Base URLs for different data types
    getBaseUrl: (dataType) => {
        const IS_DEV = UrlUtils.isDev();
        
        // Dev URLs must use the page's own origin: the app's host port varies
        // (docker-compose maps 8110:8000) and 8000 may belong to another project
        const baseUrls = {
            agebs: {
                prod: 'https://wikiando.s3.us-east-2.amazonaws.com/agebs',
                dev: `${window.location.origin}/data/agebs`
            },
            transports: {
                prod: 'https://wikiando.s3.us-east-2.amazonaws.com/transports/geojsons',
                dev: `${window.location.origin}/data/transports`
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
        return UrlUtils.buildUrl('agebs', filename);
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

// Make the utility available globally
window.UrlUtils = UrlUtils; 