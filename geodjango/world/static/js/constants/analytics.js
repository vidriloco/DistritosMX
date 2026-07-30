/**
 * Analytics Event Names
 * 
 * This file contains all the event names used for Mixpanel tracking.
 * Keep all event names centralized here for consistency and easy maintenance.
 */

export const ANALYTICS_EVENTS = {
    // Landing page events
    VISIT_STARTED: 'visit-started',
    
    // Main flow events
    TO_USE_CASES: 'to-use-cases',
    INTEREST_HOUSING: 'interest-housing',
    TO_BUSINESS: 'to-business',
    INTEREST_TRANSPORT: 'interest-transport',
    
    // Conversion events
    USER_CONVERTED: 'user-converted',
    
    // Page visit events
    EXPLORE_VISITED: 'explore-visited',
    BUSINESS_VISITED: 'business',
    
    // Business Wizard events
    USER_SELECTED_LOCATION: 'user-selected-location',
    USER_SELECTED_CATEGORIES: 'user-selected-categories',
    USER_SELECTED_RADIUS: 'user-selected-radius',
    USER_CONFIRMED_SELECTION: 'user-confirmed-selection',
    USER_REVIEWING_SELECTION: 'user-reviewing-selection',
    
    // Business Stats events
    USER_SEEING_STATS: 'user-seeing-stats',
    USER_REFINE_SELECTION: 'user-refine-selection',
    USER_SEEING_MORE_STATS: 'user-seeing-more-stats',
    USER_CLICK_PDF_GENERATION: 'user-click-pdf-generation',
    
    // Additional events that might be useful
    PAGE_VIEW: 'page-view',
    BUTTON_CLICK: 'button-click',
    FORM_SUBMIT: 'form-submit',
    ERROR_OCCURRED: 'error-occurred',
    FEATURE_USED: 'feature-used'
};

/**
 * Event Properties
 * 
 * Common properties that can be added to events for better tracking
 */
export const ANALYTICS_PROPERTIES = {
    // Page properties
    PAGE_URL: 'page_url',
    PAGE_TITLE: 'page_title',
    REFERRER: 'referrer',
    
    // User properties
    USER_ID: 'user_id',
    USER_TYPE: 'user_type',
    
    // Session properties
    SESSION_ID: 'session_id',
    TIMESTAMP: 'timestamp',
    
    // Custom properties
    BUTTON_TEXT: 'button_text',
    BUTTON_LOCATION: 'button_location',
    FEATURE_NAME: 'feature_name',
    ERROR_MESSAGE: 'error_message'
};

/**
 * Helper function to get event name with validation
 * @param {string} eventKey - The key from ANALYTICS_EVENTS
 * @returns {string} The event name
 */
export function getEventName(eventKey) {
    if (!ANALYTICS_EVENTS[eventKey]) {
        console.warn(`Analytics event "${eventKey}" not found in ANALYTICS_EVENTS`);
        return eventKey;
    }
    return ANALYTICS_EVENTS[eventKey];
}

/**
 * Helper function to validate event properties
 * @param {Object} properties - The properties object to validate
 * @returns {Object} The validated properties object
 */
export function validateEventProperties(properties = {}) {
    const validated = {};
    
    // Add timestamp if not present
    if (!properties[ANALYTICS_PROPERTIES.TIMESTAMP]) {
        validated[ANALYTICS_PROPERTIES.TIMESTAMP] = new Date().toISOString();
    }
    
    // Add page URL if not present
    if (!properties[ANALYTICS_PROPERTIES.PAGE_URL]) {
        validated[ANALYTICS_PROPERTIES.PAGE_URL] = window.location.href;
    }
    
    // Add page title if not present
    if (!properties[ANALYTICS_PROPERTIES.PAGE_TITLE]) {
        validated[ANALYTICS_PROPERTIES.PAGE_TITLE] = document.title;
    }
    
    // Merge with provided properties
    return { ...validated, ...properties };
}
