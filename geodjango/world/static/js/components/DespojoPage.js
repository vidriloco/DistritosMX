/**
 * Despojo Page — proyectos/mapas/despojos-viviendas
 *
 * Composes the map, the decade player, the news rail and the case form.
 * Kept as its own component (rather than inline in SimpleRouter) so its hooks
 * live in a component that mounts and unmounts with the route, instead of
 * being declared inside one branch of the router's if/else chain.
 *
 * On a phone the panel is not a card floating over the map but a bottom sheet
 * with three heights, and this component owns the dragging: the panel only
 * knows how to lay itself out, the sheet knows how far up it is.
 */

// The three heights, low to high. Peek is measured from the sheet's own header
// at runtime rather than hard-coded, so a partial year or a long alcaldía name
// can grow the header without cutting the transport off.
const DESPOJO_SNAPS = ['peek', 'half', 'full'];
const DESPOJO_SNAP_HALF = 0.56;   // share of the viewport shown at mid height
const DESPOJO_PEEK_FALLBACK = 176;
const DESPOJO_MOBILE = '(max-width: 720px)';

function DespojoPage() {
    const [formOpen, setFormOpen] = React.useState(false);
    // Opens at mid height: peek looks better but does not say what the page is.
    const [snap, setSnap] = React.useState('half');
    const sheetRef = React.useRef(null);
    const dragRef = React.useRef(null);

    React.useEffect(() => {
        const open = () => setFormOpen(true);
        window.addEventListener('despojoOpenForm', open);
        return () => window.removeEventListener('despojoOpenForm', open);
    }, []);

    const isMobile = () => window.matchMedia(DESPOJO_MOBILE).matches;

    // How far down the sheet sits for each height, in pixels of translation.
    const offsets = React.useCallback(() => {
        const el = sheetRef.current;
        if (!el) return null;
        const height = el.offsetHeight;
        const head = el.querySelector('.despojo-head');
        const grab = el.querySelector('.despojo-grab');
        // Capped: on a year the registry has barely loaded the header grows by
        // the callout explaining the gap, and an uncapped peek would stop being
        // a peek on a short screen.
        const peek = (head && grab)
            ? Math.min(grab.offsetHeight + head.offsetHeight, window.innerHeight * 0.45)
            : DESPOJO_PEEK_FALLBACK;
        return {
            full: 0,
            half: Math.max(0, height - Math.round(window.innerHeight * DESPOJO_SNAP_HALF)),
            peek: Math.max(0, height - peek),
        };
    }, []);

    const applySnap = React.useCallback((name) => {
        const el = sheetRef.current;
        if (!el) return;
        // Above the breakpoint the sheet is `display: contents` and the panel
        // is a plain card again, so any leftover translation has to go.
        if (!isMobile()) {
            el.style.removeProperty('--dsp-sheet-y');
            return;
        }
        const stops = offsets();
        if (stops) el.style.setProperty('--dsp-sheet-y', stops[name] + 'px');
    }, [offsets]);

    React.useLayoutEffect(() => { applySnap(snap); }, [snap, applySnap]);

    // The heights are derived from the viewport and from the header's own
    // height, so both a rotation and a header that grew have to re-run them.
    React.useEffect(() => {
        const sync = () => applySnap(snap);
        window.addEventListener('resize', sync);
        window.addEventListener('orientationchange', sync);
        // The year is what changes the header's height without changing the
        // sheet's: an incomplete year adds the callout explaining the gap, and
        // at peek that callout would otherwise be cut in half. Fires on the
        // first year too, which is when the header first exists to measure.
        window.addEventListener('despojoYearChanged', sync);
        return () => {
            window.removeEventListener('resize', sync);
            window.removeEventListener('orientationchange', sync);
            window.removeEventListener('despojoYearChanged', sync);
        };
    }, [snap, applySnap]);

    // The panel asks for a height when it changes what it is asking of the
    // reader — "cerca de mí" needs the marker and its radius on screen.
    React.useEffect(() => {
        const onSnap = (event) => {
            const wanted = event.detail;
            if (DESPOJO_SNAPS.indexOf(wanted) === -1 || !isMobile()) return;
            setSnap(wanted);
            applySnap(wanted);
        };
        window.addEventListener('despojoSheetSnap', onSnap);
        return () => window.removeEventListener('despojoSheetSnap', onSnap);
    }, [applySnap]);

    const cycle = () => setSnap(prev =>
        DESPOJO_SNAPS[(DESPOJO_SNAPS.indexOf(prev) + 1) % DESPOJO_SNAPS.length]);

    // ---- dragging the handle -------------------------------------------
    const onPointerDown = (event) => {
        const el = sheetRef.current;
        if (!el || !isMobile()) return;
        const stops = offsets();
        if (!stops) return;
        dragRef.current = { y: event.clientY, from: stops[snap], moved: 0, stops: stops };
        el.classList.add('is-dragging');
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event) => {
        const drag = dragRef.current;
        const el = sheetRef.current;
        if (!drag || !el) return;
        drag.moved = event.clientY - drag.y;
        const y = Math.max(0, Math.min(drag.stops.peek, drag.from + drag.moved));
        el.style.setProperty('--dsp-sheet-y', y + 'px');
    };

    const endDrag = () => {
        const drag = dragRef.current;
        const el = sheetRef.current;
        dragRef.current = null;
        if (!drag || !el) return;
        el.classList.remove('is-dragging');

        // Barely moved: this was a tap, and a tap steps up one height.
        if (Math.abs(drag.moved) < 6) { cycle(); return; }

        const y = Math.max(0, Math.min(drag.stops.peek, drag.from + drag.moved));
        const nearest = DESPOJO_SNAPS.reduce((best, name) => (
            Math.abs(drag.stops[name] - y) < Math.abs(drag.stops[best] - y) ? name : best
        ), 'half');
        // Applied by hand as well as through state: when the finger lands back
        // on the height it started from, `setSnap` is a no-op and nothing would
        // pull the sheet off the pixel it was dropped on.
        applySnap(nearest);
        setSnap(nearest);
    };

    const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (isMobile()) cycle();
    };

    const MapAdminAppComponent = window.MapAdminApp || (() => null);
    const PlayerPanel = window.DespojoPlayerPanel || (() => null);
    const NewsStrip = window.DespojoNewsStrip || (() => null);
    const CaseForm = window.DespojoCaseForm || (() => null);

    // No navigation bar on this page: the map runs full-bleed and the brand
    // (and the way back home) sits on its own above the panel, where a nav bar
    // would be — outside the card, so it reads as chrome and not as content.
    return (
        <div className="despojos-viviendas-page">
            <div className="map-container">
                <MapAdminAppComponent
                    hideVerticalPanel={true}
                    hideLoadingModal={true}
                    hideTopNavigation={true}
                    mapStyle="mapbox://styles/mapbox/light-v11"
                />
            </div>

            <div className="despojo-panel-slot">
                <a className="despojo-brand" href="/" aria-label="Distritos MX — ir al inicio">
                    <img src="/static/images/distritos-mx-logo-black.png" alt="Distritos MX" />
                </a>

                {/* `display: contents` above the breakpoint, so on a desktop the
                    brand and the panel stay direct children of the slot and this
                    wrapper costs nothing. Below it, this is the sheet that moves. */}
                <div className={'despojo-sheet is-' + snap} ref={sheetRef}>
                    <button
                        type="button"
                        className="despojo-grab"
                        aria-label="Cambiar el alto del panel"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onKeyDown={onKeyDown}
                    ></button>
                    <PlayerPanel />
                </div>
            </div>

            {/* The floating rail. Below the breakpoint this instance stands
                down and the copy inside the sheet takes over. */}
            <NewsStrip />

            <CaseForm open={formOpen} onClose={() => setFormOpen(false)} />
        </div>
    );
}

window.DespojoPage = DespojoPage;
