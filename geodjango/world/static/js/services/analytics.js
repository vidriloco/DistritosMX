/**
 * Analytics Service - Functional Approach
 * 
 * This service provides a simple function-based API for tracking events
 * that can be easily called from React components or anywhere in the app.
 */

import { ANALYTICS_EVENTS, ANALYTICS_PROPERTIES, getEventName, validateEventProperties } from '../constants/analytics.js';

// Global state for analytics
let mixpanelInstance = null;
let isInitialized = false;
let projectToken = null;
let sessionId = null;

/**
 * Initialize Mixpanel with the provided token
 * @param {string} token - Mixpanel project token
 * @param {Object} options - Additional initialization options
 */
export function initAnalytics(token, options = {}) {
    if (isInitialized) {
        console.warn('Analytics already initialized');
        return;
    }

    projectToken = token;
    
    // Check if Mixpanel is available
    if (typeof mixpanel === 'undefined') {
        console.error('Mixpanel is not loaded. Make sure to include the Mixpanel script.');
        return;
    }

    try {
        // Initialize Mixpanel
        mixpanel.init(token, {
            debug: options.debug || false,
            track_pageview: options.track_pageview || false,
            persistence: options.persistence || 'localStorage',
            ...options
        });

        mixpanelInstance = mixpanel;
        isInitialized = true;
        sessionId = generateSessionId();

        // Set default properties
        setDefaultProperties();

        console.log('Analytics initialized successfully');
    } catch (error) {
        console.error('Failed to initialize analytics:', error);
    }
}

/**
 * Set default properties for all events
 */
function setDefaultProperties() {
    if (!isInitialized) return;

    const defaultProps = {
        [ANALYTICS_PROPERTIES.PAGE_URL]: window.location.href,
        [ANALYTICS_PROPERTIES.PAGE_TITLE]: document.title,
        [ANALYTICS_PROPERTIES.REFERRER]: document.referrer,
        [ANALYTICS_PROPERTIES.SESSION_ID]: sessionId,
        [ANALYTICS_PROPERTIES.TIMESTAMP]: new Date().toISOString()
    };

    mixpanelInstance.register(defaultProps);
}

/**
 * Generate a unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Main tracking function - can be called from anywhere including React components
 * @param {string} eventKey - Event key from ANALYTICS_EVENTS
 * @param {Object} properties - Additional properties for the event
 */
export function trackEvent(eventKey, properties = {}) {
    if (!isInitialized) {
        console.warn('Analytics not initialized. Event not tracked:', eventKey);
        return;
    }

    const eventName = getEventName(eventKey);
    const validatedProperties = validateEventProperties(properties);

    try {
        mixpanelInstance.track(eventName, validatedProperties);
        console.log('Event tracked:', eventName, validatedProperties);
    } catch (error) {
        console.error('Failed to track event:', eventName, error);
    }
}

/**
 * Track a page view
 * @param {string} pageName - Name of the page
 * @param {Object} properties - Additional properties
 */
export function trackPageView(pageName, properties = {}) {
    trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
        [ANALYTICS_PROPERTIES.FEATURE_NAME]: pageName,
        ...properties
    });
}

/**
 * Track a button click
 * @param {string} buttonText - Text of the button
 * @param {string} buttonLocation - Location of the button
 * @param {Object} properties - Additional properties
 */
export function trackButtonClick(buttonText, buttonLocation, properties = {}) {
    trackEvent(ANALYTICS_EVENTS.BUTTON_CLICK, {
        [ANALYTICS_PROPERTIES.BUTTON_TEXT]: buttonText,
        [ANALYTICS_PROPERTIES.BUTTON_LOCATION]: buttonLocation,
        ...properties
    });
}

/**
 * Track a form submission
 * @param {string} formName - Name of the form
 * @param {Object} properties - Additional properties
 */
export function trackFormSubmit(formName, properties = {}) {
    trackEvent(ANALYTICS_EVENTS.FORM_SUBMIT, {
        [ANALYTICS_PROPERTIES.FEATURE_NAME]: formName,
        ...properties
    });
}

/**
 * Track an error
 * @param {string} errorMessage - Error message
 * @param {string} errorType - Type of error
 * @param {Object} properties - Additional properties
 */
export function trackError(errorMessage, errorType = 'general', properties = {}) {
    trackEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, {
        [ANALYTICS_PROPERTIES.ERROR_MESSAGE]: errorMessage,
        error_type: errorType,
        ...properties
    });
}

/**
 * Set user properties
 * @param {string} userId - User ID
 * @param {Object} properties - User properties
 */
