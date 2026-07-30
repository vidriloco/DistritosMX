// TableComponent - Fetches and displays CSV data in a table
function TableComponent({ csvUrl, onClose }) {
    const [data, setData] = React.useState([]);
    const [headers, setHeaders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [searchTerm, setSearchTerm] = React.useState('');
    const rowsPerPage = 50;

    // Translation mapping for column names to Spanish
    const columnTranslations = {
        'trip_id': 'ID de Viaje',
        'origin_polygon': 'Polígono de Origen',
        'origin_polygon_name': 'Nombre del Polígono de Origen',
        'destination_polygon': 'Polígono de Destino',
        'destination_polygon_name': 'Nombre del Polígono de Destino',
        'date': 'Fecha',
        'time_of_day': 'Hora del Día',
        'created_at': 'Fecha de Creación',
        'updated_at': 'Fecha de Actualización',
        // Statistics CSV columns
        'polygon_origin': 'Polígono de Origen',
        'polygon_destination': 'Polígono de Destino',
        'polygon_origin_name': 'Nombre del Polígono de Origen',
        'polygon_destination_name': 'Nombre del Polígono de Destino',
        'total': 'Total',
        'mañana_total': 'Total Mañana',
        'tarde_total': 'Total Tarde',
        'noche_total': 'Total Noche',
        'madrugada_total': 'Total Madrugada'
    };

    // Function to translate header name
    const translateHeader = (header) => {
        return columnTranslations[header] || header;
    };

    // Detect delimiter (comma or semicolon)
    const detectDelimiter = (line) => {
        const commaCount = (line.match(/,/g) || []).length;
        const semicolonCount = (line.match(/;/g) || []).length;
        return semicolonCount > commaCount ? ';' : ',';
    };

    // Simple CSV parser
    const parseCSV = (csvText) => {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return { headers: [], data: [] };
        
        // Detect delimiter from first line
        const delimiter = detectDelimiter(lines[0]);
        
        // Parse headers (first line)
        const headerLine = lines[0];
        const parsedHeaders = parseCSVLine(headerLine, delimiter);
        setHeaders(parsedHeaders);
        
        // Parse data rows
        const parsedData = [];
        for (let i = 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i], delimiter);
            // Accept rows that match header length or are close (handle missing trailing fields)
            if (row.length >= parsedHeaders.length - 1) {
                const rowObj = {};
                parsedHeaders.forEach((header, index) => {
                    rowObj[header] = row[index] || '';
                });
                parsedData.push(rowObj);
            }
        }
        
        return { headers: parsedHeaders, data: parsedData };
    };

    // Parse a single CSV line, handling quoted fields and custom delimiter
    const parseCSVLine = (line, delimiter = ',') => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                // Field separator
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add last field
        result.push(current.trim());
        return result;
    };

    // Fetch CSV data
    React.useEffect(() => {
        if (!csvUrl) {
            setError('No CSV URL provided');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        
        fetch(csvUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvText => {
                const { headers: parsedHeaders, data: parsedData } = parseCSV(csvText);
                setData(parsedData);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching CSV:', err);
                setError(`Error al cargar los datos: ${err.message}`);
                setLoading(false);
            });
    }, [csvUrl]);

    // Filter data based on search term
    const filteredData = React.useMemo(() => {
        if (!searchTerm.trim()) return data;
        
        const term = searchTerm.toLowerCase();
        return data.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(term)
            );
        });
    }, [data, searchTerm]);

    // Paginate filtered data
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (loading) {
        return React.createElement('div', {
            style: {
                padding: '40px',
                textAlign: 'center',
                color: '#6b7280'
            }
        }, 'Cargando datos...');
    }

    if (error) {
        return React.createElement('div', {
            style: {
                padding: '40px',
                textAlign: 'center',
                color: '#dc2626'
            }
        }, error);
    }

    return React.createElement('div', {
        style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }
    }, [
        // Search bar
        React.createElement('div', {
            key: 'search-bar',
            style: {
                padding: '20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                backgroundColor: '#fafafa',
                background: 'linear-gradient(to bottom, #ffffff, #f9fafb)'
            }
        }, [
            React.createElement('input', {
                key: 'search-input',
                type: 'text',
                placeholder: '🔍 Buscar en la tabla...',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                style: {
                    flex: 1,
                    padding: '10px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                },
                onFocus: (e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                },
                onBlur: (e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }
            }),
            React.createElement('div', {
                key: 'results-count',
                style: {
                    fontSize: '14px',
                    color: '#4b5563',
                    whiteSpace: 'nowrap',
                    fontWeight: '500',
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                }
            }, `${filteredData.length} de ${data.length} registros`)
        ]),
        // Table container
        React.createElement('div', {
            key: 'table-container',
            style: {
                flex: 1,
                overflow: 'auto',
                backgroundColor: '#ffffff'
            }
        }, React.createElement('table', {
            cellPadding: '0',
            cellSpacing: '0',
            style: {
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: '0',
                fontSize: '14px',
                backgroundColor: '#ffffff'
            }
        }, [
            // Table header
            React.createElement('thead', {
                key: 'thead',
                style: {
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }
            }, React.createElement('tr', {
                key: 'header-row'
            }, headers.map((header, index) => 
                React.createElement('th', {
                    key: `header-${index}`,
                    style: {
                        padding: '14px 18px',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#111827',
                        backgroundColor: '#f8fafc',
                        background: 'linear-gradient(to bottom, #ffffff, #f1f5f9)',
                        borderBottom: '2px solid #3b82f6',
                        borderRight: index < headers.length - 1 ? '1px solid #e2e8f0' : 'none',
                        whiteSpace: 'nowrap',
                        minWidth: '120px',
                        fontSize: '13px',
                        letterSpacing: '0.025em',
                        textTransform: 'uppercase',
                        boxShadow: 'inset 0 -1px 0 #e2e8f0'
                    }
                }, translateHeader(header))
            ))),
            // Table body
            React.createElement('tbody', {
                key: 'tbody'
            }, paginatedData.length > 0 ? paginatedData.map((row, rowIndex) =>
                React.createElement('tr', {
                    key: `row-${rowIndex}`,
                    style: {
                        backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                        transition: 'all 0.15s ease',
                        borderBottom: '1px solid #e5e7eb'
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                        e.currentTarget.style.transform = 'scale(1.001)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.1)';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                    }
                }, headers.map((header, colIndex) =>
                    React.createElement('td', {
                        key: `cell-${rowIndex}-${colIndex}`,
                        style: {
                            padding: '14px 18px',
                            color: '#1e293b',
                            borderRight: colIndex < headers.length - 1 ? '1px solid #f1f5f9' : 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '300px',
                            fontSize: '13.5px',
                            lineHeight: '1.5'
                        },
                        title: String(row[header] || '')
                    }, row[header] || '')
                ))
            ) : React.createElement('tr', {
                key: 'no-results'
            }, React.createElement('td', {
                colSpan: headers.length,
                style: {
                    padding: '60px 40px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '15px',
                    backgroundColor: '#f8fafc'
                }
            }, React.createElement('div', {
                style: {
                    fontSize: '48px',
                    marginBottom: '12px'
                }
            }, '🔍'), React.createElement('div', {
                style: {
                    fontWeight: '500',
                    marginBottom: '4px'
                }
            }, 'No se encontraron resultados'), React.createElement('div', {
                style: {
                    fontSize: '13px',
                    color: '#94a3b8'
                }
            }, 'Intenta con otros términos de búsqueda'))))
        ])),
        // Pagination
        totalPages > 1 && React.createElement('div', {
            key: 'pagination',
            style: {
                padding: '18px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#fafafa',
                background: 'linear-gradient(to bottom, #ffffff, #f9fafb)'
            }
        }, [
            React.createElement('button', {
                key: 'prev-btn',
                onClick: () => setCurrentPage(prev => Math.max(1, prev - 1)),
                disabled: currentPage === 1,
                style: {
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : '#ffffff',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    boxShadow: currentPage === 1 ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                },
                onMouseEnter: (e) => {
                    if (currentPage !== 1) {
                        e.target.style.backgroundColor = '#f9fafb';
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.color = '#3b82f6';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    }
                },
                onMouseLeave: (e) => {
                    if (currentPage !== 1) {
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.color = '#374151';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                    }
                }
            }, '← Anterior'),
            React.createElement('div', {
                key: 'page-info',
                style: {
                    fontSize: '14px',
                    color: '#4b5563',
                    fontWeight: '500',
                    padding: '6px 12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }
            }, `Página ${currentPage} de ${totalPages}`),
            React.createElement('button', {
                key: 'next-btn',
                onClick: () => setCurrentPage(prev => Math.min(totalPages, prev + 1)),
                disabled: currentPage === totalPages,
                style: {
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#ffffff',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    boxShadow: currentPage === totalPages ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                },
                onMouseEnter: (e) => {
                    if (currentPage !== totalPages) {
                        e.target.style.backgroundColor = '#f9fafb';
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.color = '#3b82f6';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    }
                },
                onMouseLeave: (e) => {
                    if (currentPage !== totalPages) {
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.color = '#374151';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                    }
                }
            }, 'Siguiente →')
        ])
    ]);
}

// Make the component available globally
window.TableComponent = TableComponent;

