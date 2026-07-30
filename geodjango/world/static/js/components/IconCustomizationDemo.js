// Icon Customization Demo Component
// This component demonstrates how to customize icons using the IconManager

const IconCustomizationDemo = () => {
    const [selectedCategory, setSelectedCategory] = React.useState('oportunidades');
    const [iconType, setIconType] = React.useState('svg');
    const [customContent, setCustomContent] = React.useState('');

    const categories = [
        { key: 'oportunidades', name: 'Oportunidades' },
        { key: 'agua', name: 'Agua' },
        { key: 'inseguridad', name: 'Inseguridad' },
        { key: 'fallas_geologicas', name: 'Fallas Geológicas' },
        { key: 'seguridad_vial', name: 'Seguridad Vial' },
        { key: 'comercio_informal', name: 'Comercio Informal' },
        { key: 'vivienda', name: 'Vivienda' },
        { key: 'movilidad', name: 'Movilidad' },
        { key: 'infraestructura_ciclista', name: 'Infraestructura Ciclista' }
    ];

    const emojiExamples = [
        '🏠', '🏢', '🏭', '🏪', '🏥', '🏫', '🏛️', '🏟️', '🏗️', '🏘️',
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
        '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🚨', '🚔', '🚍',
        '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄',
        '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬',
        '🛩️', '🛪', '🚁', '🛸', '🚀', '🛰️', '💺', '⚓', '🚤', '⛴️',
        '🛥️', '🚢', '🚧', '⛽', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰',
        '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏔️',
        '🗻', '🌋', '🗾', '🏕️', '⛺', '🏜️', '🏖️', '🏖️', '🏖️', '🏖️'
    ];

    const handleApplyCustomIcon = () => {
        if (!window.IconManager) {
            alert('IconManager not available');
            return;
        }

        let iconConfig;
        switch (iconType) {
            case 'svg':
                iconConfig = {
                    type: 'svg',
                    content: customContent
                };
                break;
            case 'emoji':
                iconConfig = {
                    type: 'emoji',
                    content: customContent
                };
                break;
            case 'image':
                iconConfig = {
                    type: 'image',
                    content: customContent
                };
                break;
            default:
                alert('Invalid icon type');
                return;
        }

        window.IconManager.setIcon(selectedCategory, iconConfig);
        alert(`Icon updated for ${selectedCategory}!`);
    };

    const handleResetIcon = () => {
        if (!window.IconManager) {
            alert('IconManager not available');
            return;
        }

        window.IconManager.resetIcon(selectedCategory);
        alert(`Icon reset for ${selectedCategory}!`);
    };

    const handleResetAllIcons = () => {
        if (!window.IconManager) {
            alert('IconManager not available');
            return;
        }

        window.IconManager.resetAllIcons();
        alert('All icons reset to defaults!');
    };

    const handleEmojiSelect = (emoji) => {
        setCustomContent(emoji);
        setIconType('emoji');
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2>Icon Customization Demo</h2>
            <p>This demo shows how to customize icons for different categories in the LayersListPanel.</p>
            
            <div style={{ marginBottom: '20px' }}>
                <h3>1. Select Category</h3>
                <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ padding: '8px', marginRight: '10px' }}
                >
                    {categories.map(cat => (
                        <option key={cat.key} value={cat.key}>{cat.name}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>2. Choose Icon Type</h3>
                <div style={{ marginBottom: '10px' }}>
                    <label>
                        <input 
                            type="radio" 
                            name="iconType" 
                            value="svg" 
                            checked={iconType === 'svg'}
                            onChange={(e) => setIconType(e.target.value)}
                        />
                        SVG
                    </label>
                    <label style={{ marginLeft: '15px' }}>
                        <input 
                            type="radio" 
                            name="iconType" 
                            value="emoji" 
                            checked={iconType === 'emoji'}
                            onChange={(e) => setIconType(e.target.value)}
                        />
                        Emoji
                    </label>
                    <label style={{ marginLeft: '15px' }}>
                        <input 
                            type="radio" 
                            name="iconType" 
                            value="image" 
                            checked={iconType === 'image'}
                            onChange={(e) => setIconType(e.target.value)}
                        />
                        Image URL
                    </label>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>3. Enter Custom Content</h3>
                {iconType === 'svg' && (
                    <div>
                        <p>Enter SVG content (example: &lt;svg width="35" height="35"&gt;&lt;circle cx="17.5" cy="17.5" r="15" fill="red"/&gt;&lt;/svg&gt;)</p>
                        <textarea 
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            style={{ width: '100%', height: '100px', padding: '8px' }}
                            placeholder="Enter SVG content here..."
                        />
                    </div>
                )}
                
                {iconType === 'emoji' && (
                    <div>
                        <p>Select an emoji or enter custom emoji:</p>
                        <input 
                            type="text" 
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            style={{ padding: '8px', marginBottom: '10px' }}
                            placeholder="Enter emoji here..."
                        />
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
                            {emojiExamples.map((emoji, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleEmojiSelect(emoji)}
                                    style={{ 
                                        fontSize: '20px', 
                                        margin: '2px', 
                                        padding: '5px',
                                        border: '1px solid #ddd',
                                        background: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {iconType === 'image' && (
                    <div>
                        <p>Enter image URL:</p>
                        <input 
                            type="text" 
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            style={{ width: '100%', padding: '8px' }}
                            placeholder="https://example.com/image.png"
                        />
                    </div>
                )}
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>4. Apply Changes</h3>
                <button 
                    onClick={handleApplyCustomIcon}
                    style={{ 
                        padding: '10px 20px', 
                        marginRight: '10px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Apply Custom Icon
                </button>
                <button 
                    onClick={handleResetIcon}
                    style={{ 
                        padding: '10px 20px', 
                        marginRight: '10px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Reset This Icon
                </button>
                <button 
                    onClick={handleResetAllIcons}
                    style={{ 
                        padding: '10px 20px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Reset All Icons
                </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>5. Usage Examples</h3>
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px' }}>
                    <h4>JavaScript API:</h4>
                    <pre style={{ background: '#e9ecef', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
{`// Set SVG icon
window.IconManager.setIcon('oportunidades', {
    type: 'svg',
    content: '<svg width="35" height="35"><circle cx="17.5" cy="17.5" r="15" fill="red"/></svg>'
});

// Set emoji icon
window.IconManager.setIcon('agua', {
    type: 'emoji',
    content: '💧'
});

// Set image icon
window.IconManager.setIcon('movilidad', {
    type: 'image',
    content: 'https://example.com/icon.png'
});

// Reset specific icon
window.IconManager.resetIcon('oportunidades');

// Reset all icons
window.IconManager.resetAllIcons();`}
                    </pre>
                </div>
            </div>

            <div>
                <h3>6. Current Custom Icons</h3>
                {window.IconManager && (
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px' }}>
                        <pre style={{ background: '#e9ecef', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
                            {JSON.stringify(window.IconManager.getCustomIcons(), null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

// Make the component available globally
window.IconCustomizationDemo = IconCustomizationDemo; 