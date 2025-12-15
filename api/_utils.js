// Shared utilities for Vercel serverless functions
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcryptjs');
const https = require('https');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const DB_FILE = 'vaibhav_space_db.json';

// Helper to fetch JSON from Cloudinary URL
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

// Helper to read data from Cloudinary (simulating DB)
async function readData() {
    try {
        // Try to get the file URL
        const result = await cloudinary.api.resource(DB_FILE, {
            resource_type: 'raw',
            type: 'upload'
        });

        // Fetch the actual content
        if (result && result.secure_url) {
            // Add a timestamp to bust cache
            const data = await fetchJson(result.secure_url + '?t=' + Date.now());
            if (data) return data;
        }
    } catch (error) {
        // If file doesn't exist (404), return default empty state
        if (error.error && error.error.http_code === 404) {
            return {
                entries: [],
                analytics: { totalPlays: 0, dailyVisits: {} },
                admin: null
            };
        }
        console.error('Error reading DB:', error);
    }

    // Default fallback
    return {
        entries: [],
        analytics: { totalPlays: 0, dailyVisits: {} },
        admin: null
    };
}

// Helper to save data to Cloudinary
async function saveData(data) {
    try {
        await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    public_id: DB_FILE.replace('.json', ''),
                    resource_type: 'raw',
                    format: 'json',
                    overwrite: true
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            uploadStream.write(Buffer.from(JSON.stringify(data)));
            uploadStream.end();
        });
        return true;
    } catch (error) {
        console.error('Error saving DB:', error);
        return false;
    }
}

// WRAPPER FUNCTIONS to match old interface

async function writeEntries(entries) {
    const data = await readData();
    data.entries = entries;
    return await saveData(data);
}

async function writeAnalytics(analytics) {
    const data = await readData();
    data.analytics = analytics;
    return await saveData(data);
}

async function getAdminCredentials() {
    const data = await readData();
    return data.admin;
}

async function setAdminCredentials(credentials) {
    const data = await readData();
    data.admin = credentials;
    return await saveData(data);
}

// Admin authentication
async function authenticateAdmin(req) {
    const password = req.headers['x-admin-password'] || req.query.adminPassword;
    if (!password) return false;

    const credentials = await getAdminCredentials();
    if (!credentials) return false;

    return await bcrypt.compare(password, credentials.passwordHash);
}

// CORS headers
function setCORSHeaders(res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Password');
}

module.exports = {
    cloudinary,
    readData,
    writeEntries,
    writeAnalytics,
    getAdminCredentials,
    setAdminCredentials,
    authenticateAdmin,
    setCORSHeaders,
    bcrypt
};
