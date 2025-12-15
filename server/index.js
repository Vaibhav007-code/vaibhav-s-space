const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/audio', express.static(path.join(__dirname, 'storage/audio')));

// Ensure storage directories exist
if (!fs.existsSync('./server/storage')) {
    fs.mkdirSync('./server/storage', { recursive: true });
}
if (!fs.existsSync('./server/storage/audio')) {
    fs.mkdirSync('./server/storage/audio', { recursive: true });
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(config.DATA_FILE)) {
    fs.writeFileSync(config.DATA_FILE, JSON.stringify({ entries: [], analytics: { totalPlays: 0, dailyVisits: {} } }, null, 2));
}

// Helper functions
function readData() {
    const data = fs.readFileSync(config.DATA_FILE, 'utf8');
    return JSON.parse(data);
}

function writeData(data) {
    fs.writeFileSync(config.DATA_FILE, JSON.stringify(data, null, 2));
    // Broadcast update to all connected WebSocket clients
    broadcastUpdate();
}

function broadcastUpdate() {
    const data = readData();
    const message = JSON.stringify({ type: 'update', data: data.entries });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');

    // Send current data to new client
    const data = readData();
    ws.send(JSON.stringify({ type: 'init', data: data.entries }));

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// Multer configuration for audio upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './server/storage/audio/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: config.MAX_AUDIO_SIZE },
    fileFilter: (req, file, cb) => {
        if (config.ALLOWED_AUDIO_FORMATS.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only MP3, M4A, and WAV are allowed.'));
        }
    }
});

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
    const secret = req.headers['x-admin-secret'] || req.body.adminSecret || req.query.adminSecret;
    if (secret === config.ADMIN_SECRET) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// ===== PUBLIC ROUTES =====

// Get all audio entries (public)
app.get('/api/entries', (req, res) => {
    const data = readData();
    res.json(data.entries.filter(entry => !entry.hidden));
});

// Increment play count
app.post('/api/entries/:id/play', (req, res) => {
    const data = readData();
    const entry = data.entries.find(e => e.id === req.params.id);

    if (entry) {
        entry.plays = (entry.plays || 0) + 1;
        data.analytics.totalPlays = (data.analytics.totalPlays || 0) + 1;
        writeData(data);
        res.json({ success: true, plays: entry.plays });
    } else {
        res.status(404).json({ error: 'Entry not found' });
    }
});

// Get comments for an entry
app.get('/api/entries/:id/comments', (req, res) => {
    const data = readData();
    const entry = data.entries.find(e => e.id === req.params.id);

    if (entry) {
        res.json(entry.comments || []);
    } else {
        res.status(404).json({ error: 'Entry not found' });
    }
});

// Add a comment to an entry
app.post('/api/entries/:id/comments', (req, res) => {
    const data = readData();
    const entry = data.entries.find(e => e.id === req.params.id);

    if (entry) {
        const comment = {
            id: Date.now().toString(),
            text: req.body.text,
            timestamp: new Date().toISOString()
        };

        if (!entry.comments) entry.comments = [];
        entry.comments.push(comment);
        writeData(data);
        res.json(comment);
    } else {
        res.status(404).json({ error: 'Entry not found' });
    }
});

// Track daily visit
app.post('/api/analytics/visit', (req, res) => {
    const data = readData();
    const today = new Date().toISOString().split('T')[0];

    if (!data.analytics.dailyVisits[today]) {
        data.analytics.dailyVisits[today] = 0;
    }
    data.analytics.dailyVisits[today]++;

    writeData(data);
    res.json({ success: true });
});

// ===== ADMIN ROUTES =====

// Verify admin access
app.post('/api/admin/verify', authenticateAdmin, (req, res) => {
    res.json({ success: true });
});

// Upload new audio entry (admin only)
app.post('/api/admin/upload', authenticateAdmin, upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    const data = readData();
    const entry = {
        id: Date.now().toString(),
        title: req.body.title,
        description: req.body.description || '',
        audioUrl: `/audio/${req.file.filename}`,
        duration: req.body.duration || 0,
        timestamp: new Date().toISOString(),
        plays: 0,
        comments: [],
        hidden: false
    };

    data.entries.unshift(entry); // Add to beginning
    writeData(data);
    res.json(entry);
});

// Delete an entry (admin only)
app.delete('/api/admin/entries/:id', authenticateAdmin, (req, res) => {
    const data = readData();
    const entryIndex = data.entries.findIndex(e => e.id === req.params.id);

    if (entryIndex !== -1) {
        const entry = data.entries[entryIndex];

        // Delete audio file
        const audioPath = path.join(__dirname, 'storage', entry.audioUrl.replace('/audio/', 'audio/'));
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }

        data.entries.splice(entryIndex, 1);
        writeData(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Entry not found' });
    }
});

// Delete a comment (admin only)
app.delete('/api/admin/entries/:entryId/comments/:commentId', authenticateAdmin, (req, res) => {
    const data = readData();
    const entry = data.entries.find(e => e.id === req.params.entryId);

    if (entry && entry.comments) {
        entry.comments = entry.comments.filter(c => c.id !== req.params.commentId);
        writeData(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Entry or comment not found' });
    }
});

// Get analytics (admin only)
app.get('/api/admin/analytics', authenticateAdmin, (req, res) => {
    const data = readData();

    // Calculate total plays across all entries
    const totalPlays = data.entries.reduce((sum, entry) => sum + (entry.plays || 0), 0);

    res.json({
        totalEntries: data.entries.length,
        totalPlays: totalPlays,
        dailyVisits: data.analytics.dailyVisits,
        topEntries: data.entries
            .sort((a, b) => (b.plays || 0) - (a.plays || 0))
            .slice(0, 5)
            .map(e => ({ id: e.id, title: e.title, plays: e.plays || 0 }))
    });
});

// Start server
server.listen(config.PORT, () => {
    console.log(`🎙️  Server running on http://localhost:${config.PORT}`);
    console.log(`🔐 Admin secret: ${config.ADMIN_SECRET}`);
});