export function identifyUser(userId, properties = {}) {
    if (!isInitialized) return;

    try {
        mixpanelInstance.identify(userId);
        if (Object.keys(properties).length > 0) {
            mixpanelInstance.people.set(properties);
        }
    } catch (error) {
        console.error('Failed to identify user:', error);
    }
}

/**
 * Set user properties without changing the user ID
 * @param {Object} properties - User properties
 */
export function setUserProperties(properties) {
    if (!isInitialized) return;

    try {
        mixpanelInstance.people.set(properties);
    } catch (error) {
        console.error('Failed to set user properties:', error);
    }
}

/**
 * Reset the user session
 */
export function resetAnalytics() {
    if (!isInitialized) return;

    try {
        mixpanelInstance.reset();
    } catch (error) {
        console.error('Failed to reset analytics:', error);
    }
}

/**
 * Check if analytics is initialized
 * @returns {boolean} Whether analytics is initialized
 */
export function isAnalyticsInitialized() {
    return isInitialized;
}

/**
 * Get the current session ID
 * @returns {string|null} Current session ID
 */
export function getSessionId() {
    return sessionId;
}

// Convenience functions for common events
export const trackVisitStarted = (properties = {}) => trackEvent(ANALYTICS_EVENTS.VISIT_STARTED, properties);
export const trackToUseCases = (properties = {}) => trackEvent(ANALYTICS_EVENTS.TO_USE_CASES, properties);
export const trackInterestHousing = (properties = {}) => trackEvent(ANALYTICS_EVENTS.INTEREST_HOUSING, properties);
export const trackToBusiness = (properties = {}) => trackEvent(ANALYTICS_EVENTS.TO_BUSINESS, properties);
export const trackInterestTransport = (properties = {}) => trackEvent(ANALYTICS_EVENTS.INTEREST_TRANSPORT, properties);
export const trackUserConverted = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_CONVERTED, properties);
export const trackExploreVisited = (properties = {}) => trackEvent(ANALYTICS_EVENTS.EXPLORE_VISITED, properties);
export const trackBusinessVisited = (properties = {}) => trackEvent(ANALYTICS_EVENTS.BUSINESS_VISITED, properties);
export const trackUserSelectedLocation = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_SELECTED_LOCATION, properties);
export const trackUserSelectedCategories = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_SELECTED_CATEGORIES, properties);
export const trackUserSelectedRadius = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_SELECTED_RADIUS, properties);
export const trackUserConfirmedSelection = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_CONFIRMED_SELECTION, properties);
export const trackUserReviewingSelection = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_REVIEWING_SELECTION, properties);
export const trackUserSeeingStats = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_SEEING_STATS, properties);
export const trackUserRefineSelection = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_REFINE_SELECTION, properties);
export const trackUserSeeingMoreStats = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_SEEING_MORE_STATS, properties);
export const trackUserClickPdfGeneration = (properties = {}) => trackEvent(ANALYTICS_EVENTS.USER_CLICK_PDF_GENERATION, properties);

// Make the main tracking function available globally for easy access
window.trackEvent = trackEvent;
window.initAnalytics = initAnalytics;
window.trackPageView = trackPageView;
window.trackButtonClick = trackButtonClick;
window.trackFormSubmit = trackFormSubmit;
window.trackError = trackError;
window.identifyUser = identifyUser;
window.setUserProperties = setUserProperties;
window.resetAnalytics = resetAnalytics;
window.isAnalyticsInitialized = isAnalyticsInitialized;
window.getSessionId = getSessionId;

// Export convenience functions globally as well
window.trackVisitStarted = trackVisitStarted;
window.trackToUseCases = trackToUseCases;
window.trackInterestHousing = trackInterestHousing;
window.trackToBusiness = trackToBusiness;
window.trackInterestTransport = trackInterestTransport;
window.trackUserConverted = trackUserConverted;
window.trackExploreVisited = trackExploreVisited;
window.trackBusinessVisited = trackBusinessVisited;
window.trackUserSelectedLocation = trackUserSelectedLocation;
window.trackUserSelectedCategories = trackUserSelectedCategories;
window.trackUserSelectedRadius = trackUserSelectedRadius;
window.trackUserConfirmedSelection = trackUserConfirmedSelection;
window.trackUserReviewingSelection = trackUserReviewingSelection;
window.trackUserSeeingStats = trackUserSeeingStats;
window.trackUserRefineSelection = trackUserRefineSelection;
window.trackUserSeeingMoreStats = trackUserSeeingMoreStats;
window.trackUserClickPdfGeneration = trackUserClickPdfGeneration;
