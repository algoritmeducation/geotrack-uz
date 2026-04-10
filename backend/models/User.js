// ============================================================
//  GeoTrack UZ — Mongoose Model: User
// ============================================================
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'dispatcher', 'viewer'], default: 'dispatcher' },
    active: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('User', UserSchema);
