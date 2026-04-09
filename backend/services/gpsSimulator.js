// ============================================================
//  GeoTrack UZ — Backend GPS Simulation Service
//  Moves workers every 1.2s, checks zone breaches,
//  broadcasts via Socket.IO.
// ============================================================
const { checkBreach } = require('./geofence');

function startSimulator(io, state) {
    if (process.env.SIMULATE_GPS !== 'true') return;
    console.log('🛰️  GPS simulator started (1.2s tick)');

    setInterval(() => {
        const onlineWorkers = state.workers.filter(w => w.status === 'online');

        onlineWorkers.forEach(w => {
            const zone = state.zones.find(z => z.id === w.zone);
            if (!zone) return;

            const prevLat = w.lat, prevLng = w.lng;

            // Random walk (biased toward zone center, 4% drift chance)
            if (Math.random() < 0.04) {
                w.lat += (Math.random() - 0.5) * 0.003;
                w.lng += (Math.random() - 0.5) * 0.003;
            } else {
                w.lat += (zone.center[0] - w.lat) * 0.02 + (Math.random() - 0.5) * 0.00045;
                w.lng += (zone.center[1] - w.lng) * 0.02 + (Math.random() - 0.5) * 0.00045;
            }

            // Speed estimation
            const dlat = w.lat - prevLat, dlng = w.lng - prevLng;
            const moveDist = Math.sqrt(dlat * dlat + dlng * dlng) * 111000; // rough meters
            w.speed = Math.min(80, Math.max(2, moveDist * 3 + (Math.random() - 0.5) * 10));

            // Battery drain
            w.battery = Math.max(0, w.battery - 0.012);

            // Trail (last 60 points)
            w.trail.push([w.lat, w.lng]);
            if (w.trail.length > 60) w.trail.shift();

            // Log to location history
            state.addLocation(w.id, w.lat, w.lng, w.speed);

            // Battery alert (at threshold crossings ≈20%)
            if (Math.floor(w.battery) === 20 && w.battery > 19.8) {
                const alert = state.newAlert('battery', w.id, w.zone, `${w.name} — Battery critical: ${Math.floor(w.battery)}%`);
                io.emit('new_alert', alert);
            }

            // Breach check
            checkBreach(w, state.zones, io, state);
        });

        // Broadcast all worker positions
        io.emit('workers:update', state.workers);

    }, 1200);
}

module.exports = startSimulator;
