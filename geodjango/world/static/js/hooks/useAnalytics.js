import { useCallback } from 'react';
import {
    trackEvent,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackError,
    trackUserSelectedLocation,
    trackUserSelectedCategories,
    trackUserSelectedRadius,
    trackUserConfirmedSelection,
    trackUserReviewingSelection,
    trackUserSeeingStats,
    trackUserRefineSelection,
    trackUserSeeingMoreStats,
    trackUserClickPdfGeneration,
    trackVisitStarted,
    trackToUseCases,
    trackInterestHousing,
    trackToBusiness,
    trackInterestTransport,
    trackUserConverted,
    trackExploreVisited,
    trackBusinessVisited,
    identifyUser,
    setUserProperties,
    resetAnalytics,
    isAnalyticsInitialized,
    getSessionId
} from '../services/analytics.js';

/**
 * Custom React hook for analytics
 * Provides easy access to all analytics functions
 */
export const useAnalytics = () => {
    // Wrap all functions in useCallback to prevent unnecessary re-renders
    const track = useCallback((eventKey, properties = {}) => {
        trackEvent(eventKey, properties);
    }, []);

    const trackPage = useCallback((pageName, properties = {}) => {
        trackPageView(pageName, properties);
    }, []);

    const trackButton = useCallback((buttonText, buttonLocation, properties = {}) => {
        trackButtonClick(buttonText, buttonLocation, properties);
    }, []);

    const trackForm = useCallback((formName, properties = {}) => {
        trackFormSubmit(formName, properties);
    }, []);

    const trackErrorEvent = useCallback((errorMessage, errorType = 'general', properties = {}) => {
        trackError(errorMessage, errorType, properties);
    }, []);

    const identify = useCallback((userId, properties = {}) => {
        identifyUser(userId, properties);
    }, []);

    const setUserProps = useCallback((properties) => {
        setUserProperties(properties);
    }, []);

    const reset = useCallback(() => {
        resetAnalytics();
    }, []);

    const isInitialized = useCallback(() => {
        return isAnalyticsInitialized();
    }, []);

    const getSession = useCallback(() => {
        return getSessionId();
    }, []);

    // Business-specific tracking functions
    const trackLocationSelection = useCallback((properties = {}) => {
        trackUserSelectedLocation(properties);
    }, []);

    const trackCategorySelection = useCallback((properties = {}) => {
        trackUserSelectedCategories(properties);
    }, []);

    const trackRadiusSelection = useCallback((properties = {}) => {
        trackUserSelectedRadius(properties);
    }, []);

    const trackSelectionConfirmation = useCallback((properties = {}) => {
        trackUserConfirmedSelection(properties);
    }, []);

    const trackSelectionReview = useCallback((properties = {}) => {
        trackUserReviewingSelection(properties);
    }, []);

    const trackStatsView = useCallback((properties = {}) => {
        trackUserSeeingStats(properties);
    }, []);

    const trackSelectionRefinement = useCallback((properties = {}) => {
        trackUserRefineSelection(properties);
    }, []);

    const trackMoreStatsView = useCallback((properties = {}) => {
        trackUserSeeingMoreStats(properties);
    }, []);

    const trackPdfGeneration = useCallback((properties = {}) => {
        trackUserClickPdfGeneration(properties);
    }, []);

    // Landing page tracking functions
    const trackVisit = useCallback((properties = {}) => {
        trackVisitStarted(properties);
    }, []);

    const trackUseCases = useCallback((properties = {}) => {
        trackToUseCases(properties);
    }, []);

    const trackHousingInterest = useCallback((properties = {}) => {
        trackInterestHousing(properties);
    }, []);

    const trackBusinessInterest = useCallback((properties = {}) => {
        trackToBusiness(properties);
    }, []);

    const trackTransportInterest = useCallback((properties = {}) => {
        trackInterestTransport(properties);
    }, []);

    const trackConversion = useCallback((properties = {}) => {
        trackUserConverted(properties);
    }, []);

    const trackExplore = useCallback((properties = {}) => {
        trackExploreVisited(properties);
    }, []);

    const trackBusiness = useCallback((properties = {}) => {
        trackBusinessVisited(properties);
    }, []);

    return {
        // Core tracking functions
        track,
        trackPage,
        trackButton,
        trackForm,
        trackError: trackErrorEvent,
        identify,
        setUserProperties: setUserProps,
        reset,
        isInitialized: isInitialized,
        getSessionId: getSession,

        // Business-specific functions
        trackLocationSelection,
        trackCategorySelection,
        trackRadiusSelection,
        trackSelectionConfirmation,
        trackSelectionReview,
        trackStatsView,
        trackSelectionRefinement,
        trackMoreStatsView,
        trackPdfGeneration,

        // Landing page functions
        trackVisit,
        trackUseCases,
        trackHousingInterest,
        trackBusinessInterest,
        trackTransportInterest,
        trackConversion,
        trackExplore,
        trackBusiness
    };
};

export default useAnalytics;
