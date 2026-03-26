document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const masterClock = document.getElementById('masterClock');
    const totalDowntime = document.getElementById('totalDowntime');
    const totalFaults = document.getElementById('totalFaults');
    const triggerReportBtn = document.getElementById('triggerReportBtn');

    const activeFaultsCount = document.getElementById('activeFaultsCount');
    const activeFaultsGrid = document.getElementById('activeFaultsGrid');

    const machineOverviewGrid = document.getElementById('machineOverviewGrid');
    const ctx = document.getElementById('downtimeChart').getContext('2d');

    // Admin UI Elements
    const masterAdminBtn = document.getElementById('masterAdminBtn');
    const adminOverlay = document.getElementById('adminOverlay');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const addMachineBtn = document.getElementById('addMachineBtn');
    const adminMachinesList = document.getElementById('adminMachinesList');
    const saveAdminBtn = document.getElementById('saveAdminBtn');

    // Alarm UI
    const alarmToggleBtn = document.getElementById('alarmToggleBtn');

    // Internal State
    let activeFaultsData = [];
    let expectedMachinesData = [];
    let connectedMachinesData = {};
    let downtimeChartInstance = null;
    let verifiedAdminPassword = null;
    let isAlarmEnabled = false;
    let previousFaultCount = 0;

    // Audio Context (initialized on first interaction)
    let audioCtx = null;

    // Initialize Chart
    initChart();
    updateClock();
    setInterval(updateClock, 1000);

    // 5-second polling loop
    fetchLiveStats();
    setInterval(fetchLiveStats, 5000);

    // Recalculate physical counters every second so JS doesn't freeze between polls
    setInterval(updateActiveTimersOnScreen, 1000);

    triggerReportBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to send a forced report to Lark? / 您确定要向 Lark 发送强制报告吗？')) return;

        try {
            triggerReportBtn.textContent = "⏳ Generating AI Report... / ⏳ 正在生成 AI 报告...";
            triggerReportBtn.style.background = "#eab308";
            triggerReportBtn.disabled = true;

            const res = await fetch('/api/trigger_report', { method: 'POST' });
            if (res.ok) {
                alert("Success! Check Lark, the AI report will appear in approx. 10s. / 成功！检查 Lark，AI 反馈将在约10秒后显示。");
            } else {
                alert("Server error when triggering the report. / 触发报告时发生服务器错误。");
            }
        } catch (err) {
            alert("No communication with the master server. / 无法与主服务器通信。");
        } finally {
            triggerReportBtn.innerHTML = '<span class="btn-icon">✨</span><span class="btn-text">AI Report / AI 报告</span>';
            triggerReportBtn.style.background = "";
            triggerReportBtn.disabled = false;
        }
    });

    // --- Audio Alarm System ---
    alarmToggleBtn.addEventListener('click', () => {
        isAlarmEnabled = !isAlarmEnabled;
        if (isAlarmEnabled) {
            alarmToggleBtn.textContent = '🔊';
            alarmToggleBtn.style.color = '#ef4444'; // Make icon red
            playAlarmSound(true); // Short beep test
        } else {
            alarmToggleBtn.textContent = '🔕';
            alarmToggleBtn.style.color = '';
        }
    });

    function playAlarmSound(isTest = false) {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const playBeep = (freq, duration, delay) => {
            setTimeout(() => {
                const osc = audioCtx.createOscillator();
                const gainMap = audioCtx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

                gainMap.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainMap.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

                osc.connect(gainMap);
                gainMap.connect(audioCtx.destination);

                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            }, delay);
        };

        const playSiren = () => {
            const duration = 2.0; // 2 seconds per sweep
            const osc = audioCtx.createOscillator();
            const gainMap = audioCtx.createGain();

            osc.type = 'sawtooth';

            // Sweep frequency up and then down
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + duration / 2);
            osc.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + duration);

            // Volume Envelope
            gainMap.gain.setValueAtTime(0, audioCtx.currentTime);
            gainMap.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
            gainMap.gain.setValueAtTime(0.2, audioCtx.currentTime + duration - 0.1);
            gainMap.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

            osc.connect(gainMap);
            gainMap.connect(audioCtx.destination);

            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + duration);
        };

        if (isTest) {
            playBeep(440, 0.2, 0); // Single gentle beep
        } else {
            // Urgent factory siren (plays 3 times)
            playSiren();
            setTimeout(playSiren, 2000);
            setTimeout(playSiren, 4000);
        }
    }

    // --------------------------------

    function updateClock() {
        const now = new Date();
        const f = n => n.toString().padStart(2, '0');
        masterClock.textContent = `${f(now.getHours())}:${f(now.getMinutes())}:${f(now.getSeconds())}`;

        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('masterDate').textContent = now.toLocaleDateString('en-US', dateOptions);
    }

    async function fetchLiveStats() {
        try {
            const res = await fetch('/api/live');
            const data = await res.json();

            // Update Top Row Stats
            totalDowntime.innerHTML = `${data.daily_stats.total_downtime_minutes} <span class="unit">min</span>`;
            totalFaults.textContent = data.daily_stats.total_faults;

            // Update active faults data structure
            activeFaultsData = data.active_faults || [];
            expectedMachinesData = data.expected_machines || [];
            connectedMachinesData = data.connected_machines || {};
            const topFailures = data.top_daily_failures || [];

            // Sound Alarm Trigger Check
            const currentFaultCount = activeFaultsData.length;
            if (currentFaultCount > previousFaultCount && isAlarmEnabled) {
                playAlarmSound(false);
            }
            previousFaultCount = currentFaultCount;

            renderActiveFaults();
            renderMachineOverview();
            updateChartBar(topFailures);

        } catch (e) {
            console.error('Error refreshing stats / 刷新统计数据时出错', e);
        }
    }

    function renderActiveFaults() {
        // Clear grid entirely
        activeFaultsGrid.innerHTML = '';

        activeFaultsCount.textContent = `${activeFaultsData.length} active alerts / 个活动警报`;

        if (activeFaultsData.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = "✅ The production line is running smoothly. / 生产线运行正常。";
            empty.style.display = 'block';
            activeFaultsGrid.appendChild(empty);
            return;
        }

        // Render cards
        activeFaultsData.forEach(fault => {
            const card = document.createElement('div');
            card.className = 'fault-card';

            // Use the REAL start time from server for the visual timer
            const startD = new Date(fault.start_time);
            fault.internalStartDate = startD; 

            // Unique ID per machine + fault code to avoid collisions during multi-alerts
            const uniqueTimerId = `timer-${fault.machine_id}-${fault.code}`;

            // Layout
            card.innerHTML = `
                <div class="fault-header">
                    <span class="fault-machine">${fault.machine_id}</span>
                    <span class="fault-worker">👷 ${fault.worker_id}</span>
                </div>
                <div class="fault-desc">${fault.desc && fault.desc !== 'null' ? fault.desc : '—'}</div>
                <div class="fault-timer" id="${uniqueTimerId}">00:00:00</div>
                <div class="fault-footer">
                    <span>Fault Reported: / 故障报告时间：</span>
                    <span>${formatTime(startD)}</span>
                </div>
            `;
            activeFaultsGrid.appendChild(card);
        });

        // Prime the timers instantly
        updateActiveTimersOnScreen();
    }

    function formatTime(dateObj) {
        const f = n => n.toString().padStart(2, '0');
        return `${f(dateObj.getHours())}:${f(dateObj.getMinutes())}:${f(dateObj.getSeconds())}`;
    }

    function updateActiveTimersOnScreen() {
        const now = new Date();
        activeFaultsData.forEach(fault => {
            const uniqueTimerId = `timer-${fault.machine_id}-${fault.code}`;
            const timerEl = document.getElementById(uniqueTimerId);
            if (timerEl && fault.internalStartDate) {
                let diff = Math.floor((now - fault.internalStartDate) / 1000);
                // Guard: if diff is negative (clock skew / timezone mismatch), show 0
                if (diff < 0) diff = 0;
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;

                const f = n => n.toString().padStart(2, '0');
                timerEl.textContent = `${f(h)}:${f(m)}:${f(s)}`;
            }
        });
    }

    function renderMachineOverview() {
        machineOverviewGrid.innerHTML = '';
        const faultyMachineIds = activeFaultsData.map(f => f.machine_id);

        expectedMachinesData.forEach(machine => {
            const sq = document.createElement('div');
            sq.className = 'machine-square';

            // Name and description layout
            sq.innerHTML = `
                <div>${machine.id}</div>
                <div class="m-desc">${machine.desc || ""}</div>
            `;

            if (faultyMachineIds.includes(machine.id)) {
                sq.classList.add('error'); // Yellow Blinking
            } else if (connectedMachinesData[machine.id]) {
                sq.classList.add('connected'); // Solid Green
            } else {
                sq.classList.add('disconnected'); // Solid Red
            }

            machineOverviewGrid.appendChild(sq);
        });
    }

    // --- Admin Configurator Logic ---
    masterAdminBtn.addEventListener('click', async () => {
        const pwd = prompt("Admin Verification / 系统验证\nPlease enter the administrator password (default 'admin'):\n请输入管理员密码（默认为 'admin'）：");
        if (!pwd) return;

        try {
            const res = await fetch('/api/verify_admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });

            if (res.ok) {
                verifiedAdminPassword = pwd;
                adminOverlay.style.display = 'flex';
                renderAdminMachineList();
            } else {
                alert("Access Denied: Invalid administrator password. / 拒绝访问：管理员密码无效。");
            }
        } catch (e) {
            alert("Connection error with the login server. / 登录服务器连接错误。");
        }
    });

    closeAdminBtn.addEventListener('click', () => {
        adminOverlay.style.display = 'none';
        verifiedAdminPassword = null;
    });

    addMachineBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'admin-list-item';
        row.innerHTML = `
            <input type="text" class="admin-input m-id" placeholder="ID (e.g. OP120)" style="max-width: 120px;">
            <input type="text" class="admin-input m-desc" placeholder="Station Description / 工位描述">
            <button class="del-btn">X</button>
        `;
        row.querySelector('.del-btn').addEventListener('click', () => row.remove());
        adminMachinesList.appendChild(row);
    });

    function renderAdminMachineList() {
        adminMachinesList.innerHTML = '';
        expectedMachinesData.forEach(machine => {
            const row = document.createElement('div');
            row.className = 'admin-list-item';
            row.innerHTML = `
                <input type="text" class="admin-input m-id" value="${machine.id}" style="max-width: 120px;">
                <input type="text" class="admin-input m-desc" value="${machine.desc || ''}">
                <button class="del-btn">X</button>
            `;
            row.querySelector('.del-btn').addEventListener('click', () => row.remove());
            adminMachinesList.appendChild(row);
        });
    }

    saveAdminBtn.addEventListener('click', async () => {
        if (!verifiedAdminPassword) {
            alert("No permissions. Please log in again. / 没有权限。请重新登录。");
            return;
        }

        const rows = adminMachinesList.querySelectorAll('.admin-list-item');
        const newMachines = [];

        rows.forEach(r => {
            const idVal = r.querySelector('.m-id').value.trim();
            const descVal = r.querySelector('.m-desc').value.trim();
            if (idVal) {
                newMachines.push({ id: idVal, desc: descVal });
            }
        });

        saveAdminBtn.textContent = 'Saving... / 保存中...';
        saveAdminBtn.disabled = true;

        try {
            const res = await fetch('/api/machines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: verifiedAdminPassword, machines: newMachines })
            });

            if (res.ok) {
                alert("Done! Machines updated and visible in the grid. / 完成！机器已更新并在网格中可见。");
                verifiedAdminPassword = null;
                adminOverlay.style.display = 'none';
                fetchLiveStats(); // force immediate UI refresh
            } else {
                alert("Save error. Incorrect or expired administrator password. / 保存错误。管理员密码不正确或已过期。");
                verifiedAdminPassword = null;
                adminOverlay.style.display = 'none';
            }
        } catch (e) {
            alert("No communication with the master server. / 无法与主服务器通信。");
        } finally {
            saveAdminBtn.textContent = 'Save Changes / 保存更改';
            saveAdminBtn.disabled = false;
        }
    });

    function initChart() {
        downtimeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [], // Top 5 desc
                datasets: [{
                    label: 'Downtime (minutes) / 停机时间（分钟）',
                    data: [],
                    backgroundColor: 'rgba(230, 74, 25, 0.8)', // Orange-Red
                    borderColor: '#E64A19',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y', // Make it a horizontal bar chart!
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#f8fafc' }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 14 }
                        },
                        grid: { display: false }
                    }
                },
                animation: {
                    duration: 400
                }
            }
        });
    }

    function updateChartBar(topFailures) {
        if (!downtimeChartInstance) return;

        // Map data from database grouping
        const labels = topFailures.map(f => f.desc);
        const dataPoints = topFailures.map(f => f.duration_minutes);

        downtimeChartInstance.data.labels = labels;
        downtimeChartInstance.data.datasets[0].data = dataPoints;

        // Animate the update
        downtimeChartInstance.update();
    }
});
