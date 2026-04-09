// ============================================================
//  GeoTrack UZ — GPS Geofence Engine (Backend)
// ============================================================
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function inZone(lat, lng, zone) {
    return haversine(lat, lng, zone.center[0], zone.center[1]) <= zone.radius / 1000;
}

function checkBreach(worker, zones, io, state) {
    const zone = zones.find(z => z.id === worker.zone);
    if (!zone) return;
    const inside = inZone(worker.lat, worker.lng, zone);
    if (!inside && !worker.breaching) {
        worker.breaching = true;
        worker.breachCount++;
        const alert = state.newAlert('breach', worker.id, zone.id, `${worker.name} exited ${zone.name}`);
        io.emit('breach', { worker, alert });
        io.emit('new_alert', alert);
        console.log(`⚠️  BREACH: ${worker.name} → ${zone.name}`);
    } else if (inside && worker.breaching) {
        worker.breaching = false;
        const alert = state.newAlert('return', worker.id, zone.id, `${worker.name} returned to ${zone.name}`);
        io.emit('return', { worker, alert });
        io.emit('new_alert', alert);
        console.log(`✅ RETURN: ${worker.name} → ${zone.name}`);
    }
}

module.exports = { haversine, inZone, checkBreach };
