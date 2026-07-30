const MobilePrimaryPanel = React.forwardRef((props, ref) => {
    return (
        <div className="floating-actions-container mobile-primary-panel">
            <div className="floating-actions-header">
                <h3 className="floating-actions-title">No disponible en móviles</h3>
            </div>
            <div className="floating-actions-content">
                <div className="floating-actions-section">
                    <p className="mobile-primary-text">
                        Lo sentimos, pero esta función no está disponible en dispositivos móviles. Te invitamos a probarla en un explorador de escritorio.
                    </p>
                </div>
            </div>
        </div>
    );
});

// Make the component available globally
window.MobilePrimaryPanel = MobilePrimaryPanel; 