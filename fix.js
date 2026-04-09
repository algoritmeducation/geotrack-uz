const fs = require('fs');

// 1. Fix CSS Dark Mode
let css = fs.readFileSync('d:/gps_wrk/style.css', 'utf8');
css = css.replace(/background:\s*white;/g, 'background: var(--card);');
css = css.replace(/background:\s*white\s*!important;/g, 'background: var(--card) !important;');
// Keep the toggle slider handle explicitly white
css = css.replace(/box-shadow: 0 1px 3px rgba\(0, 0, 0, 0.2\);\n\s*background: var\(--card\);/, 'box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);\n  background: #fff;');
fs.writeFileSync('d:/gps_wrk/style.css', css);

// 2. Fix HTML Emojis -> Lucide
let html = fs.readFileSync('d:/gps_wrk/index.html', 'utf8');
if (!html.includes('lucide@latest')) {
    html = html.replace('</head>', '  <script src="https://unpkg.com/lucide@latest"></script>\n</head>');
    html = html.replace('</body>', '  <script>lucide.createIcons(); setInterval(() => lucide.createIcons(), 1000);</script>\n</body>');
}
const remapHtml = [
    ['🗺 Dashboard', '<i data-lucide="layout-dashboard" class="nav-icon"></i> Dashboard'],
    ['👷 Workers', '<i data-lucide="users" class="nav-icon"></i> Workers'],
    ['📍 Zones', '<i data-lucide="map-pin" class="nav-icon"></i> Zones'],
    ['🔔 Alerts', '<i data-lucide="bell" class="nav-icon"></i> Alerts'],
    ['📼 Route History', '<i data-lucide="history" class="nav-icon"></i> Route History'],
    ['📊 Analytics', '<i data-lucide="bar-chart-2" class="nav-icon"></i> Analytics'],
    ['🕐 Shifts', '<i data-lucide="clock" class="nav-icon"></i> Shifts'],
    ['⚙️ Settings', '<i data-lucide="settings" class="nav-icon"></i> Settings'],
    ['⬇ Export CSV', '<i data-lucide="download" class="btn-icon"></i> Export CSV'],
    ['＋ Add Worker', '<i data-lucide="user-plus" class="btn-icon"></i> Add Worker'],
    ['＋ Add Zone', '<i data-lucide="map-pin" class="btn-icon"></i> Add Zone'],
    ['⚡ Live Events', '<i data-lucide="zap" style="display:inline;width:16px;vertical-align:middle;margin-right:2px"></i> Live Events'],
    ['<span class="search-icon">🔍</span>', '<span class="search-icon"><i data-lucide="search" style="width:14px"></i></span>'],
    ['<span class="breach-banner-icon">🚨</span>', '<span class="breach-banner-icon"><i data-lucide="alert-triangle" style="width:18px"></i></span>'],
    ['▶ Start All Shifts', '<i data-lucide="play" class="btn-icon"></i> Start All Shifts'],
    ['🗑 Clear All', '<i data-lucide="trash-2" class="btn-icon"></i> Clear All'],
    ['<span class="icon">🏢</span>', '<i data-lucide="building" class="icon"></i>'],
    ['<span class="icon">🔑</span>', '<i data-lucide="key" class="icon"></i>'],
    ['<span class="icon">📱</span>', '<i data-lucide="smartphone" class="icon"></i>'],
    ['<span class="icon">🔔</span>', '<i data-lucide="bell" class="icon"></i>'],
    ['<span class="icon">📡</span>', '<i data-lucide="satellite" class="icon"></i>'],
    ['<span class="icon">📍</span>', '<i data-lucide="map-pin" class="icon"></i>'],
    ['<span class="icon">👥</span>', '<i data-lucide="users" class="icon"></i>'],
    ['<span class="icon">🗄</span>', '<i data-lucide="archive" class="icon"></i>'],
    ['🔴 Breach', '<i data-lucide="alert-triangle" style="width:14px;display:inline-block;vertical-align:bottom"></i> Breach'],
    ['🟢 Return', '<i data-lucide="corner-down-left" style="width:14px;display:inline-block;vertical-align:bottom"></i> Return'],
    ['🟡 Battery', '<i data-lucide="battery-warning" style="width:14px;display:inline-block;vertical-align:bottom"></i> Battery'],
    ['🔵 Info', '<i data-lucide="info" style="width:14px;display:inline-block;vertical-align:bottom"></i> Info'],
];
remapHtml.forEach(([k, v]) => { html = html.split(k).join(v); });
fs.writeFileSync('d:/gps_wrk/index.html', html);

// 3. Fix JS Emojis -> Lucide
let js = fs.readFileSync('d:/gps_wrk/pages.js', 'utf8');
const remapJs = [
    ["'🚨'", "'alert-triangle'"],
    ["'✅'", "'check-circle'"],
    ["'ℹ️'", "'info'"],
    ["'🔋'", "'battery'"],
    ['<div class="alert-icon ${a.type}">${icons[a.type] || \'·\'}</div>', '<div class="alert-icon ${a.type}"><i data-lucide="${icons[a.type] || \'circle\'}" style="width:16px"></i></div>'],
    ['＋ Add Admin', '<i data-lucide="user-plus" class="btn-icon"></i> Add Admin'],
    ['▶ Start', '<i data-lucide="play" class="btn-icon"></i> Start'],
    ['⬛ End', '<i data-lucide="square" class="btn-icon"></i> End'],
    ['📼 Route', '<i data-lucide="video" class="btn-icon"></i> Route'],
    ['📼', '<i data-lucide="video" class="btn-icon"></i>'],
    ['✕', '<i data-lucide="x" class="btn-icon"></i>'],
    ['⬇ Export Full Archive', '<i data-lucide="download" class="btn-icon"></i> Export Full Archive'],
    ['🗑 Wipe All Tracks', '<i data-lucide="trash-2" class="btn-icon"></i> Wipe All Tracks']
];
remapJs.forEach(([k, v]) => { js = js.split(k).join(v); });
fs.writeFileSync('d:/gps_wrk/pages.js', js);
console.log("Migration complete.");
