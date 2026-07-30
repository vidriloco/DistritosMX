/**
 * Despojo Case Form
 *
 * Modal intake for "Reporta tu caso". Opened by the despojoOpenForm event.
 *
 * This collects personal data from crime victims. Nothing submitted here is
 * served back publicly or drawn on the map — reports go to the Django admin
 * for follow-up by email, and the copy says so plainly.
 */
const DESPOJO_BOROUGHS = [
    'ÁLVARO OBREGÓN', 'AZCAPOTZALCO', 'BENITO JUÁREZ', 'COYOACÁN',
    'CUAJIMALPA DE MORELOS', 'CUAUHTÉMOC', 'GUSTAVO A. MADERO', 'IZTACALCO',
    'IZTAPALAPA', 'LA MAGDALENA CONTRERAS', 'MIGUEL HIDALGO', 'MILPA ALTA',
    'TLÁHUAC', 'TLALPAN', 'VENUSTIANO CARRANZA', 'XOCHIMILCO'
];

const DESPOJO_DENUNCIA_OPTIONS = [
    { value: 'with_folio', label: 'Sí, tengo número de carpeta' },
    { value: 'without_folio', label: 'Sí, pero no tengo el número a la mano' },
    { value: 'not_reported', label: 'No he denunciado' },
    { value: 'refused', label: 'Lo intenté y no me la recibieron' }
];

function DespojoCaseForm({ open, onClose }) {
    const emptyForm = {
        name: '', email: '', borough: '', neighborhood: '',
        year: '', denunciaStatus: '', account: '', consent: false
    };
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
        if (!form.consent) { setErrorMsg('Necesitamos tu autorización para poder contactarte.'); return; }

        setStatus('sending');
        setErrorMsg('');

        fetch('/api/despojos/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
            .then(r => r.json().then(body => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
                if (!ok) throw new Error(body.error || 'No pudimos guardar tu caso.');
                setStatus('sent');
            })
            .catch(err => {
                setStatus('error');
                setErrorMsg(err.message);
            });
    };

    return (
        <div className="despojo-modal-backdrop" onClick={onClose}>
            <div
                className="despojo-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="despojo-form-title"
                tabIndex="-1"
                ref={dialogRef}
                onClick={e => e.stopPropagation()}
            >
                <button type="button" className="despojo-modal-close" onClick={onClose} aria-label="Cerrar">×</button>

                {status === 'sent' ? (
                    <div className="despojo-sent">
                        <h2 id="despojo-form-title" className="despojo-title">Recibimos tu caso</h2>
                        <p className="despojo-lede">
                            Te escribiremos a <b>{form.email}</b>. No publicamos nada de lo que nos
                            contaste ni aparece en el mapa.
                        </p>
                        <button type="button" className="despojo-cta" onClick={onClose}>Cerrar</button>
                    </div>
                ) : (
                    <form onSubmit={submit} noValidate>
                        <h2 id="despojo-form-title" className="despojo-title">Reporta tu caso</h2>
                        <p className="despojo-lede">
                            Lo mínimo para ubicar el caso y devolverte el contacto. Los campos con
                            <span className="despojo-req"> *</span> son necesarios.
                        </p>

                        <div className="despojo-formgrid">
                            <label className="despojo-field">
                                <span>Nombre<span className="despojo-req"> *</span></span>
                                <input type="text" value={form.name} autoComplete="name"
                                       placeholder="Como quieres que te llamemos"
                                       onChange={e => set('name', e.target.value)} />
                            </label>

                            <label className="despojo-field">
                                <span>Correo electrónico<span className="despojo-req"> *</span></span>
                                <input type="email" value={form.email} autoComplete="email"
                                       placeholder="para contactarte de vuelta"
                                       onChange={e => set('email', e.target.value)} />
                            </label>

                            <label className="despojo-field">
                                <span>Alcaldía</span>
                                <select value={form.borough} onChange={e => set('borough', e.target.value)}>
                                    <option value="">Selecciona…</option>
                                    {DESPOJO_BOROUGHS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </label>

                            <label className="despojo-field">
                                <span>Colonia</span>
                                <input type="text" value={form.neighborhood}
                                       placeholder="Opcional"
                                       onChange={e => set('neighborhood', e.target.value)} />
                            </label>

                            <label className="despojo-field">
                                <span>Año del hecho</span>
                                <input type="number" min="1900" max="2100" inputMode="numeric"
                                       value={form.year} placeholder="2024"
                                       onChange={e => set('year', e.target.value)} />
                            </label>

                            <label className="despojo-field">
                                <span>¿Presentaste denuncia?</span>
                                <select value={form.denunciaStatus}
                                        onChange={e => set('denunciaStatus', e.target.value)}>
                                    <option value="">Selecciona…</option>
                                    {DESPOJO_DENUNCIA_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="despojo-field despojo-field-wide">
                                <span>Qué pasó</span>
                                <textarea value={form.account} rows="4" maxLength="4000"
                                          placeholder="Cuéntanos brevemente: cómo se ocupó el inmueble, si hubo documentos falsos, amenazas o violencia."
                                          onChange={e => set('account', e.target.value)}></textarea>
                            </label>
                        </div>

                        <label className="despojo-consent">
                            <input type="checkbox" checked={form.consent}
                                   onChange={e => set('consent', e.target.checked)} />
                            <span>
                                Autorizo que Distritos MX me contacte por correo sobre este caso.
                                Entiendo que mi testimonio <b>no se publica</b> ni aparece en el mapa
                                salvo que lo autorice por separado y por escrito.
                            </span>
                        </label>

                        {errorMsg && <p className="despojo-error" role="alert">{errorMsg}</p>}

                        <div className="despojo-formfoot">
                            <button type="submit" className="despojo-cta" disabled={status === 'sending'}>
                                {status === 'sending' ? 'Enviando…' : 'Enviar caso'}
                            </button>
                            <span className="despojo-privacy">
                                Tus datos se guardan para contactarte y no se comparten con terceros.
                            </span>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

window.DespojoCaseForm = DespojoCaseForm;
