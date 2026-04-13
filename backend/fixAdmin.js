require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function fix() {
    try {
        await connectDB();
        const hash = bcrypt.hashSync('702009', 10);
        await User.findOneAndUpdate(
            { id: 'u1' },
            { username: 'moonteek', password: hash, name: 'System Admin', role: 'admin', active: true },
            { upsert: true }
        );
        console.log("Admin updated successfully!");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
fix();
