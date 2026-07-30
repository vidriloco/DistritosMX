# ReactJS + Django Integration Setup Guide

This document describes how ReactJS is configured and integrated with Django in this project. This setup uses a **no-build-step approach** where React components are written in JSX and transpiled in the browser using Babel Standalone.

## Architecture Overview

- **No build process**: No webpack, npm build scripts, or bundlers required
- **CDN-based libraries**: React, ReactDOM, and Babel are loaded from CDN
- **In-browser transpilation**: JSX is transpiled to JavaScript at runtime using Babel Standalone
- **Django static files**: React components are stored in Django's static files directory
- **Template integration**: Components are loaded via script tags in Django templates

## Setup Steps

### 1. Load React Libraries via CDN

In your Django template (e.g., `map-admin/index.html`), include React and Babel from CDN in the `<head>` section:

```html
<!-- React 18 from CDN -->
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

<!-- Babel Standalone for in-browser JSX transpilation -->
<script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
```

**Note**: For production, you may want to use production builds:
```html
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
```

### 2. Create React Components Directory Structure

Organize your React components in Django's static files directory:

```
geodjango/
  world/
    static/
      js/
        components/
          App.js
          Component1.js
          Component2.js
          ...
          map-admin-main.js  # Main entry point
```

### 3. Write React Components

Write React components as plain JavaScript files using JSX syntax. Components use the global `React` object (no imports needed):

**Example component** (`components/TouristViewerPanel.js`):
```javascript
/**
 * Tourist Viewer Panel Component
 * Displays day selector and time period statistics
 */
function TouristViewerPanel({ selectedPolygon, selectedDay, onDayChange, selectedTimePeriod, onTimePeriodChange }) {
    const [day, setDay] = React.useState(selectedDay || '01');
    const [timePeriod, setTimePeriod] = React.useState(selectedTimePeriod || 'm');
    
    // Component logic here...
    
    return (
        <div className="tourist-viewer-panel">
            {/* JSX content */}
        </div>
    );
}

// Make component available globally (optional, for debugging)
window.TouristViewerPanel = TouristViewerPanel;
```

**Key points**:
- Use `React.useState`, `React.useEffect`, etc. (not destructured imports)
- Components are functions that return JSX
- No `import`/`export` statements needed
- Components can be made globally available via `window` for debugging

### 4. Create Main Entry Point

Create a main entry file that initializes your React app:

**Example** (`components/map-admin-main.js`):
```javascript
// Main entry point for application
// This file imports all components and renders the main app

// Render the main application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
```

### 5. Load Components in Django Template

In your Django template, load all React components using `<script type="text/babel">` tags. The order matters - load dependencies before components that use them:

```html
{% load static %}

<!-- Load React components in dependency order -->
<script type="text/babel" src="{% static 'js/components/UrlUtils.js' %}"></script>
<script type="text/babel" src="{% static 'js/components/ColorUtils.js' %}"></script>
<script type="text/babel" src="{% static 'js/components/LoadingModal.js' %}"></script>
<!-- ... more components ... -->
<script type="text/babel" src="{% static 'js/components/App.js' %}"></script>

<!-- Main entry point (loads last) -->
<script type="text/babel" src="{% static 'js/components/map-admin-main.js' %}"></script>
```

**Important**: 
- Use `type="text/babel"` so Babel Standalone can transpile the JSX
- Load components in dependency order (utilities first, then components that use them)
- Load the main entry point last

### 6. Create Root Element in Template

In your Django template, create a root element where React will mount:

```html
<body>
    <div id="root">
        <!-- React app will render here -->
    </div>
    
    <!-- Load React libraries -->
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
    
    <!-- Load React components -->
    <!-- ... component scripts ... -->
</body>
```

### 7. Django Static Files Configuration

Ensure Django static files are properly configured in `settings.py`:

```python
# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# In development, Django will serve static files automatically
# In production, use: python manage.py collectstatic
```

Make sure `django.contrib.staticfiles` is in `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ...
    'django.contrib.staticfiles',
    # ...
]
```

## Component Communication with Django

### Passing Data from Django to React

You can pass data from Django views to React components using:

1. **Global JavaScript variables** (set in template):
```html
<script type="text/javascript">
    window.djangoData = {
        userId: {{ user.id|default:"null" }},
        apiUrl: "{% url 'api:endpoint' %}",
        csrfToken: "{{ csrf_token }}"
    };
</script>
```

2. **Data attributes** on DOM elements:
```html
<div id="root" 
     data-user-id="{{ user.id }}"
     data-api-url="{% url 'api:endpoint' %}">
</div>
```

3. **Django template context** rendered as JSON:
```html
<script type="text/javascript">
    window.initialData = {{ context_data|safe }};
</script>
```

### Making API Calls to Django

React components can make API calls to Django endpoints:

```javascript
function MyComponent() {
    const [data, setData] = React.useState(null);
    
    React.useEffect(() => {
        fetch('/api/endpoint/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => setData(data));
    }, []);
    
    return <div>{/* render data */}</div>;
}
```

## File Structure Example

```
project/
  geodjango/
    geodjango/
      settings.py
      urls.py
    world/
      static/
        js/
          components/
            App.js
            Component1.js
            Component2.js
            map-admin-main.js
          utils/
            helpers.js
      templates/
        map-admin/
          index.html  # Main template with React setup
```

## Advantages of This Approach

1. **No build step**: No need for webpack, npm, or build scripts
2. **Simple setup**: Just add script tags to templates
3. **Easy debugging**: Components are separate files, easy to inspect
4. **Django integration**: Works seamlessly with Django's static files system
5. **Fast development**: Changes are immediately visible (no rebuild needed)

## Limitations

1. **Performance**: In-browser transpilation is slower than pre-compiled code
2. **Bundle size**: All components load separately (no code splitting)
3. **No tree-shaking**: Can't eliminate unused code
4. **Development only**: Babel Standalone is not recommended for production

## Production Considerations

For production, consider:

1. **Pre-compile JSX**: Use a build tool (webpack, rollup) to compile JSX to JavaScript
2. **Bundle components**: Combine components into a single file
3. **Minify code**: Use minification tools
4. **Use production React builds**: Switch to production React builds from CDN

## Example: Complete Template Setup

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Django + React App</title>
    {% load static %}
</head>
<body>
    <div id="root"></div>
    
    <!-- React libraries -->
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
    
    <!-- Pass Django data to React -->
    <script type="text/javascript">
        window.djangoData = {
            csrfToken: "{{ csrf_token }}",
            apiUrl: "{% url 'api:endpoint' %}"
        };
    </script>
    
    <!-- React components (load in dependency order) -->
    <script type="text/babel" src="{% static 'js/components/Component1.js' %}"></script>
    <script type="text/babel" src="{% static 'js/components/Component2.js' %}"></script>
    <script type="text/babel" src="{% static 'js/components/App.js' %}"></script>
    <script type="text/babel" src="{% static 'js/components/main.js' %}"></script>
</body>
</html>
```

## Summary

This setup provides a simple way to use React with Django without requiring a build process:

1. Load React and Babel from CDN
2. Write React components as JSX files in Django static directory
3. Load components with `<script type="text/babel">` tags in templates
4. Initialize React app with `ReactDOM.createRoot()`
5. Use Django's static files system for serving components

This approach is ideal for:
- Small to medium applications
- Rapid prototyping
- Projects where build complexity should be minimized
- Teams familiar with Django but new to modern JavaScript tooling

