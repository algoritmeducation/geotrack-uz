// ============================================================
//  GeoTrack UZ — Mongoose Model: Worker
// ============================================================
const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, default: 'Field Agent' },
    phone: { type: String, default: '' },
    imei: { type: String, default: '' },
    zone: { type: String, default: '' },
    color: { type: String, default: '#1d4ed8' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    battery: { type: Number, default: 100 },
    status: { type: String, default: 'online' },
    speed: { type: Number, default: 0 },
    trail: { type: [[Number]], default: [] },
    breaching: { type: Boolean, default: false },
    distance: { type: Number, default: 0 },
    uptime: { type: Number, default: 100 },
    breachCount: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Worker', WorkerSchema);
