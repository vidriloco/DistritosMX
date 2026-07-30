/**
 * Despojo Page — proyectos/mapas/despojos-viviendas
 *
 * Composes the map, the decade player, the news rail and the case form.
 * Kept as its own component (rather than inline in SimpleRouter) so its hooks
 * live in a component that mounts and unmounts with the route, instead of
 * being declared inside one branch of the router's if/else chain.
 */
function DespojoPage() {
    const [formOpen, setFormOpen] = React.useState(false);

    React.useEffect(() => {
        const open = () => setFormOpen(true);
        window.addEventListener('despojoOpenForm', open);
        return () => window.removeEventListener('despojoOpenForm', open);
    }, []);

    const MapAdminAppComponent = window.MapAdminApp || (() => null);
    const PlayerPanel = window.DespojoPlayerPanel || (() => null);
    const NewsStrip = window.DespojoNewsStrip || (() => null);
    const CaseForm = window.DespojoCaseForm || (() => null);

    // No navigation bar on this page: the map runs full-bleed and the brand
    // (and the way back home) sits on its own above the panel, where a nav bar
    // would be — outside the card, so it reads as chrome and not as content.
    return (
        <div className="despojos-viviendas-page">
            <div className="map-container" style={{ height: '100vh' }}>
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
                <PlayerPanel />
            </div>

            <NewsStrip />

            <CaseForm open={formOpen} onClose={() => setFormOpen(false)} />
        </div>
    );
}

window.DespojoPage = DespojoPage;
