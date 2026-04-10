// ============================================================
//  GeoTrack UZ — Main Server
//  Express + Socket.IO + MongoDB (Mongoose)
// ============================================================
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const state = require('./state');
const startSimulator = require('./services/gpsSimulator');
const { startGpsServer } = require('./services/gpsServer');
const { checkBreach } = require('./services/geofence');
const eskiz = require('./services/eskiz');

// ── Mongoose Models ─────────────────────────────────────────
const Worker = require('./models/Worker');
const Zone = require('./models/Zone');
const Alert = require('./models/Alert');
const Shift = require('./models/Shift');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] } });

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve frontend ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// ── Helper: conditional DB persist ─────────────────────────
const db = (fn) => state.dbAvailable ? fn() : Promise.resolve();

// ── REST API Routes ─────────────────────────────────────────

// Workers
app.get('/api/workers', (_req, res) => res.json(state.workers));

app.post('/api/workers', async (req, res) => {
    const { id, name, role, phone, zone, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const finalId = id && id.trim() ? id.trim() : ('w' + Date.now());
    if (state.workers.find(w => w.id === finalId)) return res.status(400).json({ error: 'ID already exists' });
    const z = state.zones.find(z => z.id === zone) || state.zones[0];
    const w = {
        id: finalId, name, role: role || 'Field Agent', phone: phone || '',
        zone: z ? z.id : '', color: color || '#1d4ed8',
        lat: z ? z.center[0] + (Math.random() - .5) * .003 : 0,
        lng: z ? z.center[1] + (Math.random() - .5) * .003 : 0,
        battery: 80 + Math.random() * 20, status: 'offline',
        speed: 0, trail: [], breaching: false, distance: 0, uptime: 100, breachCount: 0,
    };
    state.workers.push(w);
    await db(() => Worker.create(w));
    state.newAlert('info', w.id, w.zone, `${w.name} — Worker added to system`);
    io.emit('worker:added', w);
    io.emit('workers:update', state.workers);
    res.status(201).json(w);
});

app.put('/api/workers/:id', async (req, res) => {
    const w = state.workers.find(w => w.id === req.params.id);
    if (!w) return res.status(404).json({ error: 'Not found' });
    Object.assign(w, req.body);
    await db(() => Worker.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }));
    io.emit('workers:update', state.workers);
    res.json(w);
});

app.delete('/api/workers/:id', async (req, res) => {
    const idx = state.workers.findIndex(w => w.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const [w] = state.workers.splice(idx, 1);
    await db(() => Worker.findOneAndDelete({ id: req.params.id }));
    io.emit('worker:removed', w.id);
    io.emit('workers:update', state.workers);
    res.json({ ok: true });
});

app.post('/api/workers/:id/location', async (req, res) => {
    const w = state.workers.find(w => w.id === req.params.id);
    if (!w) return res.status(404).json({ error: 'Not found' });
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'lat and lng must be numbers' });
    }
    w.lat = lat; w.lng = lng; w.speed = 0;
    w.trail.push([lat, lng]);
    if (w.trail.length > 60) w.trail.shift();
    state.addLocation(w.id, lat, lng, 0);
    await db(() => Worker.findOneAndUpdate({ id: w.id }, { lat, lng, trail: w.trail }));
    io.emit('workers:update', state.workers);
    res.json({ ok: true, id: w.id, lat, lng });
});

// Zones
app.get('/api/zones', (_req, res) => res.json(state.zones));

app.post('/api/zones', async (req, res) => {
    const { name, center, radius, color } = req.body;
    if (!name || !center) return res.status(400).json({ error: 'name and center required' });
    const z = { id: 'z' + Date.now(), name, center, radius: radius || 500, color: color || '#1d4ed8' };
    state.zones.push(z);
    await db(() => Zone.create(z));
    io.emit('zone:added', z);
    res.status(201).json(z);
});

