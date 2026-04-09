// ============================================================
//  GeoTrack UZ — Core App Logic (Backend-Integrated)
// ============================================================

// ── SMS Feature (Eskiz UZ) ────────────────────────────────────
async function sendSms(phone) {
    if (!phone) {
        showToast('Worker has no phone number configured!', 'breach');
        return;
    }
    const msg = prompt(`SMS to ${phone}:`, 'Please return to your assigned zone immediately.');
    if (!msg) return;

    showToast('Sending SMS…', 'info');
    try {
        const r = await fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message: msg })
        });
        const data = await r.json();
        if (data.ok) {
            showToast(`✅ SMS sent to ${phone}`, 'success');
        } else {
            showToast('SMS failed: ' + (data.error || 'Unknown error'), 'breach');
        }
    } catch (e) {
        showToast('SMS error: ' + e.message, 'breach');
    }
}


// ── Page Navigation ──────────────────────────────────────
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const page = document.getElementById(`page-${name}`);
    if (page) page.classList.add('active');
    const btn = document.getElementById(`nb-${name}`);
    if (btn) btn.classList.add('active');
    state.currentPage = name;

    if (name === 'dashboard') {
        setTimeout(() => mainMap?.invalidateSize(), 100);
    }
    if (name === 'history') {
        setTimeout(() => histMap?.invalidateSize(), 100);
        const player = document.getElementById('history-player');
        if (!player || player.style.display !== 'flex') {
            closeHistoryPlayer();
        }
    }

    if (name === 'workers') renderWorkerTable();
    if (name === 'zones') renderZones();
    if (name === 'alerts') renderAlerts();
    if (name === 'analytics') renderAnalytics();
    if (name === 'shifts') renderShifts();
    if (name === 'history') initHistory();
    if (name === 'settings') renderSettings();
    if (name === 'alerts') { state.newAlerts = 0; updateAlertBadge(); }
}

function updateAlertBadge() {
    const badge = document.getElementById('alert-badge');
    if (badge) { badge.textContent = state.newAlerts; badge.style.display = state.newAlerts ? 'inline' : 'none'; }
}

function updateDashStats() {
    const online = workers.filter(w => w.status === 'online').length;
    const breaching = workers.filter(w => w.breaching).length;
    const avgSpeed = workers.filter(w => w.status === 'online').reduce((s, w) => s + w.speed, 0) / Math.max(1, online);
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('m-online', online); el('m-breach', breaching); el('m-zones', zones.length);
    el('m-speed', avgSpeed.toFixed(0));
}

function updateOnlineCount() {
    const n = workers.filter(w => w.status === 'online').length;
    const el = document.getElementById('online-count');
    if (el) el.textContent = n;
}

function updateBanners() {
    const breaches = workers.filter(w => w.breaching);
    const banner = document.getElementById('breachBanner');
    if (!banner) return;
    if (breaches.length > 0) {
        banner.classList.add('show');
        document.getElementById('breachBannerText').textContent =
            `⚠ ${breaches.map(w => w.name).join(', ')} ${breaches.length === 1 ? 'is' : 'are'} outside assigned zone!`;
    } else {
        banner.classList.remove('show');
    }
}

// ── Event Log ─────────────────────────────────────────────
function addEvent(type, name, desc) {
    const log = document.getElementById('eventLog');
    if (!log) return;
    const item = document.createElement('div');
    item.className = `event-item ${type}`;
    item.innerHTML = `<div class="event-name">${name}</div><div class="event-desc">${desc}</div><div class="event-time">${fmtTime(Date.now())}</div>`;
    log.insertBefore(item, log.firstChild);
    const cnt = document.getElementById('event-count');
    if (cnt) cnt.textContent = Math.min(50, log.children.length);
    while (log.children.length > 50) log.removeChild(log.lastChild);
}

// ── Toasts ────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ── Modals ────────────────────────────────────────────────
function openModal(id) {
    document.getElementById('modalOverlay').classList.add('show');
    document.getElementById(id).classList.add('show');
}
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
}

// ── Add Worker (via API) ──────────────────────────────────
function openAddWorker() {
    const sel = document.getElementById('aw-zone');
    if (sel) sel.innerHTML = zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
    openModal('addWorkerModal');
}

