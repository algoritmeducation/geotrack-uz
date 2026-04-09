// ============================================================
//  GeoTrack UZ — Frontend State
//  Data is loaded from backend via Socket.IO 'init' event.
//  These arrays are kept in sync by api.js event handlers.
// ============================================================

const COLORS = ['#1d4ed8', '#a855f7', '#22c55e', '#f97316', '#ec4899', '#eab308', '#06b6d4', '#84cc16'];

// Live state arrays — populated by Socket.IO 'init' event
let workers = [];
let zones = [];
let alerts = [];
let shifts = [];
let shiftLog = [];

// App UI state
const state = {
  currentPage: 'dashboard',
  selectedWorker: null,
  historyWorker: null,
  historyPlaying: false,
  historySpeed: 1,
  historyIdx: 0,
  historyInterval: null,
  analyticsPeriod: 'today',
  showTrails: true,
  showZones: true,
  showLabels: true,
  admins: [{ name: 'Admin', username: 'admin', role: 'Super Admin', active: true }],
  selectedZoneColor: '#1d4ed8',
  newAlerts: 0,
  serverConnected: false,
};

// ── Helpers ───────────────────────────────────────────────
function getWorker(id) { return workers.find(w => w.id === id); }
function getZone(id) { return zones.find(z => z.id === id); }
function workerZone(w) { return getZone(w.zone); }
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function relTime(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  return `${Math.floor(d / 3600000)}h ago`;
}
function initials(name) { return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(); }
function batColor(pct) { return pct > 60 ? '#16a34a' : pct > 30 ? '#d97706' : '#dc2626'; }
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function ptInCircle(lat, lng, clat, clng, rKm) { return haversine(lat, lng, clat, clng) <= rKm; }

// Called once Socket.IO 'init' has loaded all data
function onDataLoaded() {
  console.log(`✅ State loaded: ${workers.length} workers, ${zones.length} zones, ${alerts.length} alerts`);
  // Re-init map with loaded data
  if (typeof reinitMapMarkers === 'function') reinitMapMarkers();
  updateDashStats();
  updateOnlineCount();
  updateAlertBadge();
  if (state.currentPage !== 'dashboard') showPage(state.currentPage);
}

// Generate historical GPS trail for Route History page
function generateHistory(workerId) {
  const hist = (typeof apiHistCache !== 'undefined') ? apiHistCache[workerId] : null;
  if (hist && hist.length > 5) return hist;
  const w = getWorker(workerId);
  if (!w) return [];
  const z = workerZone(w);
  const points = [];
  let lat = z ? z.center[0] + (Math.random() - .5) * .003 : w.lat;
  let lng = z ? z.center[1] + (Math.random() - .5) * .003 : w.lng;
  for (let i = 0; i < 200; i++) {
    lat += (Math.random() - .5) * .0006;
    lng += (Math.random() - .5) * .0006;
    const speed = Math.random() * 55 + 3;
    const inZone = z ? ptInCircle(lat, lng, z.center[0], z.center[1], z.radius / 1000) : true;
    points.push({ lat, lng, speed, inZone, t: Date.now() - (200 - i) * 18000 });
  }
  return points;
}