app.delete('/api/zones/:id', async (req, res) => {
    const idx = state.zones.findIndex(z => z.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const [z] = state.zones.splice(idx, 1);
    await db(() => Zone.findOneAndDelete({ id: req.params.id }));
    io.emit('zone:removed', z.id);
    res.json({ ok: true });
});

// Alerts
app.get('/api/alerts', (req, res) => {
    const { limit = 100, type } = req.query;
    let list = state.alerts;
    if (type && type !== 'all') list = list.filter(a => a.type === type);
    res.json(list.slice(0, parseInt(limit)));
});

app.delete('/api/alerts', async (_req, res) => {
    state.alerts.length = 0;
    await db(() => Alert.deleteMany({}));
    io.emit('alerts:cleared');
    res.json({ ok: true });
});

// Locations (history)
app.get('/api/locations/:workerId', (req, res) => {
    const { workerId } = req.params;
    const hist = state.locationHistory[workerId] || [];
    res.json(hist);
});

// GPS push from mobile/PWA
app.post('/api/locations/push', async (req, res) => {
    const { workerId, lat, lng, speed, accuracy } = req.body;
    const w = state.workers.find(w => w.id === workerId);
    if (!w) return res.status(404).json({ error: 'Worker not found' });
    w.lat = lat; w.lng = lng; w.speed = speed || 0;
    w.trail.push([lat, lng]);
    if (w.trail.length > 60) w.trail.shift();
    state.addLocation(workerId, lat, lng, speed || 0);
    await db(() => Worker.findOneAndUpdate({ id: workerId }, { lat, lng, speed: speed || 0, trail: w.trail }));
    checkBreach(w, state.zones, io, state);
    io.emit('workers:update', state.workers);
    res.json({ ok: true });
});

// Shifts
app.get('/api/shifts', (_req, res) => res.json({ shifts: state.shifts, log: state.shiftLog }));

app.post('/api/shifts/start', async (req, res) => {
    const { workerId } = req.body;
    const w = state.workers.find(w => w.id === workerId);
    if (!w) return res.status(404).json({ error: 'Not found' });
    let sh = state.shifts.find(s => s.workerId === workerId);
    if (!sh) { sh = { workerId, active: false, startTime: null, breachCount: 0 }; state.shifts.push(sh); }
    const now = new Date();
    sh.active = true; sh.startTime = now.toISOString(); sh.breachCount = 0;
    await db(() => Shift.findOneAndUpdate(
        { workerId },
        { workerId, active: true, startTime: sh.startTime, breachCount: 0 },
        { upsert: true, new: true }
    ));
    state.newAlert('info', workerId, w.zone, `${w.name} — Shift started`);
    io.emit('shift:started', sh);
    res.json(sh);
});

app.post('/api/shifts/end', async (req, res) => {
    const { workerId } = req.body;
    const sh = state.shifts.find(s => s.workerId === workerId);
    if (!sh || !sh.active) return res.status(400).json({ error: 'No active shift' });
    const w = state.workers.find(w => w.id === workerId);
    const start = new Date(sh.startTime), end = new Date();
    const dur = Math.floor((end - start) / 1000);
    const hh = Math.floor(dur / 3600).toString().padStart(2, '0');
    const mm = Math.floor((dur % 3600) / 60).toString().padStart(2, '0');
    const log = { workerId, start: sh.startTime, end: end.toISOString(), duration: `${hh}:${mm}`, zone: w?.zone || '', breaches: sh.breachCount };
    state.shiftLog.unshift(log);
    sh.active = false; sh.startTime = null;
    await db(() => Shift.findOneAndUpdate(
        { workerId },
        { active: false, startTime: null, $push: { log: { $each: [log], $position: 0 } } }
    ));
    state.newAlert('info', workerId, w?.zone || '', `${w?.name} — Shift ended (${hh}h ${mm}m)`);
    io.emit('shift:ended', { sh, log });
    res.json(log);
});

// Auth
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = state.users.find(u => u.username === username && u.password === password && u.active);
    if (!user) return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, role: user.role } });
});

app.get('/api/auth/users', (req, res) => {
    res.json(state.users.map(u => ({ id: u.id, name: u.name, username: u.username, role: u.role, active: u.active })));
});

app.post('/api/auth/users', async (req, res) => {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: 'name, username, password required' });
    if (state.users.find(u => u.username === username)) return res.status(409).json({ error: 'Username already exists' });
    const user = { id: 'u' + (++state._userIdCounter), name, username, password, role: role || 'dispatcher', active: true };
    state.users.push(user);
    await db(() => User.create(user));
    res.status(201).json({ id: user.id, name: user.name, username: user.username, role: user.role, active: user.active });
});

app.put('/api/auth/users/:id', async (req, res) => {
    const user = state.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { name, username, password, role, active } = req.body;
    if (name) user.name = name;
    if (username) user.username = username;
    if (password) user.password = password;
    if (role) user.role = role;
    if (active !== undefined) user.active = active;
    await db(() => User.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }));
    res.json({ id: user.id, name: user.name, username: user.username, role: user.role, active: user.active });
});

