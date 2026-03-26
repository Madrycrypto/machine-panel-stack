import React from 'react';
import StationSquare from './StationSquare';
import './LineLayout.css';

export default function LineLayout({ assignments }) {
    // assignments is a dictionary: { 'S1': {station, worker, status}, ... }
    const renderSquare = (stationId) => {
        const assignment = assignments[stationId];
        if (!assignment) return null; // Or empty square
        return <StationSquare key={stationId} assignment={assignment} />;
    };

    return (
        <div className="line-layout-container">
            <h2 className="layout-title">Podgląd Linii (Layout)</h2>

            <div className="line-visualization">
                {/* We can hardcode the shape to resemble a simple U-shape or straight line */}

                <div className="line-row row-top">
                    {renderSquare('S1')}
                    {renderSquare('S2')}
                </div>

                <div className="line-row row-middle">
                    {renderSquare('S3')}
                </div>

                <div className="line-row row-bottom">
                    {renderSquare('S4')}
                    {renderSquare('S5')}
                </div>
            </div>
        </div>
    );
}
