// ============================================================
//  GeoTrack UZ — Eskiz UZ SMS Service
//  https://eskiz.uz — Uzbekistan SMS Gateway
// ============================================================
const axios = require('axios');

const ESKIZ_BASE = 'https://notify.eskiz.uz/api';

// ── Credentials (read from .env) ────────────────────────────
const ESKIZ_EMAIL = process.env.ESKIZ_EMAIL || '';
const ESKIZ_PASSWORD = process.env.ESKIZ_PASSWORD || '';
const ESKIZ_FROM = process.env.ESKIZ_FROM || '4546'; // Your registered sender name

let _token = null;
let _tokenTime = 0;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // Refresh token every 24h (valid 30 days)

// ── Authenticate and cache token ────────────────────────────
async function getToken() {
    const now = Date.now();
    if (_token && (now - _tokenTime) < TOKEN_TTL_MS) return _token;

    if (!ESKIZ_EMAIL || !ESKIZ_PASSWORD) {
        throw new Error('Eskiz credentials not configured. Set ESKIZ_EMAIL and ESKIZ_PASSWORD in .env');
    }

    const res = await axios.post(`${ESKIZ_BASE}/auth/login`, {
        email: ESKIZ_EMAIL,
        password: ESKIZ_PASSWORD,
    });

    _token = res.data.data.token;
    _tokenTime = now;
    console.log('✅ Eskiz UZ — authenticated successfully');
    return _token;
}

// ── Send a single SMS ────────────────────────────────────────
// phone: any format — "+998901234567", "998901234567", "0901234567"
// message: plain text, max 160 latin / 70 cyrillic chars per segment
async function sendSms(phone, message) {
    // Normalise phone → digits only, ensure starts with 998
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '998' + clean.slice(1);
    if (!clean.startsWith('998')) clean = '998' + clean;

    const token = await getToken();

    const res = await axios.post(
        `${ESKIZ_BASE}/message/sms/send`,
        {
            mobile_phone: clean,
            message: message,
            from: ESKIZ_FROM,
            callback_url: '', // optional delivery report URL
        },
        { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.data; // { id, status, message }
}

// ── Get account balance ──────────────────────────────────────
async function getBalance() {
    const token = await getToken();
    const res = await axios.get(`${ESKIZ_BASE}/user/get-limit`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
}

module.exports = { sendSms, getBalance };
