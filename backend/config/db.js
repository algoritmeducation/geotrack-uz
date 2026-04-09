// ============================================================
//  GeoTrack UZ — Config: MongoDB Connection (optional)
// ============================================================
const mongoose = require('mongoose');

async function connectDB() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/geotrack';
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
        console.log('✅ MongoDB connected:', uri);
        return true;
    } catch (err) {
        console.warn('⚠️  MongoDB not available — running in memory-only mode.');
        console.warn('   Start MongoDB or set MONGO_URI= to enable persistence.');
        return false;
    }
}

module.exports = connectDB;
