// Customizable Icon Component
const CustomizableIcon = React.forwardRef(({ category, className = "", style = {} }, ref) => {
    const [iconConfig, setIconConfig] = React.useState(null);

    React.useEffect(() => {
        // Get initial icon configuration
        if (window.IconManager) {
            setIconConfig(window.IconManager.getIcon(category));
        }

        // Listen for icon changes
        const handleIconChange = (event) => {
            if (event.detail.category === category) {
                setIconConfig(event.detail.iconConfig);
            }
        };

        const handleIconsReset = () => {
            if (window.IconManager) {
                setIconConfig(window.IconManager.getIcon(category));
            }
        };

        window.addEventListener('iconChanged', handleIconChange);
        window.addEventListener('iconsReset', handleIconsReset);

        return () => {
            window.removeEventListener('iconChanged', handleIconChange);
            window.removeEventListener('iconsReset', handleIconsReset);
        };
    }, [category]);

    const renderIcon = () => {
        if (!iconConfig) {
            return null;
        }

        switch (iconConfig.type) {
            case 'svg':
                return (
                    <div 
                        className={className}
                        style={style}
                        dangerouslySetInnerHTML={{ __html: iconConfig.content }}
                    />
                );
            case 'emoji':
                return (
                    <div 
                        className={className}
                        style={{
                            ...style,
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {iconConfig.content}
                    </div>
                );
            case 'image':
                return (
                    <img 
                        src={iconConfig.content}
                        alt={category}
                        className={className}
                        style={style}
                    />
                );
            default:
                return null;
        }
    };

    return renderIcon();
});

// Make the component available globally
window.CustomizableIcon = CustomizableIcon; 