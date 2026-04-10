// ═══════════════════════════════════════════════
//  GeoTrack UZ — Page Renderers
// ═══════════════════════════════════════════════

// ────────────────────────────────────────────────
//  WORKERS PAGE
// ────────────────────────────────────────────────
function renderWorkerTable() {
  const q = (document.getElementById('workerSearch')?.value || '').toLowerCase();
  const tbody = document.getElementById('workerTableBody');
  if (!tbody) return;

  const filtered = workers.filter(w => {
    if (q && !(w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q))) return false;
    if (zoneFilter !== 'all' && zoneFilter !== 'online' && zoneFilter !== 'breach') {
      if (w.zone !== zoneFilter) return false;
    }
    return true;
  });

  if (tbody.children.length !== filtered.length || tbody.dataset.q !== q || tbody.dataset.filter !== zoneFilter) {
    tbody.dataset.q = q;
    tbody.dataset.filter = zoneFilter;
    tbody.innerHTML = filtered.map(w => {
      const z = workerZone(w);
      const statusBadge = w.breaching ? 'badge-breach' : w.status === 'online' ? 'badge-online' : 'badge-offline';
      const statusText = w.breaching ? '<i data-lucide="alert-triangle" style="width:14px;display:inline-block;vertical-align:bottom"></i> Breach' : w.status === 'online' ? '● Online' : '○ Offline';
      const batFill = batColor(w.battery);
      return `<tr data-id="${w.id}">
        <td><div class="worker-cell">
          <div class="worker-avatar-sm" style="background:${w.color}">${initials(w.name)}</div>
          <div><div class="worker-cell-name">${w.name}</div><div class="worker-cell-role">${w.role}</div><button onclick="openEditPhoneModal('${w.id}','${w.phone || ''}')" title="Edit phone" style="font-size:10px;color:var(--text3);background:none;border:none;cursor:pointer;padding:0;text-align:left;text-decoration:underline dotted;">${w.phone || 'No phone'}</button></div>
        </div></td>
        <td>
          <button class="btn btn-secondary btn-sm" style="font-size:11px;min-width:0;padding:3px 8px;border-color:${z ? z.color + '60' : 'var(--gray-200)'};"
            onclick="openAssignZoneModal('${w.id}')" title="Change Zone">
            ${z ? `<span style="color:${z.color};font-weight:600">${z.name}</span>` : '<span style="color:var(--text3)">— No Zone</span>'}
          </button>
        </td>
        <td class="td-status"><span class="badge ${statusBadge}">${statusText}</span></td>
        <td class="td-coords"><span class="coords">${w.lat.toFixed(5)}, ${w.lng.toFixed(5)}</span></td>
        <td class="td-speed"><span style="color:var(--accent);font-weight:600">${w.speed.toFixed(1)}</span> km/h</td>
        <td class="td-battery">
          <div class="mini-bat-bar"><div class="mini-bat-fill" style="width:${w.battery}%;background:${batFill}"></div></div>
          <div class="mini-bat-pct">${Math.floor(w.battery)}%</div>
        </td>
        <td class="td-lastseen" style="color:var(--text3)">Just now</td>
        <td>
          <div style="display:flex;gap:5px">
            <button class="btn btn-secondary btn-sm" onclick="sendSms('${w.phone || ''}')" title="Send SMS"><i data-lucide="message-square" class="btn-icon"></i></button>
            <button class="btn btn-secondary btn-sm" onclick="openHistoryPlayer('${w.id}')"><i data-lucide="video" class="btn-icon"></i></button>
            <button class="btn btn-secondary btn-sm" onclick="openAssignZoneModal('${w.id}')" title="Assign Zone"><i data-lucide="map-pin" class="btn-icon"></i></button>
            <button class="btn btn-danger btn-sm" onclick="removeWorker('${w.id}')"><i data-lucide="x" class="btn-icon"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  } else {
    // Targeted updates to prevent DOM flicker
    filtered.forEach((w, i) => {
      const tr = tbody.children[i];
      if (!tr) return;
      const statusBadge = w.breaching ? 'badge-breach' : w.status === 'online' ? 'badge-online' : 'badge-offline';
      const statusText = w.breaching ? '<i data-lucide="alert-triangle" style="width:14px;display:inline-block;vertical-align:bottom"></i> Breach' : w.status === 'online' ? '● Online' : '○ Offline';
      const batFill = batColor(w.battery);
      tr.querySelector('.td-status').innerHTML = `<span class="badge ${statusBadge}">${statusText}</span>`;
      tr.querySelector('.td-coords').innerHTML = `<span class="coords">${w.lat.toFixed(5)}, ${w.lng.toFixed(5)}</span>`;
      tr.querySelector('.td-speed').innerHTML = `<span style="color:var(--accent);font-weight:600">${w.speed.toFixed(1)}</span> km/h`;
      tr.querySelector('.td-battery').innerHTML = `
          <div class="mini-bat-bar"><div class="mini-bat-fill" style="width:${w.battery}%;background:${batFill}"></div></div>
          <div class="mini-bat-pct">${Math.floor(w.battery)}%</div>`;
    });
  }

  // Zone filter chips
  const zf = document.getElementById('workerZoneFilter');
  if (zf && !zf.children.length) {
    zf.innerHTML = zones.map(z => `<button class="filter-btn" style="border-color:${z.color}30" onclick="filterByZone('${z.id}')">${z.name}</button>`).join('');
  }
}

function resetSearch() {
  const input = document.getElementById('workerSearch');
  if (input) input.value = '';
  renderWorkerTable();
}

function filterByZone(id) {
  const isUnselect = (zoneFilter === id);
  setZoneFilter(isUnselect ? 'all' : id);

  // Clear any existing text search when applying a zone filter directly
  const input = document.getElementById('workerSearch');
  if (input) input.value = '';

  // Update UI chips
  const zf = document.getElementById('workerZoneFilter');
  if (zf) {
    Array.from(zf.children).forEach(btn => {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text2)';
    });
    if (!isUnselect) {
      const activeBtn = Array.from(zf.children).find(b => b.innerText === zones.find(z => z.id === id)?.name);
      if (activeBtn) {
        const z = zones.find(x => x.id === id);
        activeBtn.style.background = z.color + '20';
        activeBtn.style.color = z.color;
      }
    }
  }

  renderWorkerTable();
}

// ────────────────────────────────────────────────
//  ZONES PAGE
// ────────────────────────────────────────────────
let zoneFilter = 'all';
function setZoneFilter(f, btn) {
  zoneFilter = f;
  document.querySelectorAll('.zone-filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderZones();
}

function renderZones() {
  const q = (document.getElementById('zoneSearch')?.value || '').toLowerCase();
  const grid = document.getElementById('zonesGrid');
  if (!grid) return;
  updateBanners();

  const filteredZones = zones.filter(z => {
    if (q && !z.name.toLowerCase().includes(q)) return false;
    const zWorkers = workers.filter(w => w.zone === z.id);
    if (zoneFilter === 'breach') return zWorkers.some(w => w.breaching);
    if (zoneFilter === 'online') return zWorkers.some(w => w.status === 'online');
    return true;
  });

  grid.innerHTML = filteredZones.map(z => {
    const zw = workers.filter(w => w.zone === z.id);
    const online = zw.filter(w => w.status === 'online').length;
    const breach = zw.filter(w => w.breaching).length;
    const chips = zw.map(w => `
      <div class="worker-chip ${w.breaching ? 'breach-chip' : ''}">
        <div class="chip-dot" style="background:${w.color}"></div>${w.name.split(' ')[0]}
      </div>`).join('');
    return `<div class="card zone-card card-hover">
      <div class="zone-card-header">
        <div class="zone-color-dot" style="background:${z.color}"></div>
        <div class="zone-name">${z.name}</div>
        ${breach ? `<span class="badge badge-breach" style="margin-left:auto">⚠ ${breach} Breach${breach > 1 ? 'es' : ''}</span>` : ''}
        <button class="btn btn-danger btn-sm" style="padding:4px; margin-left:${breach ? '8px' : 'auto'};" onclick="removeZone('${z.id}')" title="Delete Zone"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
      </div>
      <div class="zone-stats">
        <div class="zone-stat"><div class="val">${zw.length}</div><div class="lbl">Workers</div></div>
        <div class="zone-stat"><div class="val" style="color:var(--success)">${online}</div><div class="lbl">Online</div></div>
        <div class="zone-stat"><div class="val" style="color:var(--danger)">${breach}</div><div class="lbl">Breach</div></div>
      </div>
    </div>`;
  }).join('');

  if (grid.dataset.html === html) return; // Prevent flickering and DOM destruction!
  grid.dataset.html = html;

  grid.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

// ────────────────────────────────────────────────
//  ALERTS PAGE
// ────────────────────────────────────────────────
let alertFilter = 'all';
function setAlertFilter(f, btn) {
  alertFilter = f;
  document.querySelectorAll('.alert-filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAlerts();
}

function renderAlerts() {
  const list = document.getElementById('alertsList');
  if (!list) return;

  const fAlerts = state.alerts.filter(a => {
    if (alertFilter === 'all') return true;
    return a.type === alertFilter;
  });
  const icons = { breach: 'alert-triangle', return: 'check-circle', info: 'info', battery: 'battery' };
  const labels = { breach: 'Zone Breach', return: 'Zone Return', info: 'Info', battery: 'Battery' };

  list.innerHTML = fAlerts.map(a => {
    const w = getWorker(a.worker);
    const z = getZone(a.zone);
    return `<div class="alert-item">
      <div class="alert-icon ${a.type}"><i data-lucide="${icons[a.type] || 'circle'}" style="width:16px"></i></div>
      <div class="alert-body">
        <div class="alert-title">${a.msg}</div>
        <div class="alert-meta">
          <span class="badge badge-${a.type === 'breach' ? 'breach' : a.type === 'return' ? 'return' : a.type === 'battery' ? 'warning' : 'info'}">${labels[a.type] || a.type}</span>
          ${w ? ` · ${w.name}` : ''}
          ${z ? ` · ${z.name}` : ''}
        </div>
      </div>
      <div class="alert-time">${fmtTime(a.ts)}</div>
    </div>`;
  }).join('') || '<div style="color:var(--text3);padding:20px;text-align:center">No alerts</div>';
}

function clearAlerts() {
  alerts.length = 0;
  state.newAlerts = 0;
  updateAlertBadge();
  renderAlerts();
  showToast('Alert history cleared', 'success');
}

// ────────────────────────────────────────────────
//  ANALYTICS PAGE
// ────────────────────────────────────────────────
let analyticsPeriod = 'today';
let chartB = null, chartS = null, chartD = null;

function setPeriod(p, btn) {
  analyticsPeriod = p;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAnalytics();
}

function renderAnalytics() {
  const online = workers.filter(w => w.status === 'online').length;
  const breachN = alerts.filter(a => a.type === 'breach').length;
  const totalDist = workers.reduce((s, w) => s + (w.distance || 0), 0);

  document.getElementById('kpi-total').textContent = workers.length;
  document.getElementById('kpi-online').textContent = online;
  document.getElementById('kpi-breaches').textContent = breachN;
  document.getElementById('kpi-dist').textContent = totalDist.toFixed(1) + ' km';
  document.getElementById('kpi-total-ch').textContent = `↑ ${workers.length} total registered`;
  document.getElementById('kpi-online-ch').className = `kpi-change ${online > 4 ? 'up' : 'down'}`;
  document.getElementById('kpi-breach-ch').textContent = `${breachN} total this session`;
  document.getElementById('kpi-dist-ch').textContent = `↑ GPS tracking active`;

  // Breach by day chart
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const breachData = days.map(() => Math.floor(Math.random() * 8));
  const ctx1 = document.getElementById('chartBreaches');
  if (ctx1) {
    if (chartB) chartB.destroy();
    chartB = new Chart(ctx1, {
      type: 'bar', data: {
        labels: days,
        datasets: [{
          data: breachData, backgroundColor: 'rgba(239,68,68,0.5)', borderColor: '#ef4444',
          borderWidth: 1, borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }
        }
      }
    });
  }

  // Speed per zone chart
  const ctx2 = document.getElementById('chartSpeed');
  if (ctx2) {
    if (chartS) chartS.destroy();
    chartS = new Chart(ctx2, {
      type: 'bar', data: {
        labels: zones.map(z => z.name.split(' ')[0]),
        datasets: [{
          data: zones.map(() => (Math.random() * 40 + 15).toFixed(1)),
          backgroundColor: zones.map(z => z.color + '80'), borderColor: zones.map(z => z.color),
          borderWidth: 1, borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }
        }
      }
    });
  }

  // Performance table
  const tbody = document.getElementById('perfTableBody');
  if (tbody) {
    tbody.innerHTML = workers.map(w => {
      const compliance = Math.max(0, 100 - w.breachCount * 8);
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:8px">
          <div class="worker-avatar-sm" style="background:${w.color}">${initials(w.name)}</div>${w.name}
        </div></td>
        <td>${((w.distance || 0) * 10).toFixed(2)} km</td>
        <td>${w.uptime}%</td>
        <td>${w.breachCount}</td>
        <td>
          <div class="compliance-bar"><div class="compliance-fill" style="width:${compliance}%"></div></div>
          ${compliance}%
        </td>
      </tr>`;
    }).join('');
  }

  // Heatmap
  const hm = document.getElementById('zoneHeatmap');
  if (hm) {
    const max = Math.max(...zones.map(z => workers.filter(w => w.zone === z.id && w.breaching).length + z.id.charCodeAt(1) % 5));
    hm.innerHTML = zones.map(z => {
      const val = workers.filter(w => w.zone === z.id).reduce((s, w) => s + w.breachCount, 0);
      const pct = Math.min(100, Math.round(val / (max || 1) * 100));
      return `<div class="heatmap-row">
        <div class="heatmap-label">${z.name}</div>
        <div class="heatmap-track"><div class="heatmap-fill" style="width:${pct}%"></div></div>
        <div class="heatmap-val">${val}</div>
      </div>`;
    }).join('');
  }

  // Donut chart
  const ctx3 = document.getElementById('chartDonut');
  if (ctx3) {
    const onlineN = workers.filter(w => w.status === 'online' && !w.breaching).length;
    const breachingN = workers.filter(w => w.breaching).length;
    const offlineN = workers.filter(w => w.status === 'offline').length;
    if (chartD) chartD.destroy();
    chartD = new Chart(ctx3, {
      type: 'doughnut',
      data: {
        labels: ['Online', 'Breaching', 'Offline'],
        datasets: [{
          data: [onlineN, breachingN, offlineN],
          backgroundColor: ['rgba(34,197,94,0.7)', 'rgba(239,68,68,0.7)', 'rgba(100,116,139,0.5)'],
          borderColor: ['#22c55e', '#ef4444', '#475569'], borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        cutout: '70%'
      }
    });
    const leg = document.getElementById('donutLegend');
    if (leg) {
      leg.innerHTML = [
        { label: 'Online', color: '#22c55e', val: onlineN },
        { label: 'Breaching', color: '#ef4444', val: breachingN },
        { label: 'Offline', color: '#475569', val: offlineN },
      ].map(it => `<div class="legend-item"><div class="legend-dot" style="background:${it.color}"></div>${it.label} <b style="margin-left:auto">${it.val}</b></div>`).join('');
    }
  }
}

function exportAnalytics() {
  showToast('Analytics export started…', 'success');
}

// ────────────────────────────────────────────────
//  SHIFTS PAGE
// ────────────────────────────────────────────────
function renderShifts() {
  const grid = document.getElementById('shiftsGrid');
  if (!grid) return;

  grid.innerHTML = workers.map(w => {
    const sh = shifts.find(s => s.workerId === w.id) || {};
    const active = sh.active;
    const started = active && sh.startTime ? fmtShiftTime(sh.startTime) : '—';
    const duration = active && sh.startTime ? elapsedSince(sh.startTime) : '—';
    return `<div class="card shift-card">
      <div class="shift-card-header">
        <div class="shift-avatar" style="background:${w.color}">${initials(w.name)}</div>
        <div>
          <div class="shift-name">${w.name}</div>
          <div class="shift-zone">${workerZone(w)?.name || '—'}</div>
        </div>
        ${active ? '<span class="badge badge-online" style="margin-left:auto">Active</span>' : ''}
      </div>
      <div class="shift-times">
        <div class="shift-time-item"><div class="shift-time-label">Start</div><div class="shift-time-val">${started}</div></div>
        <div class="shift-time-item"><div class="shift-time-label">Duration</div><div class="shift-time-val">${duration}</div></div>
      </div>
      <div class="shift-stats">
        <div class="sstat"><div class="sv" style="color:var(--danger)">${sh.breachCount || 0}</div><div class="sl">Breaches</div></div>
        <div class="sstat"><div class="sv" style="color:var(--accent)">${w.status === 'online' ? '●' : '○'}</div><div class="sl">Status</div></div>
      </div>
      <div class="shift-actions">
        ${!active
        ? `<button class="btn btn-success btn-sm" onclick="startShift('${w.id}')"><i data-lucide="play" class="btn-icon"></i> Start</button>`
        : `<button class="btn btn-danger btn-sm"  onclick="endShift('${w.id}')"><i data-lucide="square" class="btn-icon"></i> End</button>`}
        <button class="btn btn-secondary btn-sm" onclick="openHistoryPlayer('${w.id}')"><i data-lucide="video" class="btn-icon"></i> Route</button>
      </div>
    </div>`;
  }).join('');

  // Shift log
  const log = document.getElementById('shiftLogBody');
  if (log) {
    log.innerHTML = shiftLog.map(s => {
      const w = getWorker(s.workerId);
      return `<tr>
        <td>${w ? `<div style="display:flex;align-items:center;gap:7px"><div class="worker-avatar-sm" style="background:${w.color}">${initials(w.name)}</div>${w.name}</div>` : '—'}</td>
        <td>${s.start}</td><td>${s.end}</td><td>${s.duration}</td>
        <td>${getZone(s.zone)?.name || s.zone || '—'}</td>
        <td>${s.breaches > 0 ? `<span style="color:var(--danger)">${s.breaches}</span>` : '0'}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="showPage('history')"><i data-lucide="video" class="btn-icon"></i></button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:16px">No completed shifts yet</td></tr>';
  }
}

function elapsedSince(timeStr) {
  if (!timeStr || timeStr === '—') return '—';
  let startMs;
  if (timeStr.includes('T') || timeStr.includes('Z')) {
    // ISO 8601 from backend
    startMs = new Date(timeStr).getTime();
  } else {
    // Legacy HH:MM format
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    startMs = d.getTime();
  }
  if (isNaN(startMs)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const hh = Math.floor(sec / 3600).toString().padStart(2, '0');
  const mm = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function fmtShiftTime(timeStr) {
  if (!timeStr || timeStr === '—') return '—';
  if (timeStr.includes('T') || timeStr.includes('Z')) {
    return new Date(timeStr).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  }
  return timeStr;
}


// ────────────────────────────────────────────────
//  SETTINGS PAGE
// ────────────────────────────────────────────────
function showSettingsSection(id, btn) {
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('settings-' + id);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
}

function renderSettings() {
  const container = document.getElementById('settingsContent');
  if (!container) return;

  const toggle = (id, label, desc, checked = true) =>
    `<div class="toggle-row"><div class="toggle-info"><div class="toggle-label">${label}</div><div class="toggle-desc">${desc}</div></div>
    <label class="toggle"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="if(this.id==='darkMode') toggleDarkMode(this.checked)"><span class="toggle-slider"></span></label></div>`;

  container.innerHTML = `
  <!-- GENERAL -->
  <div class="settings-section active" id="settings-general">
    <div class="settings-section-title">General Settings</div>
    <div class="settings-section-desc">Configure organization name, regional preferences and display options.</div>
    <div class="card settings-card">
      <h4>Organization</h4>
      <div class="form-row"><div class="form-group"><label class="form-label">Organization Name</label><input class="form-input" value="GeoTrack Uzbekistan" placeholder="Your company name"></div></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Timezone</label>
          <select class="form-select"><option>Asia/Tashkent (UTC+5)</option><option>UTC</option></select></div>
      </div>
    </div>
    <div class="card settings-card">
      <h4>Map & Tracking Display</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Map Refresh Rate</label>
          <select class="form-select"><option>1.2 seconds</option><option>2 seconds</option><option>5 seconds</option></select></div>
        <div class="form-group"><label class="form-label">Battery Alert Threshold</label>
          <input class="form-input" value="20" type="number" min="5" max="50"> </div>
      </div>
      ${toggle('mapCenter', 'Default Map to Tashkent', 'Center map on Tashkent (41.29°N, 69.24°E) on startup')}
    </div>
    <button class="btn btn-primary" onclick="showToast('Settings saved','success')">Save General Settings</button>
  </div>

  <!-- API KEYS -->
  <div class="settings-section" id="settings-api">
    <div class="settings-section-title">API Keys</div>
    <div class="settings-section-desc">Configure map API and WebSocket server endpoints.</div>
    <div class="card settings-card">
      <h4>Yandex Maps API</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Yandex Maps JS API Key</label>
          <input class="form-input" id="yandexKey" placeholder="Enter your Yandex Maps API key" type="password"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary" onclick="testYandexKey()">🔍 Test Key</button>
        <button class="btn btn-secondary" onclick="showToast('Key saved','success')">Save</button>
      </div>
      <div style="margin-top:10px;font-size:11.5px;color:var(--text3)">Get your key at <a href="https://developer.tech.yandex.ru" target="_blank" style="color:var(--accent)">developer.tech.yandex.ru</a> · Currently using CartoDB dark tiles as fallback.</div>
    </div>
    <div class="card settings-card">
      <h4>WebSocket Server</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">WebSocket URL</label>
          <input class="form-input" value="ws://localhost:3001" placeholder="ws://your-server:3001"></div>
      </div>
      <button class="btn btn-secondary" style="margin-top:6px" onclick="showToast('WS connection tested: simulation mode active','info')">🔌 Test Connection</button>
    </div>
  </div>

  <!-- SMS ALERTS -->
  <div class="settings-section" id="settings-sms">
    <div class="settings-section-title">SMS Alerts</div>
    <div class="settings-section-desc">Configure Eskiz.uz integration for SMS notifications to dispatchers.</div>
    <div class="card settings-card">
      <h4>Eskiz.uz Credentials</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" placeholder="your@email.uz"></div>
        <div class="form-group"><label class="form-label">API Password</label><input class="form-input" type="password" placeholder="Eskiz password"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Sender Name</label><input class="form-input" value="GeoTrack" placeholder="GeoTrack"></div>
        <div class="form-group"><label class="form-label">Recipient Phone</label><input class="form-input" placeholder="+998901234567"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:6px" onclick="showToast('Eskiz test SMS sent','success')">📱 Send Test SMS</button>
    </div>
    <div class="card settings-card">
      <h4>Alert Triggers</h4>
      ${toggle('smsB', 'Zone Breach', 'Send SMS when a worker exits their assigned zone')}
      ${toggle('smsR', 'Zone Return', 'Send SMS when a worker returns to their zone', false)}
      ${toggle('smsBat', 'Low Battery', 'Send SMS when battery falls below threshold')}
      ${toggle('smsS', 'Shift Start/End', 'Send SMS on shift start and end events', false)}
      ${toggle('smsD', 'Daily Report', 'Send a daily summary SMS each evening')}
    </div>
    <div class="card settings-card">
      <h4>Message Templates</h4>
      <div class="form-group" style="margin-bottom:10px">
        <label class="form-label">Breach Alert Template</label>
        <textarea class="template-textarea">Xodim {worker} o'z zonasidan ({zone}) chiqib ketdi. Vaqt: {time}. Koordinatalar: {lat}, {lon}</textarea>
        <div class="template-vars">Variables: {worker}, {zone}, {time}, {lat}, {lon}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Battery Alert Template</label>
        <textarea class="template-textarea">Xodim {worker} ning batareyasi kam ({battery}%). Vaqt: {time}.</textarea>
      </div>
    </div>
  </div>

  <!-- NOTIFICATIONS -->
  <div class="settings-section" id="settings-notif">
    <div class="settings-section-title">Notifications</div>
    <div class="settings-section-desc">Control in-app toast alerts and push notification settings.</div>
    <div class="card settings-card">
      <h4>Toast Alerts</h4>
      ${toggle('tBreach', 'Breach Toasts', 'Show toast popup on every zone breach')}
      ${toggle('tReturn', 'Return Toasts', 'Show toast popup when worker returns to zone')}
      ${toggle('tBat', 'Battery Toasts', 'Show toast popup on low battery events')}
      ${toggle('tShift', 'Shift Toasts', 'Show toast popup on shift start and end', false)}
    </div>
    <div class="card settings-card">
      <h4>Auto-clear</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Clear toast after (seconds)</label>
          <input class="form-input" type="number" value="3.5" step="0.5" min="1" max="10"></div>
        <div class="form-group"><label class="form-label">Max alerts stored</label>
          <input class="form-input" type="number" value="500" min="50" max="5000"></div>
      </div>
    </div>
  </div>

  <!-- GPS TRACKING -->
  <div class="settings-section" id="settings-gps">
    <div class="settings-section-title">GPS Tracking</div>
    <div class="settings-section-desc">Configure device ping intervals, accuracy and hardware TCP listener settings.</div>
    <div class="card settings-card">
      <h4>Tracking Parameters</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ping Interval (seconds)</label><input class="form-input" type="number" value="1.2" step="0.1"></div>
        <div class="form-group"><label class="form-label">Min Distance Threshold (m)</label><input class="form-input" type="number" value="5"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">GPS Accuracy Mode</label>
          <select class="form-select"><option>High (best accuracy)</option><option>Balanced</option><option>Low Power</option></select></div>
        <div class="form-group"><label class="form-label">Offline Queue (points)</label><input class="form-input" type="number" value="500"></div>
      </div>
      ${toggle('offlineQ', 'Offline Queue', 'Buffer GPS points when connection is lost and sync on reconnect')}
    </div>
    <div class="card settings-card">
      <h4>Hardware GPS Tracker (TCP)</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">TCP Port</label><input class="form-input" value="5000" type="number"></div>
        <div class="form-group"><label class="form-label">Protocol</label>
          <select class="form-select"><option>NMEA 0183 (universal)</option><option>GT06/GT02 binary</option><option>TK103</option><option>Auto-detect</option></select></div>
      </div>
      <div style="font-size:11.5px;color:var(--text3);margin-top:6px">Supported: GT06, GT02, TK103, TK103B, and any NMEA-over-TCP device. The server parses $GPRMC and $GPGGA sentences.</div>
    </div>
  </div>

  <!-- ZONES CONFIG -->
  <div class="settings-section" id="settings-zones">
    <div class="settings-section-title">Zone Configuration</div>
    <div class="settings-section-desc">Manage and edit monitoring zones.</div>
    <div class="card settings-card">
      <h4>Active Zones</h4>
      <div id="zoneConfigList">${zones.map(z => `
        <div class="zone-cfg-row">
          <div style="width:10px;height:10px;border-radius:50%;background:${z.color};flex-shrink:0"></div>
          <div class="zone-cfg-name">${z.name}</div>
          <div style="font-size:11px;color:var(--text3)">${z.radius}m radius</div>
          <button class="btn btn-danger btn-sm" onclick="removeZone('${z.id}')"><i data-lucide="x" class="btn-icon"></i></button>
        </div>`).join('')}</div>
      <button class="btn btn-primary" style="margin-top:10px" onclick="openAddZone()">＋ Add Zone</button>
    </div>
  </div>

  <!-- TEAM & ACCESS -->
  <div class="settings-section" id="settings-team">
    <div class="settings-section-title">Team & Access</div>
    <div class="settings-section-desc">Manage admin accounts, permissions and security settings.</div>
    <div class="card settings-card">
      <h4>Admin Accounts</h4>
      <div id="adminAccountsList">
        ${state.admins.map((a, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
          <div class="worker-avatar-sm" style="background:${a.active ? '#22d3ee' : 'var(--gray-300)'}">${a.initials || 'AD'}</div>
          <div><div style="font-size:13px;font-weight:600">${a.name}</div><div style="font-size:11px;color:var(--text2)">${a.username} · ${a.role}</div></div>
          ${a.active ? '<span class="badge badge-online" style="margin-left:auto">Active</span>' : '<span class="badge badge-offline" style="margin-left:auto">Pending</span>'}
        </div>`).join('')}
      </div>
      <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="inviteAdmin()"><i data-lucide="user-plus" class="btn-icon"></i> Add Admin</button>
    </div>
    <div class="card settings-card">
      <h4>Permissions</h4>
      ${toggle('pAdd', 'Allow Dispatchers to Add Workers', 'Dispatchers can create new worker profiles')}
      ${toggle('pDel', 'Allow Dispatchers to Remove Workers', 'Dispatchers can delete worker profiles', false)}
      ${toggle('pZone', 'Allow Dispatchers to Edit Zones', 'Dispatchers can create and modify zones', false)}
      ${toggle('p2fa', 'Enable Two-Factor Authentication', 'Require OTP on login for all accounts', false)}
    </div>
  </div>

  <!-- DATA & PRIVACY -->
  <div class="settings-section" id="settings-data">
    <div class="settings-section-title">Data & Privacy</div>
    <div class="settings-section-desc">Manage GPS data retention, exports and data deletion policies.</div>
    <div class="card settings-card">
      <h4>Retention Policy</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Keep GPS tracks for</label>
          <select class="form-select"><option>30 days</option><option>60 days</option><option>90 days</option><option>1 year</option><option>Forever</option></select></div>
        <div class="form-group"><label class="form-label">Keep alerts for</label>
          <select class="form-select"><option>7 days</option><option>30 days</option><option>90 days</option></select></div>
      </div>
    </div>
    <div class="card settings-card">
      <h4>Export & Wipe</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="showToast('Archive export started…','success')"><i data-lucide="download" class="btn-icon"></i> Export Full Archive</button>
        <button class="btn btn-danger" onclick="showToast('⚠ Confirm in production: tracks wiped','breach')"><i data-lucide="trash-2" class="btn-icon"></i> Wipe All Tracks</button>
      </div>
      <div style="font-size:11.5px;color:var(--danger);margin-top:10px">⚠ Wiping tracks is irreversible. Ensure you have exported a backup before proceeding.</div>
    </div>
  </div>

  <!-- SYSTEM USERS -->
  <div class="settings-section" id="settings-users">
    <div class="settings-section-title">System Users</div>
    <div class="settings-section-desc">Manage Admin and Dispatcher login accounts.</div>
    <div class="card settings-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h4 style="margin:0">User Accounts</h4>
        <button class="btn btn-primary btn-sm" onclick="showAddUserModal()"><i data-lucide="user-plus" class="btn-icon"></i> Add User</button>
      </div>
      <div id="usersTableContainer">Loading…</div>
    </div>
  </div>`;

  // Show first section by default
  showSettingsSection('general', document.querySelector('.settings-nav-item'));

  // Populate users table
  renderUsersPanel();
}

async function renderUsersPanel() {
  const container = document.getElementById('usersTableContainer');
  if (!container) return;
  try {
    const users = await fetchSystemUsers();
    container.innerHTML = `<table class="user-mgmt-table">
      <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${users.map(u => `<tr>
          <td><strong>${u.name}</strong></td>
          <td style="color:var(--text2)">${u.username}</td>
          <td><span class="${u.role === 'admin' ? 'badge badge-online' : 'badge-dispatch'}" style="display:inline-block">${u.role}</span></td>
          <td>${u.active ? '<span class="badge badge-online">Active</span>' : '<span class="badge badge-offline">Inactive</span>'}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteUserById('${u.id}')" ${u.username === 'admin' ? 'disabled title="Cannot delete super admin"' : ''}>
            <i data-lucide="trash-2" class="btn-icon"></i></button></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) { container.innerHTML = '<span style="color:var(--danger)">Failed to load users</span>'; }
}

async function deleteUserById(id) {
  if (!confirm('Delete this user account?')) return;
  try {
    await deleteSystemUser(id);
    showToast('User deleted', 'info');
    renderUsersPanel();
  } catch (e) { showToast('Error deleting user', 'breach'); }
}

function showAddUserModal() {
  document.getElementById('au-name').value = '';
  document.getElementById('au-username').value = '';
  document.getElementById('au-pass').value = '';
  document.getElementById('au-role').value = 'dispatcher';
  document.getElementById('modalOverlay').classList.add('show');
  document.getElementById('addUserModal').classList.add('show');
}

function submitAddUser() {
  const name = document.getElementById('au-name').value.trim();
  const username = document.getElementById('au-username').value.trim();
  const password = document.getElementById('au-pass').value.trim();
  const role = document.getElementById('au-role').value;

  if (!name || !username || !password) {
    showToast('Name, Username, and Password are required', 'breach');
    return;
  }

  createSystemUser({ name, username, password, role })
    .then(() => {
      showToast(`User "${name}" created`, 'success');
      closeModal();
      renderUsersPanel();
    })
    .catch(e => showToast(e.message, 'breach'));
}

function testYandexKey() {
  const key = document.getElementById('yandexKey')?.value;
  if (!key) { showToast('Enter an API key first', 'breach'); return; }
  showToast('Testing Yandex key… (connect backend to validate)', 'info');
}

async function removeZone(id) {
  const z = getZone(id);
  if (!confirm(`Are you sure you want to permanently delete the zone "${z?.name}"?`)) return;
  try {
    const res = await apiRemoveZone(id);
    if (!res) throw new Error('API failed');
    zones = zones.filter(x => x.id !== id);
    if (zoneCircleMap[id] && mainMap) { mainMap.removeLayer(zoneCircleMap[id]); delete zoneCircleMap[id]; }
    showToast(`Zone "${z?.name}" removed`, 'info');
    renderSettings();
    if (state.currentPage === 'zones') renderZones();
  } catch (e) {
    showToast('Failed to remove zone', 'breach');
  }
}