app.delete('/api/auth/users/:id', async (req, res) => {
    const idx = state.users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    state.users.splice(idx, 1);
    await db(() => User.findOneAndDelete({ id: req.params.id }));
    res.json({ ok: true });
});

// ── SMS (Eskiz UZ) ────────────────────────────────────────
app.post('/api/sms/send', async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
    try {
        const result = await eskiz.sendSms(phone, message);
        res.json({ ok: true, result });
    } catch (e) {
        console.error('Eskiz SMS error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/sms/balance', async (_req, res) => {
    try {
        const balance = await eskiz.getBalance();
        res.json({ ok: true, balance });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Health check
app.get('/api/health', (_req, res) => res.json({
    status: 'ok', uptime: Math.floor(process.uptime()), workers: state.workers.length,
    zones: state.zones.length, alerts: state.alerts.length, db: state.dbAvailable,
}));

// ── Socket.IO ──────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.emit('init', {
        workers: state.workers,
        zones: state.zones,
        alerts: state.alerts.slice(0, 100),
        shifts: state.shifts,
        shiftLog: state.shiftLog,
    });

    socket.on('location:push', async ({ workerId, lat, lng, speed }) => {
        const w = state.workers.find(w => w.id === workerId);
        if (!w) return;
        w.lat = lat; w.lng = lng; w.speed = speed || 0;
        w.trail.push([lat, lng]);
        if (w.trail.length > 60) w.trail.shift();
        state.addLocation(workerId, lat, lng, speed || 0);
        await db(() => Worker.findOneAndUpdate({ id: workerId }, { lat, lng, speed: speed || 0, trail: w.trail }));
        checkBreach(w, state.zones, io, state);
        io.emit('workers:update', state.workers);
    });

    socket.on('disconnect', () => console.log(`🔌 Client disconnected: ${socket.id}`));
});

// ── Bootstrap: Load DB → seed state → start services ───────
async function bootstrap() {
    const PORT = parseInt(process.env.PORT) || 3001;
    const ok = await connectDB().catch(() => false);
    state.dbAvailable = !!ok;

    if (state.dbAvailable) {
        // ── Load persisted data into in-memory state ──────────
        const [dbZones, dbWorkers, dbUsers, dbShifts, dbAlerts] = await Promise.all([
            Zone.find().lean(),
            Worker.find().lean(),
            User.find().lean(),
            Shift.find().lean(),
            Alert.find().sort({ ts: -1 }).limit(500).lean(),
        ]);

        if (dbZones.length) state.zones = dbZones;
        if (dbWorkers.length) state.workers = dbWorkers.map(w => ({ ...w, trail: w.trail || [], breaching: w.breaching || false }));
        if (dbUsers.length) state.users = dbUsers;
        if (dbAlerts.length) state.alerts = dbAlerts;

        if (dbShifts.length) {
            state.shifts = dbShifts.map(s => ({ workerId: s.workerId, active: s.active, startTime: s.startTime, breachCount: s.breachCount }));
            state.shiftLog = dbShifts.flatMap(s => s.log || []).sort((a, b) => new Date(b.start) - new Date(a.start));
        }

        // ── Seed default data if DB is empty ──────────────────
        if (!dbZones.length) await Zone.insertMany(state.zones);
        if (!dbWorkers.length) await Worker.insertMany(state.workers);
        if (!dbUsers.length) await User.insertMany(state.users);

        console.log(`📦 Loaded from DB — ${state.workers.length} workers, ${state.zones.length} zones, ${state.users.length} users`);
    }

    startSimulator(io, state);
    startGpsServer(io, state);

    server.listen(PORT, () => {
        console.log('');
        console.log('╔═══════════════════════════════════════╗');
        console.log(`║  🗺  GeoTrack UZ — Server running     ║`);
        console.log(`║  📡  API: http://localhost:${PORT}        ║`);
        console.log(`║  🌐  App: http://localhost:${PORT}        ║`);
        console.log(`║  📟  TCP GPS: port ${process.env.GPS_TCP_PORT || 5000}              ║`);
        console.log(`║  🗄  MongoDB: ${state.dbAvailable ? 'connected ✅    ' : 'memory-only ⚠️ '}   ║`);
        console.log('╚═══════════════════════════════════════╝');
        console.log('');
    });
}

bootstrap();
