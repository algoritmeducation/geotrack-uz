// ============================================================
//  GeoTrack UZ — TCP GPS Device Server
//  Listens for NMEA/GT06/TK103 sentences from hardware devices
// ============================================================
const net = require('net');
const { checkBreach } = require('./geofence');

// ── NMEA Parser ──────────────────────────────
function parseNMEA(sentence) {
    // $GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
    if (sentence.startsWith('$GPRMC')) {
        const p = sentence.split(',');
        if (p[2] !== 'A') return null; // void fix
        const lat = nmea2dec(p[3], p[4]);
        const lng = nmea2dec(p[5], p[6]);
        const speed = parseFloat(p[7]) * 1.852; // knots → km/h
        return { lat, lng, speed };
    }
    // $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
    if (sentence.startsWith('$GPGGA')) {
        const p = sentence.split(',');
        if (p[6] === '0') return null; // no fix
        const lat = nmea2dec(p[2], p[3]);
        const lng = nmea2dec(p[4], p[5]);
        return { lat, lng, speed: 0 };
    }
    return null;
}

function nmea2dec(raw, dir) {
    if (!raw) return 0;
    const dot = raw.indexOf('.');
    const deg = parseInt(raw.substring(0, dot - 2));
    const min = parseFloat(raw.substring(dot - 2));
    let val = deg + min / 60;
    if (dir === 'S' || dir === 'W') val = -val;
    return val;
}

// ── TCP Server ───────────────────────────────
function startGpsServer(io, state) {
    const PORT = parseInt(process.env.GPS_TCP_PORT) || 5000;
    const socketImeiMap = new Map(); // socket → IMEI

    const server = net.createServer((socket) => {
        const addr = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`📡 GPS device connected: ${addr}`);

        socket.on('data', (data) => {
            const lines = data.toString().split('\n').map(l => l.trim()).filter(Boolean);
            lines.forEach(line => {
                // Handle IMEI registration: "IMEI:868000000000001"
                if (line.startsWith('IMEI:')) {
                    const imei = line.substring(5).trim();
                    socketImeiMap.set(socket, imei);
                    socket.write('ACK\n');
                    console.log(`   Device IMEI registered: ${imei}`);
                    return;
                }

                const parsed = parseNMEA(line);
                if (!parsed) return;

                // Find worker by IMEI
                const imei = socketImeiMap.get(socket);
                const worker = imei
                    ? state.workers.find(w => w.imei === imei || w.id === imei)
                    : null;

                if (worker) {
                    worker.lat = parsed.lat;
                    worker.lng = parsed.lng;
                    worker.speed = parsed.speed || 0;
                    worker.status = 'online';
                    worker.trail.push([worker.lat, worker.lng]);
                    if (worker.trail.length > 60) worker.trail.shift();
                    state.addLocation(worker.id, worker.lat, worker.lng, worker.speed);
                    checkBreach(worker, state.zones, io, state);
                    io.emit('workers:update', state.workers);
                    console.log(`   Position updated: ${worker.name} → ${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`);
                }
            });
        });

        socket.on('close', () => { socketImeiMap.delete(socket); console.log(`📡 GPS device disconnected: ${addr}`); });
        socket.on('error', (err) => { console.warn(`GPS socket error (${addr}):`, err.message); });
    });

    server.listen(PORT, () => {
        console.log(`📡 TCP GPS server listening on port ${PORT}`);
        console.log('   Send NMEA sentences → server will route by IMEI');
    });

    server.on('error', (err) => {
        console.warn(`⚠️  Could not start TCP GPS server on port ${PORT}:`, err.message);
    });
}

module.exports = { startGpsServer, parseNMEA };
