// Spacer component - Creates horizontal or vertical white spacing
function Spacer({ value = 16, axis = "vertical" }) {
    // Validate parameters
    const validatedValue = typeof value === 'number' && value >= 0 ? value : 16;
    const validatedAxis = axis === "horizontal" || axis === "vertical" ? axis : "vertical";
    
    // Create inline styles based on axis
    const spacerStyle = {
        display: 'block',
        pointerEvents: 'none',
        flexShrink: 0, // Prevent the spacer from shrinking in flex containers
        ...(validatedAxis === "vertical" 
            ? { 
                width: '100%', 
                height: `${validatedValue}px` 
              }
            : { 
                height: '100%', 
                width: `${validatedValue}px`,
                display: 'inline-block' // Better for horizontal spacing
              }
        )
    };
    
    return <div className="spacer" style={spacerStyle}></div>;
}

// Make the component available globally
window.Spacer = Spacer; 