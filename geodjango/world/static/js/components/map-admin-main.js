// Main entry point for Map Admin application
// This file imports all components and renders the main app

// Import components (these will be loaded via script tags in the HTML)
// LinesNavigator, LineInfoPanel, LayersListPanel, and MapAdminApp are defined in separate files

// Initialize theme system
document.addEventListener('DOMContentLoaded', () => {
    // Ensure ThemeManager is available
    if (!window.ThemeManager) {
        console.warn('ThemeManager not found');
    }
});

// Render the main application with routing
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
); 