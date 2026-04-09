// ============================================================
//  GeoTrack UZ — Frontend API & Socket.IO Client
// ============================================================
// Explicitly point to the Render backend (since frontend is on Vercel)
const BACKEND_URL = 'https://geotrack-uz.onrender.com';
const API_BASE = BACKEND_URL + '/api';

// ── REST Helpers ─────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
    const res = await fetch(API_BASE + path, {
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        ...opts,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
    return res.json();
}
const API = {
    get: path => apiFetch(path),
    post: (path, data) => apiFetch(path, { method: 'POST', body: data }),
    put: (path, data) => apiFetch(path, { method: 'PUT', body: data }),
    delete: path => apiFetch(path, { method: 'DELETE' }),
};

// ── Socket.IO Client ─────────────────────────────────────────
let socket = null;

function connectSocket() {
    if (typeof io === 'undefined') {
        console.warn('Socket.IO not loaded — falling back to polling');
        return;
    }
    // Connect to the explicit Render backend
    socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
        console.log('✅ Connected to GeoTrack server');
        addEvent('info', 'System', 'Connected to GeoTrack server');
        showToast('✅ Connected to server', 'success');
    });

    socket.on('disconnect', () => {
        console.warn('⚠️ Disconnected from server');
        showToast('⚠️ Server connection lost', 'breach');
    });

    // ── Real-time worker positions ──
    socket.on('workers:update', (serverWorkers) => {
        serverWorkers.forEach(sw => {
            const w = workers.find(w => w.id === sw.id);
            if (w) Object.assign(w, sw);
            else workers.push(sw);
        });
        // Remove workers no longer on server
        for (let i = workers.length - 1; i >= 0; i--) {
            if (!serverWorkers.find(sw => sw.id === workers[i].id)) workers.splice(i, 1);
        }
        updateMapMarkers();
        updateDashStats();
        updateOnlineCount();
        if (state.currentPage === 'workers') renderWorkerTable();
        if (state.currentPage === 'zones') renderZones();
    });

    // ── Initial state from server ──
    socket.on('init', (data) => {
        workers.length = 0; workers.push(...data.workers);
        zones.length = 0; zones.push(...data.zones);
        alerts.length = 0; alerts.push(...data.alerts);
        shifts.length = 0; shifts.push(...data.shifts);
        shiftLog.length = 0; shiftLog.push(...data.shiftLog);
        onDataLoaded();
    });

    // ── Breach / return alerts ──
    socket.on('breach', ({ worker: w, alert }) => {
        const local = workers.find(x => x.id === w.id);
        if (local) local.breaching = true;
        addEvent('breach', w.name, alert.msg);
        showToast(`🚨 ${w.name} breached zone!`, 'breach');
        updateBanners();
        state.newAlerts++;
        updateAlertBadge();
    });

    socket.on('return', ({ worker: w, alert }) => {
        const local = workers.find(x => x.id === w.id);
        if (local) local.breaching = false;
        addEvent('return', w.name, alert.msg);
        showToast(`✅ ${w.name} returned to zone`, 'success');
        updateBanners();
        state.newAlerts++;
        updateAlertBadge();
    });

    // ── New alert ──
    socket.on('new_alert', (alert) => {
        alerts.unshift(alert);
        state.newAlerts++;
        updateAlertBadge();
        if (state.currentPage === 'alerts') renderAlerts();
    });

    // ── Workers added / removed ──
    socket.on('worker:added', (w) => {
        if (!workers.find(x => x.id === w.id)) workers.push(w);
        addMarker(w);
    });

    socket.on('worker:removed', (id) => {
        const idx = workers.findIndex(w => w.id === id);
        if (idx >= 0) workers.splice(idx, 1);
        removeMarker(id);
    });

    // ── Zones ──
    socket.on('zone:added', (z) => { zones.push(z); addZoneCircle(z); });
    socket.on('zone:removed', (id) => { const i = zones.findIndex(z => z.id === id); if (i >= 0) zones.splice(i, 1); });

    // ── Shifts ──
    socket.on('shift:started', (sh) => { const i = shifts.findIndex(s => s.workerId === sh.workerId); if (i >= 0) shifts[i] = sh; else shifts.push(sh); });
    socket.on('shift:ended', ({ sh, log }) => { const i = shifts.findIndex(s => s.workerId === sh.workerId); if (i >= 0) shifts[i] = sh; shiftLog.unshift(log); });

    // ── Alerts cleared ──
    socket.on('alerts:cleared', () => { alerts.length = 0; state.newAlerts = 0; updateAlertBadge(); if (state.currentPage === 'alerts') renderAlerts(); });
}

// ── API Wrappers ────────────────────────────────────────────
async function apiAddWorker(data) { return API.post('/workers', data); }
async function apiRemoveWorker(id) { return API.delete(`/workers/${id}`); }
async function apiUpdateWorker(id, data) { return API.put(`/workers/${id}`, data); }
async function apiEditLocation(id, lat, lng) {
    const res = await fetch(`${API_BASE}/workers/${id}/location`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
    });
    return res.json();
}
async function apiAddZone(data) { return API.post('/zones', data); }
async function apiRemoveZone(id) { return API.delete(`/zones/${id}`); }
async function apiGetAlerts(q) { return API.get('/alerts' + (q ? '?' + q : '')); }
async function apiClearAlerts() { return API.delete('/alerts'); }
async function apiStartShift(wid) { return API.post('/shifts/start', { workerId: wid }); }
async function apiEndShift(wid) { return API.post('/shifts/end', { workerId: wid }); }
async function apiGetHistory(wid) { return API.get(`/locations/${wid}`); }
async function apiPushLocation(d) { return API.post('/locations/push', d); }
async function apiHealth() { return API.get('/health'); }
