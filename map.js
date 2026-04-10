// ═══════════════════════════════════════════════
//  GeoTrack UZ — Leaflet Map Module
// ═══════════════════════════════════════════════

let mainMap = null;
let histMap = null;
const markerMap = {};
const trailMap = {};
const zoneCircleMap = {};

let mainTileLayer = null;
let histTileLayer = null;

let isDrawingZone = false;

// ── INIT MAIN MAP ────────────────────────────
function initMap() {
    mainMap = L.map('map', { zoomControl: false, attributionControl: false }).setView([41.30, 69.25], 13);
    const style = document.body.classList.contains('dark-mode') ? 'dark_all' : 'light_all';
    mainTileLayer = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`, {
        maxZoom: 19, subdomains: 'abcd',
    }).addTo(mainMap);

    L.control.zoom({ position: 'bottomright' }).addTo(mainMap);

    mainMap.on('click', (e) => {
        if (isDrawingZone) {
            isDrawingZone = false;
            document.getElementById('map').style.cursor = '';
            document.getElementById('toggle-draw').classList.remove('on');
            openAddZone(); // Opens modal
            setTimeout(() => {
                document.getElementById('az-lat').value = e.latlng.lat.toFixed(5);
                document.getElementById('az-lng').value = e.latlng.lng.toFixed(5);
            }, 100);
        }
    });

    // Draw zones
    zones.forEach(z => addZoneCircle(z));

    // Add markers
    workers.forEach(w => addMarker(w));

    // Update stats
    updateDashStats();
}

function reinitMapMarkers() {
    if (!mainMap) return;

    // Remove existing
    Object.values(markerMap).forEach(m => mainMap.removeLayer(m));
    Object.values(trailMap).forEach(t => mainMap.removeLayer(t));
    Object.values(zoneCircleMap).forEach(c => mainMap.removeLayer(c));

    for (let k in markerMap) delete markerMap[k];
    for (let k in trailMap) delete trailMap[k];
    for (let k in zoneCircleMap) delete zoneCircleMap[k];

    // Add new
    zones.forEach(z => addZoneCircle(z));
    workers.forEach(w => addMarker(w));

    updateMapMarkers();
}

function startDrawZone(e) {
    if (e) e.stopPropagation();
    isDrawingZone = true;
    document.getElementById('map').style.cursor = 'crosshair';
    document.getElementById('toggle-draw').classList.add('on');
    showToast('Click anywhere on the map to set zone center', 'info');
}

// ── ZONE CIRCLES ─────────────────────────────
function addZoneCircle(z) {
    const circle = L.circle(z.center, {
        radius: z.radius,
        color: z.color,
        fillColor: z.color,
        fillOpacity: 0.07,
        weight: 1.5,
        dashArray: '6 4',
    }).addTo(mainMap);
    circle.bindTooltip(`<b>${z.name}</b>`, { permanent: false, className: 'worker-label' });
    zoneCircleMap[z.id] = circle;
}

// ── WORKER MARKERS ────────────────────────────
function addMarker(w) {
    const el = document.createElement('div');
    el.className = 'worker-marker';
    el.style.background = w.color;
    el.textContent = initials(w.name);
    el.title = w.name;

    const icon = L.divIcon({ html: el, iconSize: [30, 30], iconAnchor: [15, 15], className: '' });
    const marker = L.marker([w.lat, w.lng], { icon, zIndexOffset: 100 }).addTo(mainMap);

    marker.on('click', () => showWorkerDetail(w.id));
    markerMap[w.id] = marker;

    // Trail
    const trail = L.polyline([], { color: w.color, weight: 2, opacity: 0.5 }).addTo(mainMap);
    trailMap[w.id] = trail;
}

function removeMarker(id) {
    if (markerMap[id]) { mainMap.removeLayer(markerMap[id]); delete markerMap[id]; }
    if (trailMap[id]) { mainMap.removeLayer(trailMap[id]); delete trailMap[id]; }
}

// ── UPDATE MARKERS EACH TICK ──────────────────
function updateMapMarkers() {
    workers.forEach(w => {
        const marker = markerMap[w.id];
        if (!marker) return;
        marker.setLatLng([w.lat, w.lng]);

        // Update marker appearance
        const el = marker.getElement();
        if (el) {
            const inner = el.querySelector('.worker-marker');
            if (inner) {
                inner.classList.toggle('breach', w.breaching);
                inner.style.opacity = w.status === 'offline' ? '0.4' : '1';
                inner.style.transform = 'scale(1)';
            }
        }

        // Update trail
        const trail = trailMap[w.id];
        if (trail && state.showTrails && w.status === 'online') {
            trail.setLatLngs(w.trail);
        } else if (trail && !state.showTrails) {
            trail.setLatLngs([]);
        }
    });

    // Update zone visibility
    zones.forEach(z => {
        const c = zoneCircleMap[z.id];
        if (c) c.setStyle({ opacity: state.showZones ? 1 : 0, fillOpacity: state.showZones ? 0.07 : 0 });
    });

    // Update worker detail card if open
    if (state.selectedWorker) showWorkerDetail(state.selectedWorker);
}

// ── MAP LAYER TOGGLES ─────────────────────────
function toggleMapLayer(layer) {
    const btn = document.getElementById('toggle-' + layer);
    if (layer === 'trails') {
        state.showTrails = !state.showTrails;
        btn.classList.toggle('on', state.showTrails);
    } else if (layer === 'zones') {
        state.showZones = !state.showZones;
        btn.classList.toggle('on', state.showZones);
    } else if (layer === 'labels') {
        state.showLabels = !state.showLabels;
        btn.classList.toggle('on', state.showLabels);
    }
    updateMapMarkers();
}

// ── HISTORY MAP ───────────────────────────────
let histMarker = null;
let histTrail = null;
let histBreaches = [];
let histPoints = [];

function initHistory() {
    // Populate worker selector
    const sel = document.getElementById('historyWorkerSel');
    if (!sel) return;
    sel.innerHTML = workers.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

    if (!histMap) {
        histMap = L.map('history-map', { zoomControl: false, attributionControl: false }).setView([41.30, 69.25], 13);
        const style = document.body.classList.contains('dark-mode') ? 'dark_all' : 'light_all';
        histTileLayer = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`,
            { maxZoom: 19, subdomains: 'abcd' }).addTo(histMap);
        L.control.zoom({ position: 'bottomright' }).addTo(histMap);
    }

    loadHistory();
}

