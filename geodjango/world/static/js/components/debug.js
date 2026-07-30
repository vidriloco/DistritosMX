// Debug component to test React loading
function DebugComponent() {
    console.log('DebugComponent: React version:', React.version);
    console.log('DebugComponent: ReactDOM version:', ReactDOM.version);
    console.log('DebugComponent: MapAdminApp available:', typeof MapAdminApp);
    console.log('DebugComponent: useTerritoryData available:', typeof useTerritoryData);
    console.log('DebugComponent: ErrorBoundary available:', typeof ErrorBoundary);
    
    return (
        <div style={{ padding: '20px', backgroundColor: '#f0f0f0', margin: '20px' }}>
            <h3>Debug Information</h3>
            <p>React version: {React.version}</p>
            <p>ReactDOM version: {ReactDOM.version}</p>
            <p>MapAdminApp available: {typeof MapAdminApp}</p>
            <p>useTerritoryData available: {typeof useTerritoryData}</p>
            <p>ErrorBoundary available: {typeof ErrorBoundary}</p>
        </div>
    );
}

// Make the component available globally
window.DebugComponent = DebugComponent; 