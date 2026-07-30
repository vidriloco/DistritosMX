// Simple JSON Viewer component
function JSONViewer({ data, title = 'JSON Viewer' }) {
    const [pretty, setPretty] = React.useState('');

    React.useEffect(() => {
        try {
            const text = typeof data === 'string' ? data : JSON.stringify(data || {}, null, 2);
            setPretty(text);
        } catch (e) {
            setPretty('');
        }
    }, [data]);

    return (
        <div className="json-viewer" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
                <strong>{title}</strong>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
                <pre style={{ margin: 0, padding: '12px 16px', fontSize: 12, lineHeight: '18px' }}>{pretty}</pre>
            </div>
        </div>
    );
}

// Expose globally
window.JSONViewer = JSONViewer;



