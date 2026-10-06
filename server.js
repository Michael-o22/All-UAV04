const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'missions.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_PAYLOAD_SIZE = 1e6; // 1 MB limit

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function readMissions() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const missions = JSON.parse(raw);
    if (Array.isArray(missions)) {
      return missions.sort((a, b) => (a.id || 0) - (b.id || 0));
    }
    return [];
  } catch (err) {
    console.error('Error reading missions.json:', err);
    return [];
  }
}

// Atomic file write to prevent data loss/corruption during sudden shutdown
function writeMissions(missions) {
  const tempFile = `${DATA_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(missions, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Error writing missions.json:', err);
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
    return false;
  }
}

// Helper to safely parse JSON body with payload size limitation
function parseJsonBody(req, res, callback) {
  let body = '';
  let exceeded = false;

  req.on('data', chunk => {
    if (exceeded) return;
    body += chunk;
    if (body.length > MAX_PAYLOAD_SIZE) {
      exceeded = true;
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8', 'Connection': 'close' });
      res.end(JSON.stringify({ error: 'Payload too large (Max 1MB)' }));
      body = ''; // free memory
      req.on('data', () => {}); // drain incoming chunks without buffering
    }
  });

  req.on('end', () => {
    if (exceeded) return;
    try {
      const data = JSON.parse(body || '{}');
      callback(null, data);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
    }
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // --- API ROUTES ---

  // 1. GET /api/missions
  if (req.method === 'GET' && pathname === '/api/missions') {
    const missions = readMissions();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(missions));
    return;
  }

  // 2. POST /api/missions
  if (req.method === 'POST' && pathname === '/api/missions') {
    parseJsonBody(req, res, (err, item) => {
      const missions = readMissions();

      const maxId = missions.reduce((max, m) => Math.max(max, m.id || 0), 0);
      const newId = maxId + 1;

      let parsedYear = parseInt(item.year, 10) || (new Date().getFullYear() + 543);
      if (parsedYear < 100) parsedYear += 2500;

      const parsedArea = item.area !== undefined && item.area !== null && item.area !== '' ? parseFloat(item.area) : null;
      const parsedBudget = item.budget !== undefined && item.budget !== null && item.budget !== '' ? parseFloat(item.budget) : null;

      const newMission = {
        id: newId,
        year: parsedYear,
        title: (item.title || '').trim(),
        objective: (item.objective || '').trim(),
        location: (item.location || '').trim(),
        province: (item.province || '').trim() || (item.location || '').trim(),
        dates: (item.dates || '').trim(),
        area: isNaN(parsedArea) ? null : parsedArea,
        budget: isNaN(parsedBudget) ? null : parsedBudget,
        status: item.status || 'completed',
        statusLabel: item.statusLabel || 'ส่งมอบงานแล้ว',
        category: item.category || 'ที่ดินสาธารณประโยชน์ / น.ส.ล.',
        note: (item.note || '').trim(),
        doc: (item.doc || '').trim(),
        createdAt: new Date().toISOString()
      };

      missions.push(newMission); // add to bottom
      missions.sort((a, b) => (a.id || 0) - (b.id || 0));
      writeMissions(missions);

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, mission: newMission }));
    });
    return;
  }

  // 3. PUT /api/missions/:id
  const putMatch = pathname.match(/^\/api\/missions\/(\d+)$/);
  if (req.method === 'PUT' && putMatch) {
    const id = parseInt(putMatch[1], 10);
    parseJsonBody(req, res, (err, updateData) => {
      const missions = readMissions();
      const index = missions.findIndex(m => m.id === id);

      if (index === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Mission not found' }));
        return;
      }

      if (updateData.year !== undefined) {
        let py = parseInt(updateData.year, 10);
        if (py < 100) py += 2500;
        updateData.year = py;
      }

      if (updateData.area !== undefined && updateData.area !== null && updateData.area !== '') {
        const pa = parseFloat(updateData.area);
        updateData.area = isNaN(pa) ? null : pa;
      }

      if (updateData.budget !== undefined && updateData.budget !== null && updateData.budget !== '') {
        const pb = parseFloat(updateData.budget);
        updateData.budget = isNaN(pb) ? null : pb;
      }

      missions[index] = {
        ...missions[index],
        ...updateData,
        id, // protect ID
        updatedAt: new Date().toISOString()
      };

      writeMissions(missions);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, mission: missions[index] }));
    });
    return;
  }

  // 4. DELETE /api/missions/:id
  const deleteMatch = pathname.match(/^\/api\/missions\/(\d+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    const id = parseInt(deleteMatch[1], 10);
    const missions = readMissions();
    const filtered = missions.filter(m => m.id !== id);

    if (filtered.length === missions.length) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Mission not found' }));
      return;
    }

    writeMissions(filtered);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, deletedId: id }));
    return;
  }

  // 5. GET /api/export/csv
  if (req.method === 'GET' && pathname === '/api/export/csv') {
    const missions = readMissions();
    let csv = '\uFEFF'; // UTF-8 BOM for Thai support in Excel
    csv += 'ลำดับ,ปีงบประมาณ,เรื่อง,วัตถุประสงค์,สถานที่/จังหวัด,วันที่ดำเนินการ,พื้นที่ (ตร.กม.),งบประมาณ (บาท),สถานะ,หมายเหตุ,เลขที่หนังสือ\r\n';
    
    // Mitigate formula injection and properly quote fields
    const escapeCsv = text => {
      let val = (text || '').toString();
      if (/^[=\+\-@]/.test(val)) {
        val = "'" + val; // Neutralize Excel formulas
      }
      return `"${val.replace(/"/g, '""')}"`;
    };

    missions.forEach(m => {
      csv += [
        m.id,
        m.year,
        escapeCsv(m.title),
        escapeCsv(m.objective),
        escapeCsv(m.location),
        escapeCsv(m.dates),
        m.area !== null && m.area !== undefined ? m.area : '',
        m.budget !== null && m.budget !== undefined ? m.budget : '',
        escapeCsv(m.statusLabel),
        escapeCsv(m.note),
        escapeCsv(m.doc)
      ].join(',') + '\r\n';
    });

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="uav_missions_export.csv"'
    });
    res.end(csv);
    return;
  }

  // 6. GET /api/export/json
  if (req.method === 'GET' && pathname === '/api/export/json') {
    const missions = readMissions();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="uav_missions_backup.json"'
    });
    res.end(JSON.stringify(missions, null, 2));
    return;
  }

  // 7. Unknown API route - return 404 JSON instead of falling back to SPA index.html
  if (pathname.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
    return;
  }

  // --- STATIC FILE SERVING ---
  const safePath = path.normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  // Prevent directory traversal
  const normalizedPublic = path.resolve(PUBLIC_DIR);
  const normalizedFile = path.resolve(filePath);
  if (!normalizedFile.startsWith(normalizedPublic)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 UAV Operations Tracker Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📁 Data Store: ${DATA_FILE}`);
  console.log(`=================================================\n`);
});
