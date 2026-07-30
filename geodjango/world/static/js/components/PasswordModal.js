// Password modal component for mundial-2025 project
function PasswordModal({ isVisible, onSuccess, onError }) {
    const [password, setPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');
    const inputRef = React.useRef(null);
    
    React.useEffect(() => {
        if (isVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isVisible]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/mundial-2025/validate-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: password }),
                credentials: 'include' // Include cookies for session
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                setErrorMessage(data.message || 'Incorrect password. Please try again.');
                if (onError) {
                    onError(data.message);
                }
            }
        } catch (error) {
            setErrorMessage('An error occurred. Please try again.');
            if (onError) {
                onError(error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isVisible) {
        return null;
    }
    
    return React.createElement('div', {
        className: 'password-modal-overlay',
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
        }
    },
        React.createElement('div', {
            className: 'password-modal',
            style: {
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }
        },
            React.createElement('h2', {
                style: {
                    marginTop: 0,
                    marginBottom: '20px',
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#1f2937',
                    textAlign: 'center'
                }
            }, 'Acceso Restringido'),
            React.createElement('p', {
                style: {
                    marginBottom: '24px',
                    fontSize: '14px',
                    color: '#6b7280',
                    textAlign: 'center'
                }
            }, 'Por favor, ingresa la contraseña para acceder a este proyecto.'),
            React.createElement('form', {
                onSubmit: handleSubmit
            },
                React.createElement('div', {
                    style: {
                        marginBottom: '20px'
                    }
                },
                    React.createElement('input', {
                        ref: inputRef,
                        type: 'password',
                        value: password,
                        onChange: (e) => {
                            setPassword(e.target.value);
                            setErrorMessage('');
                        },
                        placeholder: 'Contraseña',
                        disabled: isLoading,
                        style: {
                            width: '100%',
                            padding: '12px 16px',
                            fontSize: '16px',
                            border: errorMessage ? '2px solid #ef4444' : '2px solid #e5e7eb',
                            borderRadius: '8px',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                            boxSizing: 'border-box'
                        },
                        onFocus: (e) => {
                            e.target.style.borderColor = '#3b82f6';
                        },
                        onBlur: (e) => {
                            e.target.style.borderColor = errorMessage ? '#ef4444' : '#e5e7eb';
                        }
                    }),
                    errorMessage && React.createElement('div', {
                        style: {
                            marginTop: '8px',
                            fontSize: '14px',
                            color: '#ef4444'
                        }
                    }, errorMessage)
                ),
                React.createElement('button', {
                    type: 'submit',
                    disabled: isLoading || !password.trim(),
                    style: {
                        width: '100%',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: isLoading || !password.trim() ? '#9ca3af' : '#3b82f6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isLoading || !password.trim() ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                        boxSizing: 'border-box'
                    },
                    onMouseEnter: (e) => {
                        if (!isLoading && password.trim()) {
                            e.target.style.backgroundColor = '#2563eb';
                        }
                    },
                    onMouseLeave: (e) => {
                        if (!isLoading && password.trim()) {
                            e.target.style.backgroundColor = '#3b82f6';
                        }
                    }
                }, isLoading ? 'Verificando...' : 'Ingresar')
            )
        )
    );
}

// Make the component available globally
window.PasswordModal = PasswordModal;

