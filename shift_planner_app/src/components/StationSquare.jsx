import React from 'react';
import './StationSquare.css';

export default function StationSquare({ assignment }) {
    const { station, worker, status } = assignment;

    // Determine CSS class based on status
    let statusClass = '';
    if (status === 'GREEN') statusClass = 'status-green';
    else if (status === 'YELLOW') statusClass = 'status-yellow';
    else if (status === 'RED') statusClass = 'status-red';

    return (
        <div className={`station-square ${statusClass}`}>
            <div className="station-header">
                <span className="station-id">{station.id}</span>
                <span className="station-name">{station.name}</span>
            </div>

            <div className="worker-info">
                {worker ? (
                    <>
                        <div className="worker-name">{worker.name} {worker.surname}</div>
                        {status === 'YELLOW' && <div className="worker-role">Zastępstwo</div>}
                        {status === 'GREEN' && <div className="worker-role">Stałe przypisanie</div>}
                        <div className="worker-skill">Skill: {worker.skills[station.id]}%</div>
                    </>
                ) : (
                    <div className="worker-empty">
                        {status === 'RED' ? 'Stanowisko Wyłączone' : 'Brak Pracownika'}
                    </div>
                )}
            </div>
        </div>
    );
}
