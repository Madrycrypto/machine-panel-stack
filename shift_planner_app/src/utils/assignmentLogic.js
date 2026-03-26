export function calculateAssignments(stations, workers, absentWorkerIds, disabledStationIds) {
    const assignments = {};

    // Track who is already assigned
    const assignedWorkerIds = new Set();

    // Available workers pool
    const availableWorkers = workers.filter(w => !absentWorkerIds.includes(w.id));

    // 1. Mark disabled stations directly
    stations.forEach(station => {
        if (disabledStationIds.includes(station.id)) {
            assignments[station.id] = {
                station,
                worker: null,
                status: 'RED'
            };
        }
    });

    // 2. Assign GREEN (Primary workers to their default stations, if present)
    stations.forEach(station => {
        if (!assignments[station.id]) { // If not disabled
            // Find default worker for this station
            const defaultWorker = availableWorkers.find(
                w => w.defaultStation === station.id && !assignedWorkerIds.has(w.id)
            );

            if (defaultWorker) {
                assignments[station.id] = {
                    station,
                    worker: defaultWorker,
                    status: 'GREEN'
                };
                assignedWorkerIds.add(defaultWorker.id);
            }
        }
    });

    // 3. Assign YELLOW (Substitutions for remaining unfilled active stations)
    const unfilledStations = stations.filter(s => !assignments[s.id]);

    unfilledStations.forEach(station => {
        // Find unassigned available workers
        const unassignedWorkers = availableWorkers.filter(w => !assignedWorkerIds.has(w.id));

        if (unassignedWorkers.length > 0) {
            // Sort unassigned workers by skill for this station (highest first)
            const sortedCandidates = [...unassignedWorkers].sort((a, b) => {
                const skillA = a.skills[station.id] || 0;
                const skillB = b.skills[station.id] || 0;
                return skillB - skillA;
            });

            const bestCandidate = sortedCandidates[0];

            // If the best candidate has at least some skill > 0
            if ((bestCandidate.skills[station.id] || 0) > 0) {
                assignments[station.id] = {
                    station,
                    worker: bestCandidate,
                    status: 'YELLOW'
                };
                assignedWorkerIds.add(bestCandidate.id);
            } else {
                // No one with skills = RED
                assignments[station.id] = {
                    station,
                    worker: null,
                    status: 'RED'
                };
            }
        } else {
            // No workers available = RED
            assignments[station.id] = {
                station,
                worker: null,
                status: 'RED'
            };
        }
    });

    // Extra context: Unassigned available workers (Floaters or idle)
    const unassignedFloaters = availableWorkers.filter(w => !assignedWorkerIds.has(w.id));

    return {
        assignments,
        unassignedFloaters
    };
}
