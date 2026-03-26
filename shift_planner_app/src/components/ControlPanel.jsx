import React from 'react';
import './ControlPanel.css';

export default function ControlPanel({
    workers,
    stations,
    absentWorkerIds,
    setAbsentWorkerIds,
    disabledStationIds,
    setDisabledStationIds
}) {
    const toggleAbsence = (workerId) => {
        if (absentWorkerIds.includes(workerId)) {
            setAbsentWorkerIds(absentWorkerIds.filter(id => id !== workerId));
        } else {
            setAbsentWorkerIds([...absentWorkerIds, workerId]);
        }
    };

    const toggleStation = (stationId) => {
        if (disabledStationIds.includes(stationId)) {
            setDisabledStationIds(disabledStationIds.filter(id => id !== stationId));
        } else {
            setDisabledStationIds([...disabledStationIds, stationId]);
        }
    };

    return (
        <div className="control-panel">
            <div className="control-section">
                <h3>🏠 Zarządzanie Linią (Stanowiska)</h3>
                <p className="control-desc">Wyłącz stanowiska, jeśli brakuje pracowników do obsługi całej linii.</p>
                <div className="toggle-list">
                    {stations.map(station => (
                        <label key={station.id} className="toggle-item">
                            <input
                                type="checkbox"
                                checked={disabledStationIds.includes(station.id)}
                                onChange={() => toggleStation(station.id)}
                            />
                            <span className="toggle-label">
                                [{station.id}] {station.name} (Wyłącz)
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="control-section">
                <h3>🤒 Urlopy / Chorobowe (Pracownicy)</h3>
                <p className="control-desc">Zaznacz pracowników, którzy są nieobecni.</p>
                <div className="toggle-list">
                    {workers.map(worker => (
                        <label key={worker.id} className="toggle-item">
                            <input
                                type="checkbox"
                                checked={absentWorkerIds.includes(worker.id)}
                                onChange={() => toggleAbsence(worker.id)}
                            />
                            <span className="toggle-label">
                                {worker.name} {worker.surname} {worker.defaultStation ? `(Dom: ${worker.defaultStation})` : '(Rezerwa)'}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
