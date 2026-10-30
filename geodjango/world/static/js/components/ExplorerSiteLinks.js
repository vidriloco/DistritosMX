// ExplorerSiteLinks - the site's main menu (Explorar, Negocios, Análisis,
// Contacto), in the same order as on the home page, inside the light gray
// group at the right of the /explorar and /negocios top bars. The help
// button sits after the group. On a phone the group gives way to a menu
// button that lists the same links.

function ExplorerSiteLinks({ onHelpClick }) {
    const [analisisOpen, setAnalisisOpen] = React.useState(false);
    const [contactOpen, setContactOpen] = React.useState(false);
    const [phoneMenuOpen, setPhoneMenuOpen] = React.useState(false);
    const menuRef = React.useRef(null);
    const phoneMenuRef = React.useRef(null);

    const path = window.location.pathname;
    const isActive = (prefix) => path === prefix || path.startsWith(prefix + '/');

    const navigate = (to) => {
        setAnalisisOpen(false);
        setPhoneMenuOpen(false);
        if (window.navigate) window.navigate(to); else window.location.href = to;
    };

    React.useEffect(() => {
        if (!analisisOpen) return undefined;
        const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setAnalisisOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setAnalisisOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [analisisOpen]);

    React.useEffect(() => {
        if (!phoneMenuOpen) return undefined;
        const onDown = (e) => { if (phoneMenuRef.current && !phoneMenuRef.current.contains(e.target)) setPhoneMenuOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setPhoneMenuOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [phoneMenuOpen]);

    const ContactModal = window.ContactForm || (() => null);
    const link = (to, label) => (
        <a href={to} className={isActive(to) ? 'is-active' : ''} aria-current={isActive(to) ? 'page' : undefined}
           onClick={(e) => { e.preventDefault(); navigate(to); }}>{label}</a>
    );

    return (
        <nav className="xb-links" aria-label="Secciones">
            <div className="xb-links-group">
                {link('/explorar', 'Explorar')}
                {link('/negocios', 'Negocios')}
                <div className="xb-links-menu" ref={menuRef}>
                    <button type="button" className={isActive('/proyectos') ? 'is-active' : ''} aria-haspopup="true" aria-expanded={analisisOpen}
                            onClick={() => setAnalisisOpen((v) => !v)}>
                        Análisis
                        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4l3 3 3-3" /></svg>
                    </button>
                    {analisisOpen && (
                        <div className="xb-links-dropdown" role="menu">
                            <button type="button" role="menuitem" onClick={() => navigate('/proyectos/mapas/despojos-viviendas')}>Despojos</button>
                        </div>
                    )}
                </div>
                <button type="button" onClick={() => { setAnalisisOpen(false); setContactOpen(true); }}>Contacto</button>
            </div>
            <button type="button" className="xb-icon-button" onClick={onHelpClick} aria-label="Ayuda" title="Ayuda">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5" />
                    <circle cx="12" cy="17" r=".6" fill="currentColor" />
                </svg>
            </button>
            <div className="xb-phone-menu" ref={phoneMenuRef}>
                <button type="button" className="xb-icon-button" aria-label="Menú" aria-haspopup="true" aria-expanded={phoneMenuOpen}
                        onClick={() => setPhoneMenuOpen((v) => !v)}>
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                </button>
                {phoneMenuOpen && (
                    <div className="xb-links-dropdown" role="menu">
                        <button type="button" role="menuitem" className={isActive('/explorar') ? 'is-active' : ''} onClick={() => navigate('/explorar')}>Explorar</button>
                        <button type="button" role="menuitem" className={isActive('/negocios') ? 'is-active' : ''} onClick={() => navigate('/negocios')}>Negocios</button>
                        <button type="button" role="menuitem" onClick={() => navigate('/proyectos/mapas/despojos-viviendas')}>Despojos</button>
                        <button type="button" role="menuitem" onClick={() => { setPhoneMenuOpen(false); setContactOpen(true); }}>Contacto</button>
                    </div>
                )}
            </div>
            <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
        </nav>
    );
}

window.ExplorerSiteLinks = ExplorerSiteLinks;
