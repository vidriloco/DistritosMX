# Analytics Service - Functional Approach

This directory contains the analytics service implementation using a functional approach that can be easily called from React components or anywhere in the application.

## Overview

The analytics service has been refactored from a class-based approach to a functional approach, making it easier to use in React components and other parts of the application. The service provides a simple API for tracking events with Mixpanel.

## Files Structure

```
js/
├── constants/
│   └── analytics.js          # Event names and properties constants
├── services/
│   └── analytics.js          # Main analytics service (functional approach)
├── hooks/
│   └── useAnalytics.js       # React hook for easy analytics access
├── components/
│   └── AnalyticsExample.jsx  # Example React component
└── README.md                 # This documentation
```

## Quick Start

### 1. Initialize Analytics

```javascript
import { initAnalytics } from './js/services/analytics.js';

// Initialize with your Mixpanel token
initAnalytics('your-mixpanel-token', {
    debug: false,
    track_pageview: false,
    persistence: 'localStorage'
});
```

### 2. Track Events

```javascript
import { trackEvent, trackButtonClick, trackPageView } from './js/services/analytics.js';

// Track a custom event
trackEvent('USER_ACTION', {
    action_type: 'button_click',
    user_id: '12345'
});

// Track a button click
trackButtonClick('Submit Button', 'Contact Form', {
    form_type: 'contact'
});

// Track a page view
trackPageView('Home Page', {
    page_type: 'landing'
});
```

## Using in React Components

### Option 1: Direct Import (Simple)

```jsx
import React from 'react';
import { trackEvent, trackButtonClick } from '../services/analytics.js';

const MyComponent = () => {
    const handleClick = () => {
        trackButtonClick('My Button', 'MyComponent', {
            button_type: 'primary'
        });
    };

    return <button onClick={handleClick}>Click Me</button>;
};
```

### Option 2: Using the Hook (Recommended)

```jsx
import React, { useEffect } from 'react';
import useAnalytics from '../hooks/useAnalytics.js';

const MyComponent = () => {
    const analytics = useAnalytics();

    useEffect(() => {
        // Track page view when component mounts
        analytics.trackPage('My Component Page', {
            component: 'MyComponent'
        });
    }, [analytics]);

    const handleClick = () => {
        analytics.trackButton('My Button', 'MyComponent', {
            button_type: 'primary'
        });
    };

    const handleLocationSelect = (location) => {
        analytics.trackLocationSelection({
            location_name: location,
            selection_method: 'dropdown'
        });
    };

    return (
        <div>
            <button onClick={handleClick}>Click Me</button>
            <button onClick={() => handleLocationSelect('Mexico City')}>
                Select Location
            </button>
        </div>
    );
};
```

## Available Functions

### Core Tracking Functions

- `trackEvent(eventKey, properties)` - Track any custom event
- `trackPageView(pageName, properties)` - Track page views
- `trackButtonClick(buttonText, buttonLocation, properties)` - Track button clicks
- `trackFormSubmit(formName, properties)` - Track form submissions
- `trackError(errorMessage, errorType, properties)` - Track errors

### Business-Specific Functions

- `trackUserSelectedLocation(properties)` - Track location selection
- `trackUserSelectedCategories(properties)` - Track category selection
- `trackUserSelectedRadius(properties)` - Track radius selection
- `trackUserConfirmedSelection(properties)` - Track selection confirmation
- `trackUserReviewingSelection(properties)` - Track selection review
- `trackUserSeeingStats(properties)` - Track stats viewing
- `trackUserRefineSelection(properties)` - Track selection refinement
- `trackUserSeeingMoreStats(properties)` - Track more stats viewing
- `trackUserClickPdfGeneration(properties)` - Track PDF generation

### Landing Page Functions

- `trackVisitStarted(properties)` - Track visit start
- `trackToUseCases(properties)` - Track use cases navigation
- `trackInterestHousing(properties)` - Track housing interest
- `trackToBusiness(properties)` - Track business navigation
- `trackInterestTransport(properties)` - Track transport interest
- `trackUserConverted(properties)` - Track user conversion
- `trackExploreVisited(properties)` - Track explore page visit
- `trackBusinessVisited(properties)` - Track business page visit

### User Management Functions

- `identifyUser(userId, properties)` - Identify a user
- `setUserProperties(properties)` - Set user properties
- `resetAnalytics()` - Reset analytics session

### Utility Functions

- `isAnalyticsInitialized()` - Check if analytics is initialized
- `getSessionId()` - Get current session ID

## Event Constants

All event names are defined in `constants/analytics.js`:

```javascript
export const ANALYTICS_EVENTS = {
    VISIT_STARTED: 'visit-started',
    TO_USE_CASES: 'to-use-cases',
    INTEREST_HOUSING: 'interest-housing',
    // ... more events
};
```

## Properties Constants

Common properties are defined in `constants/analytics.js`:

```javascript
export const ANALYTICS_PROPERTIES = {
    PAGE_URL: 'page_url',
    PAGE_TITLE: 'page_title',
    BUTTON_TEXT: 'button_text',
    // ... more properties
};
```

## Global Access

All functions are also available globally through the `window` object:

```javascript
// These are automatically available after importing the service
window.trackEvent('USER_ACTION', { action: 'click' });
window.trackButtonClick('Button', 'Location', { type: 'primary' });
window.trackPageView('Page Name', { section: 'main' });
```

## Error Handling

The service includes built-in error handling:

```javascript
// If analytics is not initialized, events will be logged but not tracked
trackEvent('USER_ACTION', { action: 'click' });
// Console: "Analytics not initialized. Event not tracked: USER_ACTION"

// If Mixpanel is not available, initialization will fail gracefully
initAnalytics('token');
// Console: "Mixpanel is not loaded. Make sure to include the Mixpanel script."
```

## Performance Considerations

- The `useAnalytics` hook wraps all functions in `useCallback` to prevent unnecessary re-renders
- Functions are memoized for better performance in React components
- The service uses a singleton pattern internally to maintain state

## Migration from Class-Based Approach

If you were using the old class-based approach:

**Old:**
```javascript
window.analyticsService.track('EVENT_NAME', properties);
window.analyticsService.init(token, options);
```

**New:**
```javascript
trackEvent('EVENT_NAME', properties);
initAnalytics(token, options);
```

## Example Usage in Templates

For non-React usage (like in Django templates):

```html
<script>
    // Initialize analytics
    window.initAnalytics('your-token', { debug: false });
    
    // Track events
    document.getElementById('my-button').addEventListener('click', function() {
        window.trackButtonClick('My Button', 'Template', {
            button_type: 'primary'
        });
    });
</script>
```

## Testing

The service includes console logging for debugging:

```javascript
// Enable debug mode during initialization
initAnalytics('token', { debug: true });

// Events will be logged to console
trackEvent('TEST_EVENT', { test: true });
// Console: "Event tracked: test-event { test: true, timestamp: '...', ... }"
```
