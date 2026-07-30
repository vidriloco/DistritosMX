# Theme System for MapAdminApp

This directory contains the theme system for the MapAdminApp, allowing users to switch between different visual themes.

## Files

- `ThemeManager.js` - Main theme management class
- `README.md` - This documentation file

## How it works

The theme system uses CSS custom properties (CSS variables) to dynamically change the appearance of the application. Each theme defines:

- **Colors**: Primary, secondary, background, surface, text, border, status, hover, and active colors
- **Shadows**: Small, medium, and large shadow definitions
- **Border Radius**: Small, medium, large, and extra-large border radius values
- **Typography**: Font family, font sizes, and font weights

## Available Themes

### Default
- Clean, professional look with orange primary color
- Light background with dark text
- Standard shadows and rounded corners

### Dark
- Dark background with light text
- Same orange primary color for consistency
- Enhanced shadows for better contrast

### High Contrast
- Maximum contrast for accessibility
- Bold colors and clear distinctions
- Ideal for users with visual impairments

### Nature
- Green-based color scheme
- Soft, natural appearance
- Eco-friendly aesthetic

### Happy
- Inspired by [Remote OK](https://remoteok.com/) design
- Vibrant orange primary color (#FF6B35)
- Teal secondary color (#4ECDC4)
- Modern typography using Inter font (matching Remote OK)
- Larger font sizes for better readability (16px base)
- More rounded corners for a friendly, modern look (10px for external panel corners)
- Warm, energetic color palette

## Usage

### In JavaScript
```javascript
// Get the current theme
const currentTheme = window.ThemeManager.getCurrentTheme();

// Change to a different theme
window.ThemeManager.applyTheme('dark');

// Get available themes
const themes = window.ThemeManager.getAvailableThemes();
```

### In React Components
The MapAdminApp component includes theme state and a theme selector:

```javascript
const [currentTheme, setCurrentTheme] = useState('default');
const [availableThemes, setAvailableThemes] = useState([]);

// Theme change handler
const handleThemeChange = (themeName) => {
    if (window.ThemeManager) {
        window.ThemeManager.applyTheme(themeName);
    }
};
```

### In CSS
The theme-aware CSS file (`map-admin-theme.css`) uses CSS custom properties:

```css
.my-component {
    background: var(--color-background);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-light);
    border-radius: var(--border-radius-medium);
    box-shadow: var(--shadow-medium);
    font-family: var(--font-family);
    font-size: var(--font-size-base);
}
```

## Adding New Themes

To add a new theme:

1. Add the theme configuration to the `themes` object in `ThemeManager.js`:

```javascript
myNewTheme: {
    name: 'My New Theme',
    colors: {
        primary: '#your-color',
        secondary: '#your-color',
        background: '#your-color',
        // ... other color definitions
    },
    shadows: {
        small: 'your-shadow',
        medium: 'your-shadow',
        large: 'your-shadow'
    },
    borderRadius: {
        small: '4px',
        medium: '6px',
        large: '8px',
        xlarge: '12px'
    },
    typography: {
        fontFamily: "'Ruda', sans-serif",
        fontSize: {
            xs: '10px',
            // ... other sizes
        },
        fontWeight: {
            normal: '400',
            // ... other weights
        }
    }
}
```

2. The theme will automatically be available in the theme selector dropdown.

## Theme Persistence

The selected theme is automatically saved to localStorage and restored when the page is reloaded.

## Browser Support

The theme system requires modern browsers that support:
- CSS custom properties (CSS variables)
- ES6 classes
- localStorage

## Performance

Theme switching is instant and doesn't require page reloads. The system uses CSS custom properties for optimal performance. 