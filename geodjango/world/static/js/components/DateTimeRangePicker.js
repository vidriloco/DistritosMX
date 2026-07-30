function DateTimeRangePicker({ startDateTime, endDateTime, onChange, isOverlay = true, containerStyle }) {
    const handleStartChange = (e) => {
        const value = e.target.value;
        onChange({ startDateTime: value, endDateTime });
    };

    const handleEndChange = (e) => {
        const value = e.target.value;
        onChange({ startDateTime, endDateTime: value });
    };

    const baseStyle = {
        background: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        padding: 12,
        width: 320
    };
    const overlayStyle = isOverlay ? { position: 'absolute', top: 70, left: 12, zIndex: 1001 } : {};
    const mergedStyle = { ...baseStyle, ...overlayStyle, ...(containerStyle || {}) };

    return (
        <div style={mergedStyle}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Rango de fechas</div>
            <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: '#555' }}>Inicio</label>
                    <input type="datetime-local" value={startDateTime || ''} onChange={handleStartChange} style={{ padding: '6px 8px', fontSize: 12 }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: '#555' }}>Fin</label>
                    <input type="datetime-local" value={endDateTime || ''} onChange={handleEndChange} style={{ padding: '6px 8px', fontSize: 12 }} />
                </div>
            </div>
        </div>
    );
}

window.DateTimeRangePicker = DateTimeRangePicker;


