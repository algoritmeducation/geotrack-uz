// ============================================================
//  GeoTrack UZ — Mongoose Model: Alert
// ============================================================
const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, enum: ['info', 'breach', 'return', 'battery', 'warning'], default: 'info' },
    worker: { type: String, default: '' },
    zone: { type: String, default: '' },
    msg: { type: String, required: true },
    ts: { type: Number, default: () => Date.now() },
}, { versionKey: false });

module.exports = mongoose.model('Alert', AlertSchema);
