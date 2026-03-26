document.addEventListener('DOMContentLoaded', () => {
    // Top UI
    const workerIdInput = document.getElementById('workerIdInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginOverlay = document.getElementById('loginOverlay');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Admin config
    const adminBtn = document.getElementById('adminBtn');
    const adminOverlay = document.getElementById('adminOverlay');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const saveAdminBtn = document.getElementById('saveAdminBtn');
    const apiUrlInput = document.getElementById('apiUrlInput');
    
    let verifiedAdminPassword = null;
    
    // App variables
    const clockDisplay = document.getElementById('clockDisplay');
    const workerDisplay = document.querySelector('.worker-display');
    const machineGrid = document.getElementById('machineGrid');
    const errorSection = document.getElementById('errorSection');
    const failuresGrid = document.getElementById('failuresGrid');
    const resolveBtn = document.getElementById('resolveBtn');

    // Mode containers
    const modeOverlay = document.getElementById('modeOverlay');
    const btnMode1 = document.getElementById('btnMode1');
    const btnMode2 = document.getElementById('btnMode2');
    const mode1Container = document.getElementById('mode1Container');
    const mode2Container = document.getElementById('mode2Container');
    const activeAlertsGrid = document.getElementById('activeAlertsGrid');
    const footerActionsBlock = document.getElementById('footerActionsBlock');

    // State
    let leaderName = localStorage.getItem('leader_name') || '';
    let apiUrl = localStorage.getItem('leader_api_url') || window.location.origin;
    let selectedMachineId = null;
    let currentMode = null; // 1 = Simulation, 2 = Admin Dashboard
    let simulationPingInterval = null;
    let activeFaultsGlobalList = []; // From GET /api/live
    let connectedMachinesGlobal = {}; // { machineId: lastSeenIso } from /api/live

    // Initialize
    if (apiUrl) apiUrlInput.value = apiUrl;
    loginOverlay.style.display = 'flex'; // ALWAYS require login
    if (leaderName) workerIdInput.value = leaderName; // pre-fill for convenience

    // --- Resizable Split-View Logic ---
    function initResizableLayout() {
        const resizer = document.getElementById('resizerGutter');
        const machineColumn = document.querySelector('.machine-selector-section');
        if (!resizer || !machineColumn) return;

        // Load saved width
        const savedWidth = localStorage.getItem('leader_machine_col_width');
        if (savedWidth) {
            machineColumn.style.width = savedWidth + 'px';
        }

        let isResizing = false;

        const startResizing = (e) => {
            isResizing = true;
            document.body.classList.add('resizing');
            resizer.classList.add('active');
        };

        const stopResizing = () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.classList.remove('resizing');
            resizer.classList.remove('active');
            localStorage.setItem('leader_machine_col_width', machineColumn.offsetWidth);
        };

        const resize = (e) => {
            if (!isResizing) return;
            
            const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
            const offsetLeft = machineColumn.getBoundingClientRect().left;
            const newWidth = clientX - offsetLeft;
            
            // Constrain width
            if (newWidth > 150 && newWidth < (window.innerWidth - 300)) {
                machineColumn.style.width = newWidth + 'px';
            }
        };

        // Mouse Events
        resizer.addEventListener('mousedown', startResizing);
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);

        // Touch Events (for Tablet)
        resizer.addEventListener('touchstart', startResizing);
        window.addEventListener('touchmove', resize);
        window.addEventListener('touchend', stopResizing);
    }

    initResizableLayout();

    // --- Time Clock ---
    setInterval(() => {
        const now = new Date();
        const f = n => n.toString().padStart(2, '0');
        clockDisplay.textContent = `${f(now.getHours())}:${f(now.getMinutes())}:${f(now.getSeconds())}`;
    }, 1000);

    // --- Authentication ---
    loginBtn.addEventListener('click', () => {
        const val = workerIdInput.value.trim();
        if (val) {
            leaderName = val;
            localStorage.setItem('leader_name', leaderName);
            loginOverlay.style.display = 'none';
            logoutBtn.style.display = 'block';
            workerDisplay.textContent = `👷 Lider: ${leaderName}`;
            modeOverlay.style.display = 'flex'; // Show MODE selection
            fetchLiveStatus();
        }
    });

    logoutBtn.addEventListener('click', () => {
        // AUTO-RESET: Clear all active faults when logging out
        if (activeFaultsGlobalList.length > 0) {
            console.log("Auto-resetting all active faults due to logout...");
            activeFaultsGlobalList.forEach(fault => {
                sendMachineLog(fault.machine_id, parseInt(fault.code), "STOP", "Auto-reset on logout");
            });
        }

        leaderName = '';
        currentMode = null;
        localStorage.removeItem('leader_name');
        loginOverlay.style.display = 'flex';
        modeOverlay.style.display = 'none';
        mode1Container.classList.remove('active');
        mode2Container.classList.remove('active');
        footerActionsBlock.style.display = 'none';
        logoutBtn.style.display = 'none';
        selectedMachineId = null;
        if (simulationPingInterval) clearInterval(simulationPingInterval);
    });

    // --- Mode Selection ---
    btnMode1.addEventListener('click', () => {
        currentMode = 1;
        modeOverlay.style.display = 'none';
        mode1Container.classList.add('active');
        footerActionsBlock.style.display = 'none'; // Hidden until machine with fault selected
        errorSection.classList.add('disabled');
        fetchMachines();
        fetchFailures();
        setInterval(fetchLiveStatus, 5000);
        
        // Start simulation heartbeats so all machines show as green in Master
        if (simulationPingInterval) clearInterval(simulationPingInterval);
        simulationPingInterval = setInterval(sendSimulationHeartbeats, 10000);
        sendSimulationHeartbeats(); // First one immediately
    });

    btnMode2.addEventListener('click', () => {
        if (simulationPingInterval) {
            clearInterval(simulationPingInterval);
            simulationPingInterval = null;
        }
        currentMode = 2;
        modeOverlay.style.display = 'none';
        mode2Container.classList.add('active');
        renderMode2Grid();
        setInterval(() => {
            fetchLiveStatus().then(() => renderMode2Grid());
        }, 3000);
    });

    // --- Admin Settings ---
    adminBtn.addEventListener('click', async () => {
        const pwd = prompt("Instalacja Lidera - Podaj hasło admina:");
        if (!pwd) return;

        try {
            const testUrl = apiUrlInput.value.trim() || apiUrl;
            const res = await fetch(`${testUrl}/api/verify_admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });

            if (res.ok) {
                verifiedAdminPassword = pwd;
                adminOverlay.style.display = 'flex';
                renderAdminMachineList();
            } else {
                alert("Odmowa dostępu: Nieprawidłowe hasło administratora.");
            }
        } catch (e) {
            // Fallback so tablet can change URL if completely disconnected
            if (pwd === "admin") {
                adminOverlay.style.display = 'flex';
                if(adminMachinesList) adminMachinesList.innerHTML = '<p style="color:#ef4444;">Serwer offline. Skonfiguruj poprawny URL i zapisz.</p>';
            } else {
                alert("Brak połączenia z serwerem i złe hasło trybu awaryjnego.");
            }
        }
    });

    closeAdminBtn.addEventListener('click', () => {
        adminOverlay.style.display = 'none';
        verifiedAdminPassword = null;
    });

    if (addMachineBtn) {
        addMachineBtn.addEventListener('click', () => {
            if (!adminMachinesList) return;
            const row = document.createElement('div');
            row.className = 'admin-row';
            row.style.display = 'flex'; row.style.gap = '10px'; row.style.marginBottom = '10px';
            row.innerHTML = `
                <input type="text" class="m-id" placeholder="ID (np. OP120)" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; margin: 0; min-width: 50px;">
                <input type="text" class="m-desc" placeholder="Opis (opcjonalny)" style="flex: 2; padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; margin: 0; min-width: 50px;">
                <button class="del-btn" style="background: #ef4444; color: white; border: none; padding: 0 15px; border-radius: 6px; cursor: pointer; font-weight: bold; margin: 0; width: auto;">X</button>
            `;
            row.querySelector('.del-btn').addEventListener('click', () => row.remove());
            adminMachinesList.appendChild(row);
        });
    }

    // Failures Appender function
    function createAdminFailureRow(f) {
        const row = document.createElement('div');
        row.className = 'admin-row admin-failure-row';
        row.style.display = 'flex'; row.style.gap = '10px'; row.style.marginBottom = '10px';
        row.innerHTML = `
            <input type="text" class="f-id" value="${f.id || ''}" placeholder="ID (np. 1)" style="flex: 0.5; padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; margin: 0; min-width: 40px;">
            <input type="text" class="f-desc" value="${f.desc || ''}" placeholder="Opis Usterki" style="flex: 2; padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; margin: 0; min-width: 50px;">
            <select class="f-sev" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; margin: 0; min-width: 80px;">
                <option value="low" ${f.severity === 'low' ? 'selected' : ''}>Niski</option>
                <option value="medium" ${f.severity === 'medium' ? 'selected' : ''}>Średni</option>
                <option value="high" ${f.severity === 'high' ? 'selected' : ''}>Wysoki</option>
            </select>
            <button class="del-btn" style="background: #ef4444; color: white; border: none; padding: 0 15px; border-radius: 6px; cursor: pointer; font-weight: bold; margin: 0; width: auto;">X</button>
        `;
        row.querySelector('.del-btn').addEventListener('click', () => row.remove());
        return row;
    }

    const adminFailuresList = document.getElementById('adminFailuresList');
    async function sendSimulationHeartbeats() {
        if (currentMode !== 1 || cachedMachines.length === 0) return;
        
        // Send pings for all machines in parallel to wake them up on the master board
        const pings = cachedMachines.map(m => {
            return fetch(`${apiUrl}/api/ping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ machine_id: m.id })
            }).catch(e => console.warn(`Failed simulation ping for ${m.id}`, e));
        });
        
        await Promise.all(pings);
        console.log("Simulation heartbeats sent for all machines.");
    }

    const addFailureBtn = document.getElementById('addFailureBtn');

    if (addFailureBtn) {
        addFailureBtn.addEventListener('click', () => {
             if (!adminFailuresList) return;
             // Suggest next ID based on current list length
             const nextId = adminFailuresList.querySelectorAll('.admin-failure-row').length + 1;
             const newRow = createAdminFailureRow({ id: nextId, desc: 'Nowa usterka', severity: 'medium' });
             adminFailuresList.appendChild(newRow);
        });
    }

    function renderAdminMachineList() {
        if (!adminMachinesList) return;
        adminMachinesList.innerHTML = '';
        cachedMachines.forEach(machine => {
            const row = document.createElement('div');
            row.className = 'admin-row';
            row.style.display = 'flex'; row.style.gap = '10px'; row.style.marginBottom = '10px';
            row.innerHTML = `
                <input type="text" class="m-id" value="${machine.id}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; margin: 0; min-width: 50px;">
                <input type="text" class="m-desc" value="${machine.desc || ''}" style="flex: 2; padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; margin: 0; min-width: 50px;">
                <button class="del-btn" style="background: #ef4444; color: white; border: none; padding: 0 15px; border-radius: 6px; cursor: pointer; font-weight: bold; margin: 0; width: auto;">X</button>
            `;
            row.querySelector('.del-btn').addEventListener('click', () => row.remove());
            adminMachinesList.appendChild(row);
        });
        
        if (adminFailuresList) {
             adminFailuresList.innerHTML = '';
             cachedFailures.forEach(f => {
                  adminFailuresList.appendChild(createAdminFailureRow(f));
             });
        }
    }

    // --- Admin Config Management (Simplified) ---
    adminBtn.addEventListener('click', () => {
        adminOverlay.style.display = 'flex';
    });

    closeAdminBtn.addEventListener('click', () => {
        adminOverlay.style.display = 'none';
    });

    saveAdminBtn.addEventListener('click', () => {
        const url = apiUrlInput.value.trim();
        if (url) {
            apiUrl = url.replace(/\/$/, ''); // remove trailing slash
            localStorage.setItem('leader_api_url', apiUrl);
            adminOverlay.style.display = 'none';
            alert("Adres URL zapisany. Panel zostanie odświeżony.");
            bootApp();
        } else {
            adminOverlay.style.display = 'none';
        }
    });

    // --- Core Application Loading ---
    async function bootApp() {
        await Promise.all([
            fetchMachines(),
            fetchFailures()
        ]);
        
        // Start polling for live statuses every 5 seconds
        fetchLiveStatus();
        setInterval(fetchLiveStatus, 5000);
    }

    // --- Machine Grid Management ---
    let cachedMachines = [];
    async function fetchMachines() {
        try {
            const res = await fetch(`${apiUrl}/api/machines`);
            if (!res.ok) throw new Error("API Failure");
            cachedMachines = await res.json();
            renderMachineGrid();
        } catch (e) {
            console.error("Failed to load machines", e);
            machineGrid.innerHTML = '<div style="color:red; grid-column: 1/-1;">Brak połączenia z serwerem.</div>';
        }
    }

    function renderMachineGrid() {
        machineGrid.innerHTML = '';
        if (cachedMachines.length === 0) return;

        cachedMachines.forEach(machine => {
            const btn = document.createElement('button');
            btn.className = 'machine-btn';
            btn.textContent = machine.id;
            
            // 1. Check selections (Glow/Border - No background color change)
            if (machine.id === selectedMachineId) {
                btn.classList.add('selected');
            }

            // 2. Determine Status - Priority: Fault > Online > Offline
            const isFailing = activeFaultsGlobalList.some(f => f.machine_id === machine.id);
            const isOnline = !!connectedMachinesGlobal[machine.id];

            if (isFailing) {
                btn.classList.add('has-fault');
                btn.textContent += " 🚨";
            } else if (isOnline) {
                btn.classList.add('online');
            } else {
                btn.classList.add('offline');
            }

            btn.addEventListener('click', () => {
                if (selectedMachineId === machine.id) {
                    selectedMachineId = null;
                    errorSection.classList.add('disabled');
                    footerActionsBlock.style.display = 'none';
                } else {
                    selectedMachineId = machine.id;
                    errorSection.classList.remove('disabled');
                    const hasFault = activeFaultsGlobalList.some(f => f.machine_id === selectedMachineId);
                    footerActionsBlock.style.display = hasFault ? 'block' : 'none';
                }
                renderMachineGrid();
                renderFailuresGrid();
            });

            machineGrid.appendChild(btn);
        });
    }

    function enableErrorSection(mId) {
        errorSection.style.opacity = '1';
        errorSection.style.pointerEvents = 'auto';
        workerDisplay.textContent = `👷 Lider: ${leaderName} | Wybrano: ${mId}`;
        renderFailuresGrid(); // Re-render grid so the timer/active fault for this machine shows up
    }

    function disableErrorSection() {
        errorSection.style.opacity = '0.5';
        errorSection.style.pointerEvents = 'none';
        workerDisplay.textContent = `👷 Lider: ${leaderName}`;
    }

    // --- Failure Grid Management ---
    let cachedFailures = [];
    let localTimersInterval = null; // Global interval for ticking timers

    async function fetchFailures() {
        try {
            const res = await fetch(`${apiUrl}/api/failures`);
            if (res.ok) {
                cachedFailures = await res.json();
                renderFailuresGrid();
            }
        } catch(e) {
            console.error("Failed to load failures", e);
        }
    }

    function renderFailuresGrid() {
        failuresGrid.innerHTML = '';
        if (localTimersInterval) clearInterval(localTimersInterval);
        
        // Find ALL active faults for this machine
        let machineActiveFaults = [];
        if (selectedMachineId) {
            machineActiveFaults = activeFaultsGlobalList.filter(f => f.machine_id === selectedMachineId);
        }

        const timerElements = []; // To easily update all visible timers

        cachedFailures.forEach((fData) => {
            const btn = document.createElement('div');
            btn.className = 'failure-card';
            
            const rawDesc = fData.desc || "";
            let htmlContent = `<span>${fData.id}. ${rawDesc.replace(/\\n/g, '<br>')}</span>`;
            
            // Check if THIS specific failure code is active on this machine
            const thisFaultInfo = machineActiveFaults.find(f => f.code == fData.id);
            let isThisActive = !!thisFaultInfo;
            let startTimeStr = null;

            if (isThisActive) {
                startTimeStr = thisFaultInfo.start_time; // REAL start time from server
                btn.classList.add('active-fault');
                htmlContent += `<div class="fault-timer" data-start="${startTimeStr}">00:00:00</div>`;
            }
            
            btn.innerHTML = htmlContent;

            if (isThisActive) {
                timerElements.push(btn.querySelector('.fault-timer'));
            }

            btn.addEventListener('click', () => {
                if (!selectedMachineId) {
                    alert("Najpierw wybierz maszynę u góry!");
                    return;
                }
                
                if (isThisActive) {
                    // Resolve this specific active fault
                    sendMachineLog(selectedMachineId, fData.id, "STOP", fData.desc);
                } else {
                    // Start this specific new fault
                    sendMachineLog(selectedMachineId, fData.id, "START", fData.desc);
                }
            });

            failuresGrid.appendChild(btn);
        });

        // Ticker loop to update all visible active timers (mostly just 1)
        if (timerElements.length > 0 && currentMode === 1) {
            localTimersInterval = setInterval(() => {
                const now = new Date();
                timerElements.forEach(el => {
                    if (!el) return;
                    const start = new Date(el.dataset.start);
                    const diff = Math.floor((now - start) / 1000);
                    if (diff < 0) return;
                    
                    const h = Math.floor(diff / 3600);
                    const m = Math.floor((diff % 3600) / 60);
                    const s = diff % 60;
                    const f = n => n.toString().padStart(2, '0');
                    el.textContent = `${f(h)}:${f(m)}:${f(s)}`;
                });
            }, 1000);
            
            // Pre-tick immediately to avoid 1s delay
            const ev = new Event('timer_tick_mock');
            timerElements.forEach(el => {
                const now = new Date();
                const start = new Date(el.dataset.start);
                const diff = Math.floor((now - start) / 1000);
                if (diff < 0) return;
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;
                const f = n => n.toString().padStart(2, '0');
                el.textContent = `${f(h)}:${f(m)}:${f(s)}`;
            });
        }
    }

    // --- API Communication ---
    async function sendMachineLog(machineId, failureCode, actionString, desc) {
        const payload = {
            machine_id: machineId,
            worker_id: leaderName,
            code: failureCode,
            action: actionString,
            timestamp: new Date().toISOString(),
            desc: desc
        };

        try {
            const res = await fetch(`${apiUrl}/api/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Pulse screen effect
                document.body.style.backgroundColor = actionString === "START" ? "#450a0a" : "#064e3b";
                setTimeout(() => { document.body.style.backgroundColor = "#0f172a"; }, 300);
                
            // Refresh screens based on mode
            if (currentMode === 1) {
                // Immediately refresh state
                fetchLiveStatus();
                
                if(actionString === "START") {
                    console.log(`Awaria zgloszona! (${desc})`);
                    renderFailuresGrid();
                } else {
                    console.log("Awaria zakonczona.");
                    // After resolving ONE fault, we refresh but don't close EVERYTHING 
                    // unless there are NO MORE active faults for this machine.
                    await fetchLiveStatus(); 
                    const stillFailing = activeFaultsGlobalList.some(f => f.machine_id === selectedMachineId);
                    
                    if (!stillFailing) {
                        if (localTimersInterval) clearInterval(localTimersInterval);
                        failuresGrid.innerHTML = '<div style="text-align:center; color: #10b981; padding: 2rem; font-size: 1.2rem;">✅ Wszystkie awarie zakończone!</div>';
                        selectedMachineId = null;
                        errorSection.classList.add('disabled');
                        footerActionsBlock.style.display = 'none';
                        renderMachineGrid();
                    } else {
                        // Machine still has other active faults, so just refresh the grid for this machine
                        renderFailuresGrid();
                        renderMachineGrid();
                    }
                }
            } else if (currentMode === 2) {
                // Mode 2 specific refresh
                fetchLiveStatus().then(() => renderMode2Grid());
            }
            } else {
                alert("Błąd serwera. Raport NIE został wysłany.");
            }
        } catch (e) {
            alert("Brak połączenia radiowego/WiFi z serwerem Głównym!");
        }
    }

    // Green Resolve Button (Fallback for Mode 1)
    resolveBtn.addEventListener('click', () => {
        if (!selectedMachineId) return;
        
        const activeFault = activeFaultsGlobalList.find(f => f.machine_id === selectedMachineId);
        const faultCode = activeFault ? parseInt(activeFault.code) : null;
        const faultDesc = activeFault ? activeFault.desc : "Resolved by Leader";
        
        if (!faultCode) {
            alert("Nie znaleziono aktywnej awarii dla tej maszyny.");
            return;
        }
        // No confirm dialog - direct action with visual feedback
        resolveBtn.textContent = "⏳ Zatrzymywanie...";
        resolveBtn.disabled = true;
        sendMachineLog(selectedMachineId, faultCode, "STOP", faultDesc).finally(() => {
            resolveBtn.innerHTML = '<span class="icon">✅</span> ZAKOŃCZ AWARIĘ WYBRANEJ MASZYNY';
            resolveBtn.disabled = false;
        });
    });

    // --- Live Status Syncing ---
    async function fetchLiveStatus() {
        if (!apiUrl) return;
        
        try {
            const res = await fetch(`${apiUrl}/api/live`);
            if (res.ok) {
                const data = await res.json();
                activeFaultsGlobalList = data.active_faults || [];
                connectedMachinesGlobal = data.connected_machines || {};
                
                // Re-render grids to apply active effects immediately upon ping receive
                if (currentMode === 1) {
                    if (cachedMachines.length > 0) renderMachineGrid();
                    if (selectedMachineId) renderFailuresGrid(); 
                }
            }
        } catch (e) {
            // silent fail on poll
        }
    }

    // --- Mode 2 (Admin Dashboard) Rendering ---
    let mode2TimersInterval = null;
    function renderMode2Grid() {
        if (currentMode !== 2) return;
        activeAlertsGrid.innerHTML = '';
        if (mode2TimersInterval) clearInterval(mode2TimersInterval);

        // Always show ALL machines from master list
        const machinesToRender = cachedMachines.length > 0 ? cachedMachines : [];

        if (machinesToRender.length === 0) {
            activeAlertsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 1.2rem; padding: 3rem;">⏳ Ładowanie maszyn...</div>';
            fetchMachines().then(() => renderMode2Grid());
            return;
        }

        const timerElements = [];

        machinesToRender.forEach(machine => {
            const fault = activeFaultsGlobalList.find(f => f.machine_id === machine.id);
            const card = document.createElement('div');

            if (fault) {
                // RED card – active fault
                card.className = 'm2-card m2-card-fault';
                card.innerHTML = `
                    <div class="m2-machine-title">🔴 ${machine.id}</div>
                    <div style="font-size: 0.9rem; color: #fecaca;">Usterka: ${fault.desc}</div>
                    <div class="m2-timer" data-start="${fault.start_time}">00:00:00</div>
                    <button class="m2-resolve-btn">✅ ZAKOŃCZ AWARIĘ</button>
                `;
                timerElements.push(card.querySelector('.m2-timer'));
                card.querySelector('.m2-resolve-btn').addEventListener('click', () => {
                    const faultCode = parseInt(fault.code);
                    if (isNaN(faultCode)) {
                        alert("Nie można odczytać kodu awarii.");
                        return;
                    }
                    sendMachineLog(fault.machine_id, faultCode, "STOP", fault.desc);
                });
            } else {
                // GREEN card – machine OK
                card.className = 'm2-card m2-card-ok';
                card.innerHTML = `
                    <div class="m2-machine-title">🟢 ${machine.id}</div>
                    <div style="font-size: 0.85rem; color: #4ade80; margin-top: 0.25rem;">Sprawna ✅</div>
                `;
            }

            activeAlertsGrid.appendChild(card);
        });

        // Mode 2 Ticker Loop
        if (timerElements.length > 0) {
            mode2TimersInterval = setInterval(() => {
                const now = new Date();
                timerElements.forEach(el => {
                    if (!el) return;
                    const start = new Date(el.dataset.start);
                    const diff = Math.floor((now - start) / 1000);
                    if (diff < 0) return;
                    const h = Math.floor(diff / 3600);
                    const m = Math.floor((diff % 3600) / 60);
                    const s = diff % 60;
                    const f = n => n.toString().padStart(2, '0');
                    el.textContent = `${f(h)}:${f(m)}:${f(s)}`;
                });
            }, 1000);
            
            // pre-tick
            const now = new Date();
            timerElements.forEach(el => {
                const start = new Date(el.dataset.start);
                const diff = Math.floor((now - start) / 1000);
                if (diff < 0) return;
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;
                const f = n => n.toString().padStart(2, '0');
                el.textContent = `${f(h)}:${f(m)}:${f(s)}`;
            });
        }
    }
});
