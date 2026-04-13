// ============================================================
//  GeoTrack UZ — Authentication & Role-Based Access Control
// ============================================================

const AUTH_KEY = 'geotrack_session';

// ── Session Helpers ──────────────────────────────────────────
function getSession() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}
function saveSession(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}
function clearSession() {
    localStorage.removeItem(AUTH_KEY);
}

// ── Role Permissions ─────────────────────────────────────────
const ROLE_PAGES = {
    admin: ['dashboard', 'workers', 'zones', 'alerts', 'history', 'analytics', 'shifts', 'settings'],
    dispatcher: ['dashboard', 'workers', 'zones', 'alerts', 'history', 'shifts'],
};

function canAccess(role, page) {
    return (ROLE_PAGES[role] || []).includes(page);
}

// ── Apply Nav Visibility ──────────────────────────────────────
function applyRoleUI(role) {
    // Hide nav buttons dispatcher cannot see
    const restricted = ['analytics', 'settings'];
    restricted.forEach(id => {
        const btn = document.getElementById(`nb-${id}`);
        if (!btn) return;
        btn.style.display = canAccess(role, id) ? '' : 'none';
    });

    // Show/hide user management section inside Settings depending on role
    const userMgmt = document.getElementById('settings-user-mgmt');
    if (userMgmt) userMgmt.style.display = role === 'admin' ? '' : 'none';

    // Update current user pill in nav
    const pill = document.getElementById('nav-user-pill');
    if (pill) {
        const session = getSession();
        if (session) {
            pill.innerHTML = `
                <span style="font-size:12px;font-weight:600;color:var(--text1)">${session.name}</span>
                <span class="badge ${session.role === 'admin' ? 'badge-online' : 'badge-dispatch'}">${session.role === 'admin' ? 'Admin' : 'Dispatcher'}</span>
                <button class="icon-btn" onclick="logout()" title="Sign out" style="margin-left:4px"><i data-lucide="log-out" style="width:15px"></i></button>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

// ── Login Flow ────────────────────────────────────────────────
async function attemptLogin(username, password) {
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('login-error');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    err.style.display = 'none';

    try {
        const res = await fetch(API_BASE + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        saveSession({ ...data.user, token: data.token });
        showApp(data.user);
    } catch (e) {
        err.textContent = e.message;
        err.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

function logout() {
    clearSession();
    showLoginScreen();
}

// ── Screen Switches ───────────────────────────────────────────
function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-wrapper').style.display = 'none';
}

function showApp(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'block';
    applyRoleUI(user.role);

    // Override showPage to enforce role gating
    const origShowPage = window.showPage;
    window.showPage = function (name) {
        const sess = getSession();
        if (!sess || !canAccess(sess.role, name)) {
            showToast('Access denied for your role', 'breach');
            return;
        }
        origShowPage(name);
    };
}

// ── Boot ──────────────────────────────────────────────────────
function bootAuth() {
    const session = getSession();
    if (session) {
        showApp(session);
    } else {
        showLoginScreen();
    }
}

// ── User Management API helpers (for Settings page) ──────────
async function fetchSystemUsers() {
    const session = getSession();
    const headers = session?.token ? { 'Authorization': `Bearer ${session.token}` } : {};
    const res = await fetch(API_BASE + '/auth/users', { headers });
    return res.json();
}
async function createSystemUser(data) {
    const session = getSession();
    const headers = { 'Content-Type': 'application/json' };
    if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;
    const res = await fetch(API_BASE + '/auth/users', {
        method: 'POST', headers, body: JSON.stringify(data)
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    return res.json();
}
async function deleteSystemUser(id) {
    const session = getSession();
    const headers = session?.token ? { 'Authorization': `Bearer ${session.token}` } : {};
    await fetch(`${API_BASE}/auth/users/${id}`, { method: 'DELETE', headers });
}
