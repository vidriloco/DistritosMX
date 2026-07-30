import React, { useEffect, useState } from 'react';

const LinesList = () => {
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLines = async () => {
            try {
                const response = await fetch('/api/lines/yucatan');
                if (!response.ok) {
                    throw new Error('Failed to fetch lines');
                }
                const data = await response.json();
                setLines(data.lines);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchLines();
    }, []);

    if (loading) {
        return <div className="lines-list loading">Loading lines...</div>;
    }

    if (error) {
        return <div className="lines-list error">Error: {error}</div>;
    }

    return (
        <div className="lines-list">
            <h2>Available Lines</h2>
            <div className="lines-container">
                {lines.map(line => (
                    <div key={line.id} className="line-item">
                        <div className="line-color" style={{ backgroundColor: line.color }}></div>
                        <div className="line-info">
                            <h3>{line.title}</h3>
                            <p className="line-details">
                                <span className="system">{line.system}</span>
                                <span className="status">{line.operative_status}</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LinesList; 