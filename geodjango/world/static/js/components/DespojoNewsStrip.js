/**
 * Despojo News Strip
 *
 * Collapsible rail of recent coverage, shown bottom-right of the despojos map.
 *
 * Reads the notes an editor approved in the admin, harvested from RSS by the
 * despojo_news_fetch job. The hand-curated JSON in static/data is kept as a
 * fallback: if the job stops running or the endpoint is down, the rail shows
 * the last known set instead of an empty box.
 */
const DESPOJO_NEWS_ENDPOINT = '/api/despojos/news';
const DESPOJO_NEWS_FALLBACK = '/static/data/despojo-news.json';

function DespojoNewsStrip() {
    const [items, setItems] = React.useState(null);
    const [open, setOpen] = React.useState(true);
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;

        const load = url => fetch(url).then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });

        load(DESPOJO_NEWS_ENDPOINT)
            // An empty queue is treated like a failure on purpose: it means
            // nothing has been approved yet, and the curated file is a better
            // answer than no rail at all.
            .then(data => (data.items && data.items.length)
                ? data
                : load(DESPOJO_NEWS_FALLBACK))
            .catch(() => load(DESPOJO_NEWS_FALLBACK))
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