function loadHistory() {
    const sel = document.getElementById('historyWorkerSel');
    if (!sel) return;
    const wId = sel.value;

    // Stop any playback
    stopPlayback();
    state.historyIdx = 0;
    document.getElementById('timelineSlider').value = 0;

    histPoints = generateHistory(wId);

    // Draw zone circles on hist map
    if (histMap) {
        histMap.eachLayer(l => { if (l instanceof L.Circle || l instanceof L.Polyline || l instanceof L.Marker) histMap.removeLayer(l); });
        zones.forEach(z => L.circle(z.center, { radius: z.radius, color: z.color, fillColor: z.color, fillOpacity: 0.07, weight: 1.5, dashArray: '6 4' }).addTo(histMap));
    }

    // Draw full trail
    const w = getWorker(wId);
    if (histMap && w) {
        histTrail = L.polyline(histPoints.map(p => [p.lat, p.lng]), { color: w.color, weight: 2.5, opacity: 0.6 }).addTo(histMap);
        histMap.fitBounds(histTrail.getBounds(), { padding: [30, 30] });

        // Add breach markers
        histBreaches = [];
        histPoints.forEach((p, i) => {
            if (!p.inZone) {
                const bm = L.circleMarker([p.lat, p.lng], { radius: 5, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.8, weight: 2 }).addTo(histMap);
                bm.bindTooltip(`Breach at ${fmtTime(p.t)}`, { className: 'worker-label' });
                bm.on('click', () => scrubTo(i));
                histBreaches.push({ idx: i, ts: p.t });
            }
        });

        // Moving marker
        histMarker = L.circleMarker([histPoints[0].lat, histPoints[0].lng],
            { radius: 8, color: w.color, fillColor: w.color, fillOpacity: 1, weight: 2 }).addTo(histMap);
    }

    updateHistoryStats();
    renderHistoryChips();
}

function updateHistoryStats() {
    const idx = state.historyIdx;
    const pts = histPoints;
    if (!pts.length) return;

    // Distance up to idx
    let dist = 0;
    for (let i = 1; i <= idx; i++) dist += haversine(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
    const dur = Math.floor((pts[Math.min(idx, pts.length - 1)].t - pts[0].t) / 1000);
    const avgSpeed = pts.slice(0, idx + 1).reduce((s, p) => s + p.speed, 0) / Math.max(1, idx + 1);

    document.getElementById('h-dist').textContent = dist.toFixed(2) + ' km';
    document.getElementById('h-dur').textContent = `${Math.floor(dur / 60).toString().padStart(2, '0')}:${(dur % 60).toString().padStart(2, '0')}`;
    document.getElementById('h-speed').textContent = avgSpeed.toFixed(1) + ' km/h';
    document.getElementById('h-breaches').textContent = histBreaches.filter(b => b.idx <= idx).length;
    document.getElementById('historyTimeLabel').textContent = pts[idx] ? fmtTime(pts[idx].t) : '00:00:00';
}

function scrubTo(val) {
    state.historyIdx = parseInt(val);
    document.getElementById('timelineSlider').value = val;
    if (histPoints[val] && histMarker) histMarker.setLatLng([histPoints[val].lat, histPoints[val].lng]);
    updateHistoryStats();
}

function togglePlayback() {
    if (state.historyPlaying) stopPlayback();
    else startPlayback();
}
function startPlayback() {
    state.historyPlaying = true;
    document.getElementById('playBtn').textContent = '⏸';
    const interval = Math.max(50, 120 / state.historySpeed);
    state.historyInterval = setInterval(() => {
        if (state.historyIdx >= histPoints.length - 1) { stopPlayback(); return; }
        state.historyIdx++;
        scrubTo(state.historyIdx);
    }, interval);
}
function stopPlayback() {
    state.historyPlaying = false;
    document.getElementById('playBtn').textContent = '▶';
    clearInterval(state.historyInterval);
}
function setSpeed(s, btn) {
    stopPlayback();
    state.historySpeed = s;
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function renderHistoryChips() {
    const el = document.getElementById('historyEventChips');
    if (!el) return;
    el.innerHTML = histBreaches.length
        ? histBreaches.map(b => `<div class="event-chip breach-chip" onclick="scrubTo(${b.idx})">
        <div class="chip-label">🔴 Zone Breach</div>
        <div class="chip-time">${fmtTime(b.ts)}</div>
      </div>`).join('')
        : '<div style="color:var(--text3);font-size:12px">No breach events on this route</div>';
}

// ── BOOT MAP ──────────────────────────────────
window.addEventListener('load', () => {
    setTimeout(initMap, 100);
});
