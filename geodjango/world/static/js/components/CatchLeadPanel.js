const CatchLeadPanel = ({ onClose, init = "pdf" }) => {
    const [email, setEmail] = React.useState('');
    const [name, setName] = React.useState('');
    const [comment, setComment] = React.useState('');
    const [isSubmitted, setIsSubmitted] = React.useState(init === "submitted");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [emailError, setEmailError] = React.useState('');
    const [currentState, setCurrentState] = React.useState(init);

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        
        // Clear error when user starts typing
        if (emailError) {
            setEmailError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate email
        if (!email.trim()) {
            setEmailError('El correo electrónico es requerido');
            return;
        }
        
        if (!validateEmail(email.trim())) {
            setEmailError('Por favor ingresa un correo electrónico válido');
            return;
        }

        setIsSubmitting(true);
        
        // Track form submission with analytics
        console.log('Tracking form submission with analytics');
        if (window.analyticsService) {
            window.analyticsService.track('USER_CONVERTED', {
                person_name: name.trim() || 'not_provided',
                email: email.trim(),
                comments: comment.trim() || 'not_provided',
                state: currentState,
                form_type: 'catch_lead',
                has_name: !!name.trim(),
                has_comments: !!comment.trim()
            });
        }
        
        // Simulate API call
        setTimeout(() => {
            setIsSubmitted(true);
            setIsSubmitting(false);
            setCurrentState("submitted");
        }, 1000);
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="catch-lead-panel">
            <div className="catch-lead-content">
                {/* Close icon - only shown when not submitted */}
                {!isSubmitted && (
                    <button 
                        className="catch-lead-close-icon"
                        onClick={handleClose}
                        type="button"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6 6 18"/>
                            <path d="m6 6 12 12"/>
                        </svg>
                    </button>
                )}
                
                {currentState === "pdf" && !isSubmitted && (
                    <React.Fragment>
                        <div className="catch-lead-image">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                        </div>
                        <h3 className="catch-lead-title">Generar Reporte en PDF</h3>
                        <p className="catch-lead-description">
                            Recibe un reporte detallado con los indicadores de esta zona en formato PDF. 
                            Incluye análisis de población, seguridad, vivienda y movilidad.
                        </p>
                        <form onSubmit={handleSubmit} className="catch-lead-form">
                            <input
                                type="text"
                                placeholder="Tu nombre (opcional)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="catch-lead-input"
                            />
                            <div className="catch-lead-input-group">
                                <input
                                    type="email"
                                    placeholder="Tu correo electrónico *"
                                    value={email}
                                    onChange={handleEmailChange}
                                    className={`catch-lead-input ${emailError ? 'catch-lead-input-error' : ''}`}
                                />
                                {emailError && (
                                    <div className="catch-lead-error-message">
                                        {emailError}
                                    </div>
                                )}
                            </div>
                            <button 
                                type="submit" 
                                className="catch-lead-submit-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Enviando...' : 'Generar Reporte'}
                            </button>
                        </form>
                    </React.Fragment>
                )}

                {currentState === "housing" && !isSubmitted && (
                    <React.Fragment>
                        <div className="catch-lead-image">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9,22 9,12 15,12 15,22"/>
                            </svg>
                        </div>
                        <h3 className="catch-lead-title">Información de Vivienda</h3>
                        <p className="catch-lead-description">
                            Obtén información detallada sobre vivienda en tu ciudad. 
                            Incluye precios, disponibilidad de servicios, análisis de la gentrificación y de seguridad.
                        </p>
                        <form onSubmit={handleSubmit} className="catch-lead-form">
                            <input
                                type="text"
                                placeholder="Tu nombre (opcional)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="catch-lead-input"
                            />
                            <div className="catch-lead-input-group">
                                <input
                                    type="email"
                                    placeholder="Tu correo electrónico *"
                                    value={email}
                                    onChange={handleEmailChange}
                                    className={`catch-lead-input ${emailError ? 'catch-lead-input-error' : ''}`}
                                />
                                {emailError && (
                                    <div className="catch-lead-error-message">
                                        {emailError}
                                    </div>
                                )}
                            </div>
                            <textarea
                                placeholder="Déjanos tu comentario o pregunta y con gusto te responderemos (opcional)"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="catch-lead-textarea"
                                rows="3"
                            />
                            <button 
                                type="submit" 
                                className="catch-lead-submit-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Enviando...' : 'Enviar'}
                            </button>
                        </form>
                    </React.Fragment>
                )}

                {currentState === "mobility" && !isSubmitted && (
                    <React.Fragment>
                        <div className="catch-lead-image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="2" y="8" width="20" height="12" rx="2" fill="#4a90e2" stroke="currentColor" strokeWidth="1"/>
                            <rect x="3" y="9" width="4" height="3" fill="#fff" stroke="currentColor" strokeWidth="0.5"/>
                            <rect x="8" y="9" width="4" height="3" fill="#fff" stroke="currentColor" strokeWidth="0.5"/>
                            <rect x="13" y="9" width="4" height="3" fill="#fff" stroke="currentColor" strokeWidth="0.5"/>
                            <rect x="18" y="9" width="3" height="3" fill="#fff" stroke="currentColor" strokeWidth="0.5"/>
                            <circle cx="6" cy="20" r="2" fill="#333" stroke="currentColor" strokeWidth="1"/>
                            <circle cx="18" cy="20" r="2" fill="#333" stroke="currentColor" strokeWidth="1"/>
                            <rect x="10" y="10" width="2" height="8" fill="#fff" stroke="currentColor" strokeWidth="0.5"/>
                            <line x1="0" y1="22" x2="24" y2="22" stroke="currentColor" strokeWidth="1"/>
                            <line x1="2" y1="23" x2="6" y2="23" stroke="currentColor" strokeWidth="0.5"/>
                            <line x1="8" y1="23" x2="12" y2="23" stroke="currentColor" strokeWidth="0.5"/>
                            <line x1="14" y1="23" x2="18" y2="23" stroke="currentColor" strokeWidth="0.5"/>
                            <line x1="20" y1="23" x2="22" y2="23" stroke="currentColor" strokeWidth="0.5"/>
                        </svg>
                        </div>
                        <h3 className="catch-lead-title">¿Cómo mejoramos el transporte?</h3>
                        <p className="catch-lead-description">
                            Mostramos información estadística y analizamos la conectividad del transporte público en tu ciudad.
                        </p>
                        <form onSubmit={handleSubmit} className="catch-lead-form">
                            <input
                                type="text"
                                placeholder="Tu nombre (opcional)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="catch-lead-input"
                            />
                            <div className="catch-lead-input-group">
                                <input
                                    type="email"
                                    placeholder="Tu correo electrónico *"
                                    value={email}
                                    onChange={handleEmailChange}
                                    className={`catch-lead-input ${emailError ? 'catch-lead-input-error' : ''}`}
                                />
                                {emailError && (
                                    <div className="catch-lead-error-message">
                                        {emailError}
                                    </div>
                                )}
                            </div>
                            <textarea
                                placeholder="¿Tienes alguna pregunta o comentario específico sobre movilidad en esta zona? (opcional)"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="catch-lead-textarea"
                                rows="3"
                            />
                            <button 
                                type="submit" 
                                className="catch-lead-submit-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Enviando...' : 'Obtener Información'}
                            </button>
                        </form>
                    </React.Fragment>
                )}

                {isSubmitted && (
                    <React.Fragment>
                        <div className="catch-lead-success">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22,4 12,14.01 9,11.01"/>
                            </svg>
                        </div>
                        <h3 className="catch-lead-title">¡Gracias por tu interés!</h3>
                        <p className="catch-lead-subtitle">En breve nos pondremos en contacto contigo.</p>
                        <button 
                            onClick={handleClose}
                            className="catch-lead-close-btn"
                        >
                            Cerrar
                        </button>
                    </React.Fragment>
                )}
            </div>
        </div>
    );
};
