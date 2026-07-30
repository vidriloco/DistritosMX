/**
 * Despojo News Strip
 *
 * Collapsible rail of recent coverage, shown bottom-right of the despojos map.
 * Reads a hand-curated JSON in static/data — there is no dependable public
 * feed for the Mexican press, so the file is meant to be reviewed weekly.
 */
function DespojoNewsStrip() {
    const [items, setItems] = React.useState(null);
    const [open, setOpen] = React.useState(true);
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        fetch('/static/data/despojo-news.json')
            .then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(data => { if (!cancelled) setItems(data.items || []); })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, []);

    // Nothing to show and nothing to explain — stay out of the way.
    if (failed || (items && items.length === 0)) return null;

    const formatDate = iso => {
        if (!iso) return '';
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
                        'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const [y, m, d] = iso.split('-').map(Number);
        if (!y || !m || !d) return iso;
        return `${d} ${months[m - 1]} ${y}`;
    };

    return (
        <div className={'despojo-news' + (open ? '' : ' is-collapsed')}>
            <button
                type="button"
                className="despojo-news-head"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <span className="despojo-eyebrow">En las noticias</span>
                <span className="despojo-news-toggle" aria-hidden="true">{open ? '▾' : '▴'}</span>
            </button>

            {open && (
                <div className="despojo-news-list">
                    {!items && <p className="despojo-news-loading">Cargando notas…</p>}
                    {items && items.map((item, i) => (
                        <a
                            key={i}
                            className="despojo-news-item"
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span className="despojo-news-src">
                                <span className="despojo-dot"></span>{item.source}
                            </span>
                            <span className="despojo-news-headline">{item.headline}</span>
                            <span className="despojo-news-date">{formatDate(item.date)}</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

window.DespojoNewsStrip = DespojoNewsStrip;
