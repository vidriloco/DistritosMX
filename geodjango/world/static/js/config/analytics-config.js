/**
 * Analytics Configuration
 * 
 * This file contains configuration settings for analytics services.
 * Update these values as needed for your environment.
 */

window.ANALYTICS_CONFIG = {
    // Mixpanel Configuration
    MIXPANEL: {
        // Replace with your actual Mixpanel project token
        PROJECT_TOKEN: '6d19199a925b706938c50559f716b886',
        
        // Environment-specific settings
        DEBUG: false, // Set to true for development
        TRACK_PAGEVIEW: false,
        PERSISTENCE: 'localStorage',
        
        // Additional options
        OPTIONS: {
            // Enable/disable specific tracking features
            TRACK_LINKS: true,
            TRACK_FORMS: true,
            TRACK_WITH_GROUPS: false,
            
            // Custom settings
            CUSTOM_LIB_URL: null, // Set custom Mixpanel library URL if needed
        }
    },
    
    // Feature flags for analytics
    FEATURES: {
        ENABLE_ANALYTICS: true,
        ENABLE_DEBUG_LOGGING: false,
        ENABLE_ERROR_TRACKING: true,
        ENABLE_PERFORMANCE_TRACKING: false
    },
    
    // Event tracking settings
    TRACKING: {
        // Minimum time between events (in milliseconds) to prevent spam
        MIN_EVENT_INTERVAL: 1000,
        
        // Maximum events per session
        MAX_EVENTS_PER_SESSION: 1000,
        
        // Events to ignore (won't be tracked)
        IGNORED_EVENTS: [
            'heartbeat',
            'ping'
        ]
    }
};

/**
 * Get analytics configuration for a specific service
 * @param {string} service - The service name (e.g., 'MIXPANEL')
 * @returns {Object} Configuration object for the service
 */
window.getAnalyticsConfig = function(service) {
    return window.ANALYTICS_CONFIG[service] || {};
};

/**
 * Check if analytics is enabled
 * @returns {boolean} True if analytics is enabled
 */
window.isAnalyticsEnabled = function() {
    return window.ANALYTICS_CONFIG.FEATURES.ENABLE_ANALYTICS;
};

/**
 * Check if debug logging is enabled
 * @returns {boolean} True if debug logging is enabled
 */
window.isDebugLoggingEnabled = function() {
    return window.ANALYTICS_CONFIG.FEATURES.ENABLE_DEBUG_LOGGING;
};
