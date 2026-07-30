// RotatingMap component - 3D rotating map over Mexico City's Zócalo
function RotatingMap() {
    const mapContainer = React.useRef(null);
    const map = React.useRef(null);
    const animationFrame = React.useRef(null);
    
    React.useEffect(() => {
        if (!mapContainer.current) return;

        // Set Mapbox access token
        mapboxgl.accessToken = 'pk.eyJ1Ijoidmlkcmlsb2NvIiwiYSI6Ik1QRzIwZmcifQ.BzdjvFURAZ8uJ6kNovrrDA';

        // mapbox://styles/vidriloco/clx4emew100rx01qoeebl5f8z
        // Initialize map
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/vidriloco/clwy3ijjn010701qpax1s54hk',
            center: [-99.142960, 19.435520], // Mexico City Zócalo
            zoom: 17,
            pitch: 85, // 45 degrees pitch as requested
            bearing: 50,
            interactive: false // Disable interactions for background effect
        });

        // Start rotation animation
        const rotateMap = () => {
            if (map.current) {
                const bearing = (map.current.getBearing() + 1) % 360;
                map.current.easeTo({
                    bearing: bearing,
                    duration: 100
                });
            }
            animationFrame.current = requestAnimationFrame(rotateMap);
        };

        map.current.on('load', () => {
            rotateMap();
        });

        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
            if (map.current) {
                map.current.remove();
            }
        };
    }, []);

    return (
        <div className="rotating-map-container">
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}

// Make the component available globally
window.RotatingMap = RotatingMap; 