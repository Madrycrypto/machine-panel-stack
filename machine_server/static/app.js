document.addEventListener('DOMContentLoaded', () => {
    // ---- State ----
    let machineId = localStorage.getItem('machineId');
    let workerName = localStorage.getItem('workerName');
    let failures = [];
    let activeFailures = []; // Array of { id, desc, workerId, localStartTime }
    let timerInterval = null;
    let shiftTimes = [];
    let resetDoneThisShift = {}; // track to avoid infinite restarts

    // ---- Elements ----
    const workerScreen = document.getElementById('worker-screen');
    const mainScreen = document.getElementById('main-screen');
    const adminScreen = document.getElementById('admin-screen');

    const workerScreenMachineId = document.getElementById('workerScreenMachineId');
    const workerNameInput = document.getElementById('workerNameInput');
    const startShiftBtn = document.getElementById('startShiftBtn');
    const workerAdminBtn = document.getElementById('workerAdminBtn');

    const displayClock = document.getElementById('displayClock');
    const displayDate = document.getElementById('displayDate');

    const currentWorkerNameDisplay = document.getElementById('currentWorkerNameDisplay');
    const logoutWorkerBtn = document.getElementById('logoutWorkerBtn');
    const failuresGrid = document.getElementById('failuresGrid');
    const adminBtn = document.getElementById('adminBtn');

    // Banner Elements
    const activeFailureBanner = document.getElementById('active-failure-banner');
    const activeFailureName = document.getElementById('activeFailureName');
    const activeFailureTimer = document.getElementById('activeFailureTimer');
    const stopFailureBtn = document.getElementById('stopFailureBtn');

    // Admin Elements
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const addFailureBtn = document.getElementById('addFailureBtn');
    const adminFailuresList = document.getElementById('adminFailuresList');
    const saveAdminBtn = document.getElementById('saveAdminBtn');
    const adminMachineIdInput = document.getElementById('adminMachineIdInput');

    // ---- Initialization ----
    updateClock();
    setInterval(updateClock, 1000);

    const params = new URLSearchParams(window.location.search);
    if (params.has('machine')) {
        machineId = params.get('machine');
        localStorage.setItem('machineId', machineId);
    }

    if (!machineId) {
        machineId = "Nieustawione";
    }

    // Pre-fill login form with previously used values (as convenience), but ALWAYS require confirmation
    if (workerNameInput && workerName) {
        workerNameInput.value = workerName;
    }
    if (adminMachineIdInput && machineId && machineId !== "Nieustawione") {
        adminMachineIdInput.value = machineId;
    }

    // Always clear session state and force login screen on page load
    workerName = null;
    localStorage.removeItem('workerName');

    fetchConfig().then(() => {
        showWorkerLogin();
    });

    // ---- Heartbeat & Sync Loop ----
    let pingTimeout = null;

    function scheduleNextPing() {
        if (pingTimeout) clearTimeout(pingTimeout);
        // Ping every 5s to ensure fast status updates and catch external changes
        const delay = 5000;
        pingTimeout = setTimeout(() => {
            syncStateAndPing();
            checkShiftTimes();
        }, delay);
    }

    function checkShiftTimes() {
        if (!workerName || shiftTimes.length === 0) return;
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        for (let timeCode of shiftTimes) {
            const [sh, sm] = timeCode.split(':').map(Number);
            if (currentHour === sh && currentMinute === sm) {
                const shiftKey = `${now.toDateString()}-${timeCode}`;
                if (!resetDoneThisShift[shiftKey]) {
                    resetDoneThisShift[shiftKey] = true;
                    logoutWorker();
                }
            }
        }
    }

    async function syncStateAndPing() {
        if (!machineId || machineId === "Nieustawione") {
             scheduleNextPing();
             return;
        }
        
        try {
            const res = await fetch('/api/ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ machine_id: machineId })
            });
            
            if (res.ok) {
                const data = await res.json();
                
                // --- EXTERNAL MULTI-FAULT SYNC ---
                const serverActiveFaults = data.active_faults || [];
                
                // 1. Detect if any local faults were resolved externally (not in serverActiveFaults)
                const sCodes = serverActiveFaults.map(f => String(f.id));
                const resolvedExternally = activeFailures.filter(f => !sCodes.includes(String(f.id)));
                
                if (resolvedExternally.length > 0) {
                    console.log("External resolution(s) detected. Updating local state.");
                    activeFailures = serverActiveFaults;
                    localStorage.setItem('activeFailures', JSON.stringify(activeFailures));
                    syncActiveFailuresUI();
                }
                
                // 2. Detect if any new faults were started externally
                const currentCodes = activeFailures.map(f => String(f.id));
                const newExternally = serverActiveFaults.filter(f => !currentCodes.includes(String(f.id)));
                
                if (newExternally.length > 0) {
                    console.log("External fault start(s) detected. Updating local state.");
                    activeFailures = serverActiveFaults;
                    localStorage.setItem('activeFailures', JSON.stringify(activeFailures));
                    syncActiveFailuresUI();
                }
            }
        } catch (e) {
            // Silently ignore network failures
        }
        
        scheduleNextPing();
    }
    
    // Start loop
    scheduleNextPing();

    async function fetchConfig() {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data.shift_times) {
                shiftTimes = data.shift_times.split(',').map(s => s.trim());
            }
        } catch (e) { console.error("Config fetch error", e); }
    }

    // ---- Event Listeners ----
    startShiftBtn.addEventListener('click', () => {
        const name = workerNameInput.value.trim();
        if (name) {
            workerName = name;
            localStorage.setItem('workerName', workerName);
            initMainApp();
        }
    });

    logoutWorkerBtn.addEventListener('click', logoutWorker);

    resetMachineBtn.addEventListener('click', () => {
        if (confirm('Usunąć tożsamość maszyny (Factory Reset)?')) {
            localStorage.removeItem('machineId');
            localStorage.removeItem('workerName');
            localStorage.removeItem('activeFailure');
            location.reload();
        }
    });

    stopFailureBtn.addEventListener('click', () => {
        // Fallback for UI if someone clicks the generic stop button: 
        // Resolve ALL active faults for this machine.
        activeFailures.forEach(f => stopSingleFault(f.id));
    });

    adminBtn.addEventListener('click', openAdminPanel);
    workerAdminBtn.addEventListener('click', openAdminPanel);

    closeAdminBtn.addEventListener('click', () => {
        // Return to where we came from depending on worker login state
        if (!workerName) showScreen(workerScreen);
        else showScreen(mainScreen);
    });

    addFailureBtn.addEventListener('click', () => {
        const row = createAdminRow({ id: Date.now(), desc: 'Nowy Błąd', severity: 'low' });
        adminFailuresList.appendChild(row);
    });

    saveAdminBtn.addEventListener('click', saveAdminSettings);

    // ---- Core Functions ----
    function showScreen(screenEl) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screenEl.classList.add('active');
    }

    function showWorkerLogin() {
        workerScreenMachineId.textContent = machineId;
        workerNameInput.value = '';
        showScreen(workerScreen);
    }

    function logoutWorker() {
        workerName = null;
        localStorage.removeItem('workerName');
        showWorkerLogin();
    }

    async function initMainApp() {
        showScreen(mainScreen);
        const machineBadge = document.getElementById('displayMachineId');
        if (machineBadge) machineBadge.textContent = machineId;
        currentWorkerNameDisplay.textContent = workerName;

        const savedFailuresText = localStorage.getItem('activeFailures');
        if (savedFailuresText) {
            activeFailures = JSON.parse(savedFailuresText);
            syncActiveFailuresUI();
        }

        try {
            const response = await fetch('/api/failures');
            failures = await response.json();
            renderGrid();
        } catch (error) {
            console.error('Błąd pobierania bazy awarii:', error);
            failuresGrid.innerHTML = '<p style="color:red">Brak połączenia z Master Serverem.</p>';
        }
    }

    function renderGrid() {
        failuresGrid.innerHTML = '';
        failures.forEach(fail => {
            const btn = document.createElement('div');
            btn.className = `failure-btn ${fail.severity || 'low'}`;
            btn.textContent = fail.desc;
            btn.onclick = () => startFailure(fail);
            failuresGrid.appendChild(btn);
        });
    }

    async function startFailure(fail) {
        // Prevent starting the same fault twice
        if (activeFailures.find(f => f.id === fail.id)) return;

        const now = new Date();
        const newFault = { ...fail, workerId: workerName, localStartTime: now.toISOString() };
        activeFailures.push(newFault);
        localStorage.setItem('activeFailures', JSON.stringify(activeFailures));

        syncActiveFailuresUI();

        try {
            await fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    machine_id: machineId,
                    worker_id: workerName,
                    code: newFault.id,
                    desc: newFault.desc,
                    action: "START",
                    timestamp: newFault.localStartTime
                })
            });
        } catch (err) { }
    }

    async function stopSingleFault(code, isExternal = false) {
        const idx = activeFailures.findIndex(f => String(f.id) === String(code));
        if (idx === -1) return;

        const fault = activeFailures[idx];
        const stopTime = new Date();

        activeFailures.splice(idx, 1);
        localStorage.setItem('activeFailures', JSON.stringify(activeFailures));
        syncActiveFailuresUI();

        if (!isExternal) {
            try {
                await fetch('/api/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        machine_id: machineId,
                        worker_id: fault.workerId,
                        code: fault.id,
                        desc: fault.desc,
                        action: "STOP",
                        timestamp: stopTime.toISOString()
                    })
                });
            } catch (err) { }
        }
        scheduleNextPing();
    }

    function syncActiveFailuresUI() {
        // Clear the banner container
        activeFailureBanner.innerHTML = '';
        if (activeFailures.length === 0) {
            activeFailureBanner.classList.add('hidden');
            if (timerInterval) clearInterval(timerInterval);
            return;
        }

        activeFailureBanner.classList.remove('hidden');

        activeFailures.forEach(f => {
            const row = document.createElement('div');
            row.className = 'failure-banner-row';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '10px';
            row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            
            row.innerHTML = `
                <div style="flex: 2; font-weight: bold; font-size: 1.2rem;">🚨 ${f.desc}</div>
                <div class="active-fault-timer" data-start="${f.localStartTime}" style="flex: 1; font-family: monospace; font-size: 1.5rem; text-align: center; color: #fbbf24;">00:00:00</div>
                <button class="resolve-single-btn" style="flex: 0.5; background: #10b981; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;">Zakończ</button>
            `;

            row.querySelector('.resolve-single-btn').addEventListener('click', () => stopSingleFault(f.id));
            activeFailureBanner.appendChild(row);
        });

        // Set up global timer tick if not running
        if (timerInterval) clearInterval(timerInterval);
        updateAllTimers();
        timerInterval = setInterval(updateAllTimers, 1000);
    }

    function updateAllTimers() {
        const now = new Date();
        const timerEls = document.querySelectorAll('.active-fault-timer');
        timerEls.forEach(el => {
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

    function updateClock() {
        if (!displayClock || !displayDate) return;
        const now = new Date();
        const f = n => n.toString().padStart(2, '0');
        displayClock.textContent = `${f(now.getHours())}:${f(now.getMinutes())}:${f(now.getSeconds())}`;

        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        displayDate.textContent = now.toLocaleDateString('en-US', dateOptions);
    }

    // ---- Admin Functions ----
    async function openAdminPanel() {
        const pwd = prompt("Instalacja wprowadzania awarii\\nPodaj hasło administratora (domyślnie 'admin'):");
        if (!pwd) return;

        try {
            const res = await fetch('/api/verify_admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });

            if (res.ok) {
                // Storing pwd temporarily just to validate when saving
                adminScreen.dataset.pwd = pwd;

                adminMachineIdInput.value = machineId === "Nieustawione" ? "" : machineId;

                adminFailuresList.innerHTML = '';
                failures.forEach(f => {
                    adminFailuresList.appendChild(createAdminRow(f));
                });

                showScreen(adminScreen);
            } else {
                alert("Odmowa dostępu: Nieprawidłowe hasło administratora.");
            }
        } catch (e) {
            alert("Brak połączenia z serwerem logowania.");
        }
    }

    function createAdminRow(f) {
        const div = document.createElement('div');
        div.className = 'admin-row';
        div.dataset.id = f.id;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = f.desc;

        const select = document.createElement('select');
        ['low', 'medium', 'high'].forEach(sev => {
            const opt = document.createElement('option');
            opt.value = sev; opt.textContent = sev;
            if (f.severity === sev) opt.selected = true;
            select.appendChild(opt);
        });

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Usuń';
        delBtn.onclick = () => div.remove();

        div.appendChild(input);
        div.appendChild(select);
        div.appendChild(delBtn);
        return div;
    }

    async function saveAdminSettings() {
        if (!adminScreen.dataset.pwd) {
            alert("Brak autoryzacji sesji. Zaloguj się ponownie.");
            return;
        }

        const newMachineId = adminMachineIdInput.value.trim() || 'Nieustawione';
        if (newMachineId !== machineId) {
            machineId = newMachineId;
            localStorage.setItem('machineId', machineId);
            displayMachineId.textContent = machineId;
            workerScreenMachineId.textContent = machineId;
        }

        const rows = adminFailuresList.querySelectorAll('.admin-row');
        const newFailures = Array.from(rows).map((row, idx) => ({
            id: parseInt(row.dataset.id) || (idx + 100),
            desc: row.querySelector('input').value,
            severity: row.querySelector('select').value
        }));

        try {
            const res = await fetch('/api/failures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: adminScreen.dataset.pwd,
                    failures: newFailures
                })
            });

            if (res.ok) {
                alert("Zapisano! Zmiany konfiguracji zastosowane pomyślnie.");
                failures = newFailures;
                renderGrid();
                adminScreen.dataset.pwd = ''; // wyczyszczenie hasla po save

                if (!workerName) showScreen(workerScreen);
                else showScreen(mainScreen);
            } else {
                alert("Odmowa zapisu. Złe lub wygasłe hasło administratora.");
            }
        } catch (err) {
            alert("Brak połączenia z serwerem Mistrza.");
        }
    }
});
