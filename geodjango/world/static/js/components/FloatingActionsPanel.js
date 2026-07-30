function FloatingActionsPanel({ 
    isVisible, 
    onClose, 
    geocodedAddress, 
    isGeocoding, 
    onActionClick 
}) {
    if (!isVisible) return null;

    return (
        <div className="floating-actions-container">
            <div className="floating-actions-header">
                <button className="close-floating-actions-button" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <h3 className="floating-actions-title">Elementos de análisis en este punto</h3>
            </div>
            <div className="floating-actions-content">
                {isGeocoding ? (
                    <div className="geocoding-loading">
                        <div className="loading-spinner">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
                                    <animate attributeName="strokeDasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                    <animate attributeName="strokeDashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                </circle>
                            </svg>
                        </div>
                        <span>Obteniendo dirección...</span>
                    </div>
                ) : geocodedAddress ? (
                    <div className="geocoded-address">
                        <div className="address-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </div>
                        <span className="address-text">{geocodedAddress}</span>
                    </div>
                ) : null}
                <div className="divider"></div>
                <p className="floating-actions-description">Selecciona alguno de los siguientes elementos espaciales para analizar el territorio: </p>
                <div className="floating-actions-buttons">
                    <button 
                        className="floating-action-button disabled" 
                        disabled
                        title="Próximamente"
                    >
                        <div className="floating-action-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor" class="bi bi-radar" viewBox="0 0 16 16"><path d="M6.634 1.135A7 7 0 0 1 15 8a.5.5 0 0 1-1 0 6 6 0 1 0-6.5 5.98v-1.005A5 5 0 1 1 13 8a.5.5 0 0 1-1 0 4 4 0 1 0-4.5 3.969v-1.011A2.999 2.999 0 1 1 11 8a.5.5 0 0 1-1 0 2 2 0 1 0-2.5 1.936v-1.07a1 1 0 1 1 1 0V15.5a.5.5 0 0 1-1 0v-.518a7 7 0 0 1-.866-13.847"></path></svg>
                        </div>
                        <span>Hexbin</span>
                    </button>
                    <button 
                        className="floating-action-button" 
                        onClick={() => onActionClick('agebs')}
                    >
                        <div className="floating-action-icon">
                            <svg width="35" height="35" viewBox="0 0 59 73.75" version="1.1" x="0px" y="0px">
                                <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                                    <g fill="#000000">
                                        <path d="M42.937,17.011 C42.735,21.734 41.723,26.347 39.892,29.953 C38.392,32.906 37.482,36.58 37.147,40.413 C44.036,41.667 52.039,40.906 57.547,38.108 L59,37.26 L59,20.723 L57.504,19.868 C53.518,17.845 48.195,16.899 42.937,17.011"/>
                                        <path d="M40.961,17.105 C36.933,17.4 33.047,18.321 29.953,19.892 C26.546,21.622 22.237,22.615 17.788,22.891 C18.27,25.128 18.967,27.226 19.892,29.047 C20.88,30.993 21.624,33.236 22.138,35.627 C24.993,36.133 27.677,36.952 29.953,38.108 C31.524,38.906 33.304,39.529 35.197,39.997 C35.569,35.984 36.536,32.144 38.108,29.047 C39.801,25.714 40.751,21.466 40.961,17.105"/>
                                        <path d="M22.524,37.706 C23.614,44.812 22.739,52.847 19.892,58.453 L19.593,59 L38.473,59 L38.108,58.453 C35.825,53.956 34.813,47.895 35.063,42.005 C32.885,41.498 30.838,40.801 29.047,39.892 C27.126,38.916 24.9,38.189 22.524,37.706"/>
                                        <path d="M39.895,0.553 C41.924,4.55 42.948,9.786 42.975,15.039 C48.555,14.935 54.203,15.95 58.453,18.108 L59,18.421 L59,0 L39.618,0 L39.895,0.553"/>
                                        <path d="M18.122,57.522 C20.881,52.087 21.651,44.197 20.451,37.358 C13.901,36.443 6.591,37.283 1.453,39.892 L0,40.786 L0,59 L17.316,59 L18.122,57.522"/>
                                        <path d="M58.504,39.864 C52.681,42.822 44.3,43.658 37.027,42.403 C36.838,47.816 37.778,53.354 39.865,57.495 L40.869,59 L59,59 L59,39.575 L58.504,39.864"/>
                                        <path d="M20.025,35.315 C19.554,33.378 18.922,31.556 18.108,29.953 C17.064,27.897 16.287,25.512 15.773,22.967 C10.275,23.037 4.734,22.018 0.547,19.892 L0,19.544 L0,38.441 L0.476,38.148 C5.799,35.443 13.24,34.51 20.025,35.315"/>
                                        <path d="M1.537,18.156 C5.343,20.086 10.39,21.035 15.434,21.007 C14.411,13.972 15.3,6.078 18.108,0.547 L18.398,0 L0,0 L0,17.178 L1.537,18.156"/>
                                        <path d="M41.003,15.124 C40.987,10.169 40.024,5.225 38.108,1.453 L37.382,0 L20.661,0 L19.884,1.468 C17.215,6.723 16.397,14.27 17.425,20.942 C21.669,20.699 25.795,19.76 29.047,18.108 C32.401,16.405 36.628,15.417 41.003,15.124"/>
                                    </g>
                                </g>
                            </svg>
                        </div>
                        <span>Agebs</span>
                    </button>
                    <button 
                        className="floating-action-button disabled" 
                        disabled
                        title="Próximamente"
                    >
                        <div className="floating-action-icon">
                            <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 21h18"></path>
                                <path d="M5 21V7l8-4v18"></path>
                                <path d="M19 21V11l-6-4"></path>
                                <path d="M9 9h1"></path>
                                <path d="M9 13h1"></path>
                                <path d="M9 17h1"></path>
                                <path d="M14 13h1"></path>
                                <path d="M14 17h1"></path>
                            </svg>
                        </div>
                        <span>Colonia</span>
                    </button>
                    <button 
                        className="floating-action-button disabled" 
                        disabled
                        title="Próximamente"
                    >
                        <div className="floating-action-icon">
                            <svg width="35" height="35" viewBox="0 0 24 30" version="1.1" x="0px" y="0px"><g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"><g transform="translate(-147.000000, -685.000000)" stroke="#000000" strokeWidth="2"><g transform="translate(148.000000, 686.000000)"><path d="M4,20 C4,21.105 3.105,22 2,22 C0.895,22 0,21.105 0,20 C0,18.895 0.895,18 2,18 C3.105,18 4,18.895 4,20 Z"/><path d="M18,18 L4,20"/><path d="M6,2 C6,3.105 5.105,4 4,4 C2.895,4 2,3.105 2,2 C2,0.895 2.895,0 4,0 C5.105,0 6,0.895 6,2 Z"/><path d="M19,5 C19,6.105 18.105,7 17,7 C15.895,7 15,6.105 15,5 C15,3.895 15.895,3 17,3 C18.105,3 19,3.895 19,5 Z"/><path d="M4,4 L2,18"/><path d="M6,2 L15,4"/><path d="M22,18 C22,19.105 21.105,20 20,20 C18.895,20 18,19.105 18,18 C18,16.895 18.895,16 20,16 C21.105,16 22,16.895 22,18 Z"/><path d="M17,7 L20,16"/></g></g></g></svg>
                        </div>
                        <span>Polígono personalizado</span>
                    </button>
                </div>
            </div>
        </div>
    );
} 