async function addWorker() {
    const name = document.getElementById('aw-name').value.trim();
    const role = document.getElementById('aw-role').value.trim();
    const phone = document.getElementById('aw-phone').value.trim();
    const zoneId = document.getElementById('aw-zone').value;
    if (!name) { showToast('Please enter worker name', 'breach'); return; }
    try {
        const w = await apiAddWorker({
            name, role: role || 'Field Agent', phone, zone: zoneId,
            color: COLORS[workers.length % COLORS.length]
        });
        closeModal();
        showToast(`✅ ${w.name} added`, 'success');
    } catch (e) { showToast('Failed to add worker: ' + e.message, 'breach'); }
}

async function removeWorker(id) {
    const w = getWorker(id);
    try {
        await apiRemoveWorker(id);
        showToast(`Removed ${w?.name || id}`, 'info');
        if (state.currentPage === 'workers') renderWorkerTable();
    } catch (e) { showToast('Failed to remove worker', 'breach'); }
}

function openEditLocationModal(id, lat, lng) {
    document.getElementById('el-worker-id').value = id;
    document.getElementById('el-lat').value = lat;
    document.getElementById('el-lng').value = lng;
    openModal('editLocationModal');
}

async function submitEditLocation() {
    const id = document.getElementById('el-worker-id').value;
    const lat = parseFloat(document.getElementById('el-lat').value);
    const lng = parseFloat(document.getElementById('el-lng').value);

    if (!id || isNaN(lat) || isNaN(lng)) {
        showToast('Invalid coordinates', 'breach');
        return;
    }

    try {
        await apiEditLocation(id, lat, lng);
        closeModal();
        showToast('GPS Location pushed successfully', 'success');
    } catch (e) {
        showToast('Failed to update GPS: ' + e.message, 'breach');
    }
}

// ── Assign Zone (via UI) ──────────────────────────────────
function openAssignZoneModal(workerId) {
    const w = getWorker(workerId);
    if (!w) return;
    document.getElementById('az-worker-id').value = workerId;
    document.getElementById('az-worker-name').textContent = w.name;
    const sel = document.getElementById('az-zone-sel');
    sel.innerHTML = '<option value="">— No Zone —</option>' +
        zones.map(z => `<option value="${z.id}" ${w.zone === z.id ? 'selected' : ''}>${z.name}</option>`).join('');
    openModal('assignZoneModal');
}

// ── Edit Phone Number ──────────────────────────────────────
function openEditPhoneModal(workerId, currentPhone) {
    const w = getWorker(workerId);
    if (!w) return;
    document.getElementById('ep-worker-id').value = workerId;
    document.getElementById('ep-worker-name').textContent = w.name;
    document.getElementById('ep-phone').value = currentPhone || '';
    openModal('editPhoneModal');
}

async function submitEditPhone() {
    const id = document.getElementById('ep-worker-id').value;
    const phone = document.getElementById('ep-phone').value.trim();
    const w = getWorker(id);
    if (!w) return;
    try {
        const r = await fetch(`/api/workers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        if (!r.ok) throw new Error('Server error');
        w.phone = phone;          // update local state immediately
        closeModal();
        renderWorkerTable();
        showToast(`📞 Phone updated for ${w.name}`, 'success');
    } catch (e) {
        showToast('Failed to update phone: ' + e.message, 'breach');
    }
}

async function submitAssignZone() {
    const id = document.getElementById('az-worker-id').value;
    const zoneId = document.getElementById('az-zone-sel').value;
    const w = getWorker(id);
    if (!w) return;
    try {
        // Merge existing worker data with new zone
        await apiUpdateWorker(id, { ...w, zone: zoneId || null });
        const z = zones.find(z => z.id === zoneId);
        showToast(`${w.name} assigned to ${z ? z.name : 'No Zone'}`, 'success');
        closeModal();
        if (state.currentPage === 'workers') renderWorkerTable();
    } catch (e) {
        showToast('Failed to update zone: ' + e.message, 'breach');
    }
}

// ── Add Zone (via API) ────────────────────────────────────
function openAddZone() {
    state.selectedZoneColor = '#1d4ed8';
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === state.selectedZoneColor));
    openModal('addZoneModal');
}
function selectColor(el) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedZoneColor = el.dataset.color;
}
async function addZone() {
    const name = document.getElementById('az-name').value.trim();
    const lat = parseFloat(document.getElementById('az-lat').value) || 41.29;
    const lng = parseFloat(document.getElementById('az-lng').value) || 69.24;
    const rad = parseInt(document.getElementById('az-rad').value) || 500;
    if (!name) { showToast('Please enter zone name', 'breach'); return; }
    try {
        const z = await apiAddZone({ name, center: [lat, lng], radius: rad, color: state.selectedZoneColor });
        closeModal();
        showToast(`✅ Zone "${z.name}" created`, 'success');
        if (state.currentPage === 'zones') renderZones();
    } catch (e) { showToast('Failed to add zone', 'breach'); }
}

// ── Worker Detail Card ─────────────────────────────────────
function showWorkerDetail(workerId) {
    const w = getWorker(workerId);
    if (!w) return;
    state.selectedWorker = workerId;
    const card = document.getElementById('workerDetailCard');
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    const el = id => document.getElementById(id);
    el('wdc-avatar').textContent = initials(w.name);
    el('wdc-avatar').style.background = w.color;
    set('wdc-name', w.name); set('wdc-role', w.role);
    set('wdc-speed', w.speed.toFixed(0));
    set('wdc-battery', Math.floor(w.battery) + '%');
    el('wdc-bat-fill').style.width = w.battery + '%';
    el('wdc-bat-fill').style.background = batColor(w.battery);
    const z = workerZone(w);
    set('wdc-zone', z ? z.name : '—');
    set('wdc-status', w.breaching ? '⚠ Breach' : w.status === 'online' ? '● Online' : '○ Offline');
    card.classList.add('show');
}
function closeDetailCard() {
    document.getElementById('workerDetailCard').classList.remove('show');
    state.selectedWorker = null;
}
function goHistory() {
    const id = state.selectedWorker; closeDetailCard(); showPage('history');
    if (id) { const sel = document.getElementById('historyWorkerSel'); if (sel) { sel.value = id; loadHistory(); } }
}

// ── Export CSV ────────────────────────────────────────────
function exportCSV() {
    const headers = ['Name', 'Role', 'Zone', 'Status', 'Lat', 'Lng', 'Speed (km/h)', 'Battery %', 'Breaches'];
    const rows = workers.map(w => {
        const z = workerZone(w);
        return [w.name, w.role, z ? z.name : '—', w.status, w.lat.toFixed(6), w.lng.toFixed(6),
        w.speed.toFixed(1), Math.floor(w.battery), w.breachCount];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
        download: 'workers_' + new Date().toISOString().slice(0, 10) + '.csv'
    });
    a.click();
    showToast('CSV exported', 'success');
}

// ── Shifts (via API) ──────────────────────────────────────
async function startShift(wId) {
    try { await apiStartShift(wId); renderShifts(); showToast(`Shift started for ${getWorker(wId)?.name}`, 'success'); }
    catch (e) { showToast('Error starting shift', 'breach'); }
}
async function endShift(wId) {
    try { await apiEndShift(wId); renderShifts(); showToast(`Shift ended for ${getWorker(wId)?.name}`, 'info'); }
    catch (e) { showToast('Error ending shift', 'breach'); }
}
async function startAllShifts() {
    // Start shifts for ALL workers, not just online ones
    await Promise.allSettled(workers.map(w => apiStartShift(w.id)));
    showToast('All shifts started', 'success'); renderShifts();
}
async function endAllShifts() {
    const activeWorkers = workers.filter(w => shifts.some(s => s.workerId === w.id && s.active));
    if (!activeWorkers.length) { showToast('No active shifts to end', 'info'); return; }
    await Promise.allSettled(activeWorkers.map(w => apiEndShift(w.id)));
    showToast('All active shifts ended', 'info'); renderShifts();
}

// ── Alert Management ─────────────────────────────────────
async function clearAlerts() {
    try { await apiClearAlerts(); showToast('Alert history cleared', 'success'); }
    catch (e) { alerts.length = 0; state.newAlerts = 0; updateAlertBadge(); renderAlerts(); }
}

// ── Admin Management ──────────────────────────────────────
// inviteAdmin is the legacy entry point from the Team & Access section.
// Delegate to showAddUserModal which uses the real backend API.
function inviteAdmin() {
    showAddUserModal();
}

// ── Language Toggle ───────────────────────────────────────
const I18N = {
    'Russian (ru_RU)': { 'Dashboard': 'Главная', 'Workers': 'Сотрудники', 'Zones': 'Зоны', 'Alerts': 'События', 'Route History': 'История', 'Analytics': 'Аналитика', 'Shifts': 'Смены', 'Settings': 'Настройки' },
    'Uzbek (uz_UZ)': { 'Dashboard': 'Asosiy paneli', 'Workers': 'Xodimlar', 'Zones': 'Hududlar', 'Alerts': 'Bidlirishnomalar', 'Route History': 'Tarix', 'Analytics': 'Tahlil', 'Shifts': 'Smenalar', 'Settings': 'Sozlamalar' },
    'English': { 'Dashboard': 'Dashboard', 'Workers': 'Workers', 'Zones': 'Zones', 'Alerts': 'Alerts', 'Route History': 'Route History', 'Analytics': 'Analytics', 'Shifts': 'Shifts', 'Settings': 'Settings' }
};
function changeLanguage(sel) {
    const lang = sel.value;
    showToast(`Language set to ${lang}`, 'success');
    if (I18N[lang]) {
        ['dashboard', 'workers', 'zones', 'alerts', 'history', 'analytics', 'shifts', 'settings'].forEach(k => {
            const el = document.getElementById(`nb-${k}`);
            if (el) {
                const textNode = Array.from(el.childNodes).find(n => n.nodeType === 3); // Text node
                if (textNode) {
                    const key = k === 'history' ? 'Route History' : k.charAt(0).toUpperCase() + k.slice(1);
                    textNode.nodeValue = ' ' + I18N[lang][key];
                }
            }
        });
    }
}

// ── Dark Mode Toggle ──────────────────────────────────────
function toggleDarkMode(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        if (typeof mainTileLayer !== 'undefined' && mainTileLayer) mainTileLayer.setUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
        if (typeof histTileLayer !== 'undefined' && histTileLayer) histTileLayer.setUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
    } else {
        document.body.classList.remove('dark-mode');
        if (typeof mainTileLayer !== 'undefined' && mainTileLayer) mainTileLayer.setUrl('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
        if (typeof histTileLayer !== 'undefined' && histTileLayer) histTileLayer.setUrl('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
    }
}

// ── Route History UI States ────────────────────────────
function renderHistoryWorkers() {
    const grid = document.getElementById('historyWorkerGrid');
    if (!grid) return;
    grid.innerHTML = workers.map(w => {
        return `<div class="card zone-card card-hover" style="cursor:pointer;" onclick="openHistoryPlayer('${w.id}')">
          <div class="zone-card-header">
            <div class="zone-color-dot" style="background:${w.color}"></div>
            <div class="zone-name">${w.name}</div>
          </div>
          <div style="font-size:12px;color:var(--text3);margin-top:8px">${w.role}</div>
        </div>`;
    }).join('');
}

function openHistoryPlayer(workerId) {
    showPage('history');
    document.getElementById('history-selector').style.display = 'none';
    document.getElementById('history-player').style.display = 'flex';
    document.getElementById('historyWorkerSel').value = workerId;
    loadHistory();
}

function closeHistoryPlayer() {
    document.getElementById('history-player').style.display = 'none';
    document.getElementById('history-selector').style.display = 'block';
    renderHistoryWorkers();
}

// ── Server Status Check ───────────────────────────────────
async function checkServerStatus() {
    try {
        const h = await apiHealth();
        state.serverConnected = true;
        const dot = document.querySelector('.status-dot');
        if (dot) { dot.style.background = '#4ade80'; dot.title = `Server OK — DB: ${h.db ? 'MongoDB' : 'memory'}`; }
    } catch {
        state.serverConnected = false;
        const dot = document.querySelector('.status-dot');
        if (dot) { dot.style.background = '#ef4444'; dot.title = 'Server offline'; }
    }
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Set today in history date picker
    const hd = document.getElementById('historyDate');
    if (hd) hd.valueAsDate = new Date();

    // Connect to backend
    connectSocket();

    // Periodic health check
    setInterval(checkServerStatus, 15000);
    checkServerStatus();

    // Seed event log with welcome messages
    addEvent('info', 'System', 'GeoTrack UZ initialized');
    addEvent('info', 'System', 'Connecting to server…');

    // Render settings immediately (no server data needed)
    renderSettings();
});
