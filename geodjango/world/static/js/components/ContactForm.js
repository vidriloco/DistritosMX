/**
 * Contact Form
 *
 * Modal opened from the "Contacto" entry in the navigation bar. Collects a
 * name, an email and a message from visitors and potential clients.
 *
 * Leads go to the Django admin for follow-up by email — nothing submitted
 * here is served back out or shown anywhere on the site.
 */
function ContactForm({ open, onClose }) {
    const emptyForm = { name: '', email: '', message: '', website: '' };
    const [form, setForm] = React.useState(emptyForm);
    const [status, setStatus] = React.useState('idle'); // idle | sending | sent | error
    const [errorMsg, setErrorMsg] = React.useState('');
    const dialogRef = React.useRef(null);

    // Reset whenever it reopens, so a previous submission isn't still on screen.
    React.useEffect(() => {
        if (open) {
            setForm(emptyForm);
            setStatus('idle');
            setErrorMsg('');
        }
    }, [open]);

    React.useEffect(() => {
        if (!open) return;
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        if (dialogRef.current) dialogRef.current.focus();
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const set = (key, value) => setForm(f => Object.assign({}, f, { [key]: value }));

    const submit = e => {
        e.preventDefault();
        if (status === 'sending') return;

        if (!form.name.trim()) { setErrorMsg('Necesitamos un nombre para dirigirnos a ti.'); return; }
        if (!form.email.includes('@')) { setErrorMsg('Necesitamos un correo válido para contactarte.'); return; }
        if (!form.message.trim()) { setErrorMsg('Escríbenos un mensaje para saber en qué podemos ayudarte.'); return; }

        setStatus('sending');
        setErrorMsg('');

        fetch('/api/contacto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({}, form, { sourcePath: window.location.pathname }))
        })
            .then(r => r.json().then(body => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
                if (!ok) throw new Error(body.error || 'No pudimos enviar tu mensaje.');
                setStatus('sent');
            })
            .catch(err => {
                setStatus('error');
                setErrorMsg(err.message);
            });
    };

    const modal = (
        <div className="contact-modal-backdrop" onClick={onClose}>
            <div
                className="contact-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="contact-form-title"
                tabIndex="-1"
                ref={dialogRef}
                onClick={e => e.stopPropagation()}
            >
                <button type="button" className="contact-modal-close" onClick={onClose} aria-label="Cerrar">×</button>

                {status === 'sent' ? (
                    <div className="contact-sent">
                        <h2 id="contact-form-title" className="contact-title">Mensaje enviado</h2>
                        <p className="contact-lede">
                            Gracias por escribirnos. Te responderemos a <b>{form.email}</b>.
                        </p>
                        <button type="button" className="contact-cta" onClick={onClose}>Cerrar</button>
                    </div>
                ) : (
                    <form onSubmit={submit} noValidate>
                        <h2 id="contact-form-title" className="contact-title">Contacto</h2>
                        <p className="contact-lede">
                            ¿Tienes un proyecto, una duda o quieres trabajar con nosotros? Escríbenos
                            y te respondemos por correo.
                        </p>

                        <div className="contact-formgrid">
                            <label className="contact-field">
                                <span>Nombre<span className="contact-req"> *</span></span>
                                <input type="text" value={form.name} autoComplete="name"
                                       placeholder="Tu nombre o el de tu organización"
                                       onChange={e => set('name', e.target.value)} />
                            </label>

                            <label className="contact-field">
                                <span>Correo electrónico<span className="contact-req"> *</span></span>
                                <input type="email" value={form.email} autoComplete="email"
                                       placeholder="para responderte"
                                       onChange={e => set('email', e.target.value)} />
                            </label>

                            <label className="contact-field contact-field-wide">
                                <span>Mensaje<span className="contact-req"> *</span></span>
                                <textarea value={form.message} rows="5" maxLength="4000"
                                          placeholder="Cuéntanos qué necesitas: una capa de datos, un análisis a la medida, una colaboración…"
                                          onChange={e => set('message', e.target.value)}></textarea>
                            </label>
                        </div>

                        {/* Honeypot — hidden from people, filled in by form bots. */}
                        <div className="contact-hp" aria-hidden="true">
                            <label>
                                Sitio web
                                <input type="text" value={form.website} tabIndex="-1" autoComplete="off"
                                       onChange={e => set('website', e.target.value)} />
                            </label>
                        </div>

                        {errorMsg && <p className="contact-error" role="alert">{errorMsg}</p>}

                        <div className="contact-formfoot">
                            <button type="submit" className="contact-cta" disabled={status === 'sending'}>
                                {status === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
                            </button>
                            {/* New tab on purpose: navigating away would discard
                                whatever they have already typed. */}
                            <span className="contact-privacy">
                                Tus datos se guardan sólo para responderte y no se comparten con terceros.
                                Consulta el <a href="/privacidad" target="_blank" rel="noopener noreferrer">Aviso de Privacidad</a>
                                {' '}y los <a href="/terminos" target="_blank" rel="noopener noreferrer">Términos y Condiciones</a>.
                            </span>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );

    // Rendered through a portal because the nav bar this opens from sets
    // `pointer-events: none` (clicks fall through to the map) and creates a
    // stacking context at z-index 1000. Left inside it, the modal would be
    // unclickable and would paint under the panels that sit above 1000.
    return ReactDOM.createPortal(modal, document.body);
}

window.ContactForm = ContactForm;
