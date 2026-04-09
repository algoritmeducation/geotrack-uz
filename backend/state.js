// ============================================================
//  GeoTrack UZ — Shared In-Memory State
//  This is the single source of truth for the backend.
//  MongoDB syncs asynchronously; in-memory always works.
// ============================================================

const state = {
    dbAvailable: false,

    zones: [
        { id: 'z1', name: 'Yunusabad Office District', center: [41.337, 69.287], radius: 700, color: '#1d4ed8' },
        { id: 'z2', name: 'Mirabad Commercial Zone', center: [41.282, 69.266], radius: 650, color: '#a855f7' },
        { id: 'z3', name: 'Chilanzar Residential', center: [41.295, 69.220], radius: 800, color: '#22c55e' },
        { id: 'z4', name: 'Shaykhantakhur Industrial', center: [41.325, 69.240], radius: 550, color: '#f97316' },
    ],

    workers: [
        { id: 'w1', name: 'Alisher Nazarov', role: 'Senior Inspector', zone: 'z1', color: '#1d4ed8', lat: 41.3378, lng: 69.2875, battery: 85, status: 'online', speed: 0, trail: [], breaching: false, distance: 0, uptime: 92, breachCount: 1 },
        { id: 'w2', name: 'Dilnoza Yusupova', role: 'Field Agent', zone: 'z1', color: '#a855f7', lat: 41.3395, lng: 69.2895, battery: 72, status: 'online', speed: 0, trail: [], breaching: false, distance: 0, uptime: 88, breachCount: 2 },
        { id: 'w3', name: 'Bobur Rahimov', role: 'Technician', zone: 'z1', color: '#22c55e', lat: 41.3355, lng: 69.2845, battery: 91, status: 'online', speed: 0, trail: [], breaching: false, distance: 0, uptime: 95, breachCount: 0 },
        { id: 'w4', name: 'Kamola Tasheva', role: 'Supervisor', zone: 'z2', color: '#f97316', lat: 41.2825, lng: 69.2665, battery: 45, status: 'online', speed: 0, trail: [], breaching: false, distance: 0, uptime: 79, breachCount: 3 },
        { id: 'w5', name: 'Jahongir Umarov', role: 'Security Officer', zone: 'z2', color: '#ec4899', lat: 41.2848, lng: 69.2698, battery: 63, status: 'online', speed: 0, trail: [], breaching: false, distance: 0, uptime: 85, breachCount: 1 },
        { id: 'w6', name: 'Sarvinoz Ergasheva', role: 'Field Agent', zone: 'z3', color: '#eab308', lat: 41.2955, lng: 69.2205, battery: 78, status: 'online', speed: 0, trail: [], breaching: false, distance: 0, uptime: 91, breachCount: 0 },
        { id: 'w7', name: 'Mirzo Karimov', role: 'Inspector', zone: 'z3', color: '#06b6d4', lat: 41.2978, lng: 69.2238, battery: 55, status: 'offline', speed: 0, trail: [], breaching: false, distance: 0, uptime: 67, breachCount: 2 },
        { id: 'w8', name: 'Zulfiya Mirzayeva', role: 'Team Lead', zone: 'z4', color: '#84cc16', lat: 41.3252, lng: 69.2402, battery: 88, status: 'online', speed: 0, trail: [], breaching: false, distance: 0, uptime: 98, breachCount: 0 },
    ],

    alerts: [
        { id: 'a_seed1', type: 'info', worker: 'w1', zone: 'z1', msg: 'Alisher Nazarov — Shift started', ts: Date.now() - 3600000 },
        { id: 'a_seed2', type: 'info', worker: 'w3', zone: 'z1', msg: 'Bobur Rahimov — GPS device connected', ts: Date.now() - 3200000 },
        { id: 'a_seed3', type: 'breach', worker: 'w4', zone: 'z2', msg: 'Kamola Tasheva — Exited Mirabad Commercial Zone', ts: Date.now() - 2800000 },
        { id: 'a_seed4', type: 'return', worker: 'w4', zone: 'z2', msg: 'Kamola Tasheva — Returned to assigned zone', ts: Date.now() - 2750000 },
        { id: 'a_seed5', type: 'battery', worker: 'w4', zone: 'z2', msg: 'Kamola Tasheva — Battery below threshold (45%)', ts: Date.now() - 1800000 },
    ],

    shifts: [],
    shiftLog: [],
    locationHistory: {},   // workerId → [{lat,lng,speed,ts}]
    _alertIdCounter: 1000,

    // ── User Accounts ─────────────────────────────────────────
    users: [
        { id: 'u1', name: 'Super Admin', username: 'admin', password: 'admin123', role: 'admin', active: true },
        { id: 'u2', name: 'Dispatcher 1', username: 'dispatch1', password: 'dispatch123', role: 'dispatcher', active: true },
    ],
    _userIdCounter: 10,

    newAlert(type, workerId, zoneId, msg) {
        const alert = {
            id: 'a' + (++this._alertIdCounter),
            type, worker: workerId, zone: zoneId, msg, ts: Date.now()
        };
        this.alerts.unshift(alert);
        if (this.alerts.length > 500) this.alerts.pop();
        return alert;
    },

    addLocation(workerId, lat, lng, speed) {
        if (!this.locationHistory[workerId]) this.locationHistory[workerId] = [];
        this.locationHistory[workerId].push({ lat, lng, speed, ts: Date.now() });
        if (this.locationHistory[workerId].length > 200) this.locationHistory[workerId].shift();
    },
};

module.exports = state;
