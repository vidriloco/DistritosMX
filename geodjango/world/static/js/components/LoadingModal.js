function LoadingModal({ isVisible, message = "Cargando datos...", progress = 0 }) {
    
    if (!isVisible) {
        return null;
    }
    
    const modalElement = React.createElement('div', { 
        className: 'loading-modal-overlay',
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
        }
    },
        React.createElement('div', { 
            className: 'loading-modal',
            style: {
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                maxWidth: '400px',
                width: '90%'
            }
        },
            React.createElement('div', { 
                className: 'loading-modal-content',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px'
                }
            },
                React.createElement('div', { 
                    className: 'loading-text-large',
                    style: {
                        fontSize: '18px',
                        fontWeight: '500',
                        color: '#374151'
                    }
                }, message),
                // Progress bar container
                React.createElement('div', {
                    style: {
                        width: '100%',
                        maxWidth: '300px'
                    }
                },
                    // Progress percentage text
                    React.createElement('div', {
                        style: {
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#e35f00',
                            marginBottom: '8px'
                        }
                    }, `${progress}%`),
                    // Progress bar background
                    React.createElement('div', {
                        style: {
                            width: '100%',
                            height: '8px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }
                    },
                        // Progress bar fill
                        React.createElement('div', {
                            style: {
                                width: `${progress}%`,
                                height: '100%',
                                backgroundColor: '#e35f00',
                                borderRadius: '4px',
                                transition: 'width 0.3s ease-in-out'
                            }
                        })
                    )
                )
            )
        )
    );

    return modalElement;
}

// Make the component available globally
window.LoadingModal = LoadingModal; 