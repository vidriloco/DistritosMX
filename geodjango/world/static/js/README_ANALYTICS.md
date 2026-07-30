# Analytics Integration Documentation

This document describes the Mixpanel analytics integration for the Wikiando project.

## Overview

The analytics integration provides a centralized way to track user interactions and events throughout the application. It uses Mixpanel as the analytics provider and includes a service layer for easy event tracking.

## Files Structure

```
geodjango/world/static/js/
├── constants/
│   └── analytics.js          # Event names and properties constants
├── services/
│   └── analytics.js          # Analytics service implementation
├── config/
│   └── analytics-config.js   # Configuration settings
└── README_ANALYTICS.md       # This documentation
```

## Setup

### 1. Get Mixpanel Project Token

1. Go to [Mixpanel](https://mixpanel.com) and create an account
2. Create a new project
3. Copy your project token from the project settings

### 2. Configure Analytics

Update the `geodjango/world/static/js/config/analytics-config.js` file:

```javascript
window.ANALYTICS_CONFIG = {
    MIXPANEL: {
        PROJECT_TOKEN: 'YOUR_ACTUAL_MIXPANEL_TOKEN', // Replace with your token
        DEBUG: false, // Set to true for development
        // ... other settings
    }
};
```

### 3. Include Analytics in Templates

The analytics scripts are already included in the main templates. Make sure these scripts are loaded:

```html
<!-- Mixpanel Script -->
<script type="text/javascript">
    // Mixpanel initialization code
</script>

<!-- Analytics Configuration -->
<script src="{% static 'js/config/analytics-config.js' %}"></script>

<!-- Analytics Service -->
<script type="module">
    // Analytics service implementation
</script>
```

## Event Tracking

### Available Events

The following events are defined in the system:

| Event Key | Event Name | Description |
|-----------|------------|-------------|
| `VISIT_STARTED` | `visit-started` | User visits the landing page |
| `TO_USE_CASES` | `to-use-cases` | User clicks "Conocer más" |
| `INTEREST_HOUSING` | `interest-housing` | User clicks "Encuentra la mejor zona" |
| `TO_BUSINESS` | `to-business` | User clicks "Soluciones para tu negocio" |
| `INTEREST_TRANSPORT` | `interest-transport` | User clicks "Explorar transporte" |
| `USER_CONVERTED` | `user-converted` | User successfully submits CatchLeadPanel form |
| `EXPLORE_VISITED` | `explore-visited` | User visits the /explorar route |
| `BUSINESS_VISITED` | `business` | User visits the /negocios route |
| `USER_SELECTED_LOCATION` | `user-selected-location` | User selects location in BusinessWizard |
| `USER_SELECTED_CATEGORIES` | `user-selected-categories` | User selects categories in BusinessWizard |
| `USER_SELECTED_RADIUS` | `user-selected-radius` | User selects radius in BusinessWizard |
| `USER_CONFIRMED_SELECTION` | `user-confirmed-selection` | User confirms selection in BusinessWizard |
| `USER_REVIEWING_SELECTION` | `user-reviewing-selection` | User reviews selection from URL |
| `USER_SEEING_STATS` | `user-seeing-stats` | User views business statistics |
| `USER_REFINE_SELECTION` | `user-refine-selection` | User clicks "Cambiar" to refine selection |
| `USER_SEEING_MORE_STATS` | `user-seeing-more-stats` | User clicks "Ver más" for additional stats |
| `USER_CLICK_PDF_GENERATION` | `user-click-pdf-generation` | User clicks "Generar reporte en PDF" |
| `PAGE_VIEW` | `page-view` | Generic page view event |
| `BUTTON_CLICK` | `button-click` | Generic button click event |
| `FORM_SUBMIT` | `form-submit` | Form submission event |
| `ERROR_OCCURRED` | `error-occurred` | Error tracking event |
| `FEATURE_USED` | `feature-used` | Feature usage event |

### Tracking Events

#### Basic Event Tracking

```javascript
// Track a simple event
window.analyticsService.track('VISIT_STARTED', {
    page_type: 'landing',
    user_agent: navigator.userAgent
});
```

#### Button Click Tracking

```javascript
// Track a button click
window.analyticsService.trackButtonClick('Conocer más', 'landing_hero', {
    current_state: 'intro'
});
```

#### Page View Tracking

```javascript
// Track a page view
window.analyticsService.trackPageView('home_page', {
    user_type: 'anonymous'
});
```

### Event Properties

All events automatically include these properties:

- `page_url`: Current page URL
- `page_title`: Page title
- `referrer`: Referrer URL
- `session_id`: Unique session identifier
- `timestamp`: Event timestamp

You can add custom properties to any event:

```javascript
window.analyticsService.track('CUSTOM_EVENT', {
    custom_property: 'value',
    user_id: '12345',
    feature_name: 'map_interaction'
});
```

## Integration Examples

### StateShowcaser Component

The StateShowcaser component tracks button clicks automatically:

```javascript
// "Conocer más" button
window.analyticsService.track('TO_USE_CASES', {
    button_text: 'Conocer más',
    button_location: 'landing_hero',
    current_state: 'intro'
});

// "Encuentra la mejor zona" button
window.analyticsService.track('INTEREST_HOUSING', {
    button_text: 'Encuentra la mejor zona',
    button_location: 'state_showcase',
    current_state: 'case-study'
});
```

### CatchLeadPanel Component

The CatchLeadPanel component tracks form submissions:

```javascript
// Form submission tracking
window.analyticsService.track('USER_CONVERTED', {
    person_name: 'John Doe',
    email: 'john@example.com',
    comments: 'Interested in housing data',
    state: 'housing',
    form_type: 'catch_lead',
    has_name: true,
    has_comments: true
});
```

### Route Navigation Tracking

The SimpleRouter component tracks route visits:

```javascript
// Explore page visit
window.analyticsService.track('EXPLORE_VISITED', {
    page_path: '/explorar',
    navigation_type: 'programmatic',
    previous_path: '/'
});

// Business page visit
window.analyticsService.track('BUSINESS_VISITED', {
    page_path: '/negocios',
    navigation_type: 'initial_load'
});
```

### BusinessWizard Component

The BusinessWizard component tracks user interactions throughout the wizard flow:

```javascript
// Location selection
window.analyticsService.track('USER_SELECTED_LOCATION', {
    currentState: 'location-selection',
    location: 'Av. Insurgentes Sur 123, CDMX',
    coordinates: { lat: 19.4326, lng: -99.1332 },
    selectedCategories: [],
    selectedRadius: null,
    selectedLocation: { lat: '19.4326', lon: '-99.1332', display_name: 'Av. Insurgentes Sur 123, CDMX' }
});

// Category selection
window.analyticsService.track('USER_SELECTED_CATEGORIES', {
    currentState: 'category-selection',
    location: 'Av. Insurgentes Sur 123, CDMX',
    coordinates: { lat: 19.4326, lng: -99.1332 },
    selectedCategories: [
        { codigo_act: '722511', nombre_act: 'Restaurantes con servicio de preparación de alimentos a la carta' }
    ],
    selectedRadius: null,
    selectedLocation: { lat: '19.4326', lon: '-99.1332', display_name: 'Av. Insurgentes Sur 123, CDMX' }
});

// Radius selection
window.analyticsService.track('USER_SELECTED_RADIUS', {
    currentState: 'radius-selection',
    location: 'Av. Insurgentes Sur 123, CDMX',
    coordinates: { lat: 19.4326, lng: -99.1332 },
    selectedCategories: [
        { codigo_act: '722511', nombre_act: 'Restaurantes con servicio de preparación de alimentos a la carta' }
    ],
    selectedRadius: 350,
    selectedLocation: { lat: '19.4326', lon: '-99.1332', display_name: 'Av. Insurgentes Sur 123, CDMX' }
});

// Confirmation
window.analyticsService.track('USER_CONFIRMED_SELECTION', {
    currentState: 'review-of-selection',
    location: 'Av. Insurgentes Sur 123, CDMX',
    coordinates: { lat: 19.4326, lng: -99.1332 },
    selectedCategories: [
        { codigo_act: '722511', nombre_act: 'Restaurantes con servicio de preparación de alimentos a la carta' }
    ],
    selectedRadius: 350,
    selectedLocation: { lat: '19.4326', lon: '-99.1332', display_name: 'Av. Insurgentes Sur 123, CDMX' }
});

// Review from URL
window.analyticsService.track('USER_REVIEWING_SELECTION', {
    currentState: 'review-of-selection',
    location: 'Av. Insurgentes Sur 123, CDMX',
    coordinates: { lat: 19.4326, lng: -99.1332 },
    selectedCategories: [
        { codigo_act: '722511', nombre_act: 'Restaurantes con servicio de preparación de alimentos a la carta' }
    ],
    selectedRadius: 350,
    selectedLocation: { lat: '19.4326', lon: '-99.1332', display_name: 'Av. Insurgentes Sur 123, CDMX' },
    url_path: '/negocios/review'
});
```

### BusinessStatsPane Component

The BusinessStatsPane component tracks user interactions with business statistics:

```javascript
// User viewing stats
window.analyticsService.track('USER_SEEING_STATS', {
    coordinates: { lat: 19.4326, lng: -99.1332 },
    radius: 350,
    categories: ['722511', '722512'],
    url_path: '/negocios/stats'
});

// User refining selection
window.analyticsService.track('USER_REFINE_SELECTION', {
    coordinates: { lat: 19.4326, lng: -99.1332 },
    radius: 350,
    categories: ['722511', '722512'],
    action: 'return_to_wizard'
});

// User seeing more stats
window.analyticsService.track('USER_SEEING_MORE_STATS', {
    coordinates: { lat: 19.4326, lng: -99.1332 },
    radius: 350,
    categories: ['722511', '722512'],
    action: 'open'
});

// User clicking PDF generation
window.analyticsService.track('USER_CLICK_PDF_GENERATION', {
    coordinates: { lat: 19.4326, lng: -99.1332 },
    radius: 350,
    action: 'open_catch_lead_panel',
    component: 'business_indicator_pane'
});
```

### Adding Tracking to New Components

1. Import the analytics service:
```javascript
// If using modules
import analyticsService from '../services/analytics.js';

// If using global scope
const analyticsService = window.analyticsService;
```

2. Track events in your component:
```javascript
function MyComponent() {
    const handleButtonClick = () => {
        // Track the event
        if (window.analyticsService) {
            window.analyticsService.track('BUTTON_CLICK', {
                button_text: 'My Button',
                button_location: 'my_component',
                action: 'custom_action'
            });
        }
        
        // Your component logic
        console.log('Button clicked!');
    };
    
    return (
        <button onClick={handleButtonClick}>
            My Button
        </button>
    );
}
```

## Configuration Options

### Environment Settings

```javascript
window.ANALYTICS_CONFIG = {
    MIXPANEL: {
        DEBUG: false,              // Enable debug mode
        TRACK_PAGEVIEW: false,     // Auto-track page views
        PERSISTENCE: 'localStorage' // Storage method
    },
    FEATURES: {
        ENABLE_ANALYTICS: true,    // Enable/disable analytics
        ENABLE_DEBUG_LOGGING: false, // Enable debug logging
        ENABLE_ERROR_TRACKING: true // Track errors
    }
};
```

### Development vs Production

For development:
```javascript
DEBUG: true,
ENABLE_DEBUG_LOGGING: true
```

For production:
```javascript
DEBUG: false,
ENABLE_DEBUG_LOGGING: false
```

## Testing

### Enable Debug Mode

Set `DEBUG: true` in the configuration to see detailed logs in the browser console.

### Verify Events

1. Open browser developer tools
2. Go to the Network tab
3. Filter by "mixpanel"
4. Interact with the page
5. Verify events are being sent

### Common Issues

1. **Events not tracking**: Check if analytics is enabled and Mixpanel token is correct
2. **Console errors**: Verify Mixpanel script is loaded before analytics service
3. **Missing properties**: Check if the analytics service is properly initialized

## Privacy and Compliance

- The analytics service respects user privacy settings
- No personally identifiable information is tracked by default
- Users can opt out of tracking through browser settings
- Session data is stored locally and can be cleared

## Support

For issues with the analytics integration:

1. Check the browser console for error messages
2. Verify Mixpanel configuration
3. Ensure all required scripts are loaded
4. Test with debug mode enabled

## Future Enhancements

- Add support for additional analytics providers
- Implement A/B testing integration
- Add funnel analysis capabilities
- Include user journey tracking
- Add performance monitoring
