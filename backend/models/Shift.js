// ============================================================
//  GeoTrack UZ — Mongoose Model: Shift
// ============================================================
const mongoose = require('mongoose');

const ShiftLogSchema = new mongoose.Schema({
    workerId: String,
    start: String,
    end: String,
    duration: String,
    zone: String,
    breaches: { type: Number, default: 0 },
}, { _id: false });

const ShiftSchema = new mongoose.Schema({
    workerId: { type: String, required: true, unique: true },
    active: { type: Boolean, default: false },
    startTime: { type: String, default: null },
    breachCount: { type: Number, default: 0 },
    log: { type: [ShiftLogSchema], default: [] },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Shift', ShiftSchema);
