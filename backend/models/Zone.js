// ============================================================
//  GeoTrack UZ — Mongoose Model: Zone
// ============================================================
const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    center: { type: [Number], required: true },   // [lat, lng]
    radius: { type: Number, default: 500 },
    color: { type: String, default: '#1d4ed8' },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Zone', ZoneSchema);
