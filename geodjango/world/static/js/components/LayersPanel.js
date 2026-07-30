// LayersPanel component - Shows available map layers
function LayersPanel({ isCollapsed = false, onToggleCollapse = null, onShowTableModal = null }) {
    const [mapStyle, setMapStyle] = React.useState('light'); // 'light' or 'dark'
    
    // Download URLs - Placeholder URLs that can be updated
    const downloadUrls = {
        file1: 'https://distritosmexico.s3.us-east-2.amazonaws.com/projects/mundial/matching-trips.csv', // Placeholder URL for Download File 1
        file2: 'https://distritosmexico.s3.us-east-2.amazonaws.com/projects/mundial/movements.zip', // Placeholder URL for Download File 2
        file3: 'https://distritosmexico.s3.us-east-2.amazonaws.com/projects/mundial/trips.zip',  // Placeholder URL for Download File 3
        file4: 'https://distritosmexico.s3.us-east-2.amazonaws.com/projects/mundial/trips-stats.csv'  // Statistics CSV
    };
    
    const downloadLabels = {
        file1: 'Tabla de viajes entre polígonos',
        file2: 'Pings desplegados en el mapa',
        file3: 'Descriptores de grupos de pings',
        file4: 'Estadísticas de polígonos'
    };

    // Toggle map style
    const toggleMapStyle = () => {
        const newStyle = mapStyle === 'light' ? 'dark' : 'light';
        setMapStyle(newStyle);
        
        // Update map style directly if map is available
        if (window.map && typeof window.map.setStyle === 'function') {
            const styleUrl = newStyle === 'light' 
                ? 'mapbox://styles/mapbox/light-v11' 
                : 'mapbox://styles/mapbox/dark-v11';
            window.map.setStyle(styleUrl);
        }
    };

    const headerButtons = [];
    
    // Add map style toggle button first (sun/moon icons)
    headerButtons.push(
        React.createElement('button', {
            key: 'map-style-toggle',
            onClick: (e) => {
                e.stopPropagation();
                toggleMapStyle();
            },
            style: {
                padding: '4px 8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2c3e50'
            },
            title: `Switch to ${mapStyle === 'light' ? 'dark' : 'light'} mode`
        }, React.createElement('svg', {
            width: '18',
            height: '18',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
        }, mapStyle === 'light' ? 
            // Moon icon
            React.createElement('path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' }) :
            // Sun icon
            [
                React.createElement('circle', { key: 'sun-circle', cx: '12', cy: '12', r: '5' }),
                React.createElement('line', { key: 'sun-1', x1: '12', y1: '1', x2: '12', y2: '3' }),
                React.createElement('line', { key: 'sun-2', x1: '12', y1: '21', x2: '12', y2: '23' }),
                React.createElement('line', { key: 'sun-3', x1: '4.22', y1: '4.22', x2: '5.64', y2: '5.64' }),
                React.createElement('line', { key: 'sun-4', x1: '18.36', y1: '18.36', x2: '19.78', y2: '19.78' }),
                React.createElement('line', { key: 'sun-5', x1: '1', y1: '12', x2: '3', y2: '12' }),
                React.createElement('line', { key: 'sun-6', x1: '21', y1: '12', x2: '23', y2: '12' }),
                React.createElement('line', { key: 'sun-7', x1: '4.22', y1: '19.78', x2: '5.64', y2: '18.36' }),
                React.createElement('line', { key: 'sun-8', x1: '18.36', y1: '5.64', x2: '19.78', y2: '4.22' })
            ]
        ))
    );
    
    // Add collapse/expand button on the right side if onToggleCollapse is provided (chevron icons)
    if (onToggleCollapse) {
        headerButtons.push(
            React.createElement('button', {
                key: 'collapse-toggle',
                onClick: (e) => {
                    e.stopPropagation();
                    onToggleCollapse();
                },
                style: {
                    padding: '4px 8px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '8px',
                    color: '#2c3e50'
                },
                title: isCollapsed ? 'Expand panel' : 'Collapse panel'
            }, React.createElement('svg', {
                width: '16',
                height: '16',
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: '2',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                style: {
                    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.2s ease'
                }
            }, React.createElement('polyline', { points: '6 9 12 15 18 9' })))
        );
    }

    const panelChildren = [
        React.createElement('div', {
            key: 'layers-header',
            className: 'layers-header',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: onToggleCollapse ? 'pointer' : 'default'
            },
            onClick: onToggleCollapse || undefined
        }, [
            'Capas y más',
            React.createElement('div', {
                key: 'header-buttons',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }
            }, headerButtons)
        ])
    ];
    
    // Only add content when not collapsed
    if (!isCollapsed) {
        panelChildren.push(
            React.createElement('div', {
                key: 'layers-content',
                className: 'layers-content',
                style: {
                    flex: 1,
                    overflowY: 'auto',
                    minHeight: 0
                }
            }, [
                React.createElement('div', {
                    key: 'layers-list',
                    className: 'layers-list'
                }, [
                    React.createElement(InterestPolygonsComponent, {
                        key: 'interest-polygons'
                    })
                ]),
                // Separator
                React.createElement('div', {
                    key: 'layers-separator',
                    className: 'layers-separator'
                }),
                // Metro transport system
                React.createElement(PublicTransportList, {
                    key: 'metro-transport',
                    system: 'metro',
                    title: 'STC Metro'
                }),
                // Metrobus transport system
                React.createElement(PublicTransportList, {
                    key: 'metrobus-transport',
                    system: 'metrobus',
                    title: 'Metrobús'
                }),
                // Tren Ligero transport system
                React.createElement(PublicTransportList, {
                    key: 'tren-ligero-transport',
                    system: 'tren-ligero',
                    title: 'Tren Ligero'
                }),
                // Trolebús transport system
                React.createElement(PublicTransportList, {
                    key: 'trolebus-transport',
                    system: 'trolebus',
                    title: 'Trolebús'
                }),
                // Divider
                React.createElement('div', {
                    key: 'downloads-divider',
                    className: 'layers-separator'
                }),
                // Download section title
                React.createElement('div', {
                    key: 'downloads-title',
                    className: 'downloads-title'
                }, 'Descargas'),
                // Download links section
                React.createElement('div', {
                    key: 'downloads-section',
                    className: 'downloads-section'
                }, [
                    // Download Link 1 with Visualizar link
                    React.createElement('div', {
                        key: 'download-1-wrapper',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%'
                        }
                    }, [
                        React.createElement('a', {
                            key: 'download-1',
                            href: downloadUrls.file1,
                            className: 'download-link',
                            onClick: (e) => {
                                e.preventDefault();
                                const url = downloadUrls.file1;
                                if (url && url !== '#') {
                                    window.open(url, '_blank');
                                }
                            },
                            style: {
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center'
                            }
                        }, [
                            React.createElement('svg', {
                                key: 'download-icon-1',
                                width: '16',
                                height: '16',
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: 'currentColor',
                                strokeWidth: '2',
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                                style: { marginRight: '8px' }
                            }, [
                                React.createElement('path', { key: 'path1', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
                                React.createElement('polyline', { key: 'poly1', points: '7 10 12 15 17 10' }),
                                React.createElement('line', { key: 'line1', x1: '12', y1: '15', x2: '12', y2: '3' })
                            ]),
                            downloadLabels.file1
                        ]),
                        React.createElement('a', {
                            key: 'visualizar-1',
                            href: '#',
                            className: 'download-link',
                            onClick: (e) => {
                                e.preventDefault();
                                if (onShowTableModal) {
                                    onShowTableModal(downloadUrls.file1);
                                }
                            },
                            style: {
                                marginLeft: '12px',
                                color: '#2563eb',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: '500'
                            }
                        }, 'Visualizar')
                    ]),
                    // Download Link 2
                    React.createElement('a', {
                        key: 'download-2',
                        href: downloadUrls.file2,
                        className: 'download-link',
                        onClick: (e) => {
                            e.preventDefault();
                            const url = downloadUrls.file2;
                            if (url && url !== '#') {
                                window.open(url, '_blank');
                            }
                        }
                    }, [
                        React.createElement('svg', {
                            key: 'download-icon-2',
                            width: '16',
                            height: '16',
                            viewBox: '0 0 24 24',
                            fill: 'none',
                            stroke: 'currentColor',
                            strokeWidth: '2',
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                            style: { marginRight: '8px' }
                        }, [
                            React.createElement('path', { key: 'path2', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
                            React.createElement('polyline', { key: 'poly2', points: '7 10 12 15 17 10' }),
                            React.createElement('line', { key: 'line2', x1: '12', y1: '15', x2: '12', y2: '3' })
                        ]),
                        downloadLabels.file2
                    ]),
                    // Download Link 3
                    React.createElement('a', {
                        key: 'download-3',
                        href: downloadUrls.file3,
                        className: 'download-link',
                        onClick: (e) => {
                            e.preventDefault();
                            const url = downloadUrls.file3;
                            if (url && url !== '#') {
                                window.open(url, '_blank');
                            }
                        }
                    }, [
                        React.createElement('svg', {
                            key: 'download-icon-3',
                            width: '16',
                            height: '16',
                            viewBox: '0 0 24 24',
                            fill: 'none',
                            stroke: 'currentColor',
                            strokeWidth: '2',
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                            style: { marginRight: '8px' }
                        }, [
                            React.createElement('path', { key: 'path3', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
                            React.createElement('polyline', { key: 'poly3', points: '7 10 12 15 17 10' }),
                            React.createElement('line', { key: 'line3', x1: '12', y1: '15', x2: '12', y2: '3' })
                        ]),
                        downloadLabels.file3
                    ]),
                    // Download Link 4 - Estadísticas de polígonos with Visualizar button
                    React.createElement('div', {
                        key: 'download-4-wrapper',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%'
                        }
                    }, [
                        React.createElement('a', {
                            key: 'download-4',
                            href: downloadUrls.file4,
                            className: 'download-link',
                            onClick: (e) => {
                                e.preventDefault();
                                const url = downloadUrls.file4;
                                if (url && url !== '#') {
                                    window.open(url, '_blank');
                                }
                            },
                            style: {
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center'
                            }
                        }, [
                            React.createElement('svg', {
                                key: 'download-icon-4',
                                width: '16',
                                height: '16',
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: 'currentColor',
                                strokeWidth: '2',
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                                style: { marginRight: '8px' }
                            }, [
                                React.createElement('path', { key: 'path4', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
                                React.createElement('polyline', { key: 'poly4', points: '7 10 12 15 17 10' }),
                                React.createElement('line', { key: 'line4', x1: '12', y1: '15', x2: '12', y2: '3' })
                            ]),
                            downloadLabels.file4
                        ]),
                        React.createElement('a', {
                            key: 'visualizar-4',
                            href: '#',
                            className: 'download-link',
                            onClick: (e) => {
                                e.preventDefault();
                                if (onShowTableModal) {
                                    onShowTableModal(downloadUrls.file4);
                                }
                            },
                            style: {
                                marginLeft: '12px',
                                color: '#2563eb',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: '500'
                            }
                        }, 'Visualizar')
                    ])
                ])
            ])
        );
    }

    return React.createElement('div', {
        className: 'layers-panel'
    }, panelChildren);
}

// Export for use in other components
window.LayersPanel = LayersPanel;
