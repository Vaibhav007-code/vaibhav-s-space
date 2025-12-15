// Shared utilities for Vercel serverless functions
const { kv } = require('@vercel/kv');
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcryptjs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Data keys for Vercel KV
const KEYS = {
    ENTRIES: 'audio_entries',
    ANALYTICS: 'analytics',
    ADMIN: 'admin_credentials'
};

// Helper to read data from Vercel KV
async function readData() {
    try {
        const entries = await kv.get(KEYS.ENTRIES) || [];
        const analytics = await kv.get(KEYS.ANALYTICS) || { totalPlays: 0, dailyVisits: {} };
        return { entries, analytics };
    } catch (error) {
        console.error('Error reading data:', error);
        return { entries: [], analytics: { totalPlays: 0, dailyVisits: {} } };
    }
}

// Helper to write entries
async function writeEntries(entries) {
    try {
        await kv.set(KEYS.ENTRIES, entries);
        return true;
    } catch (error) {
        console.error('Error writing entries:', error);
        return false;
    }
}

// Helper to write analytics
async function writeAnalytics(analytics) {
    try {
        await kv.set(KEYS.ANALYTICS, analytics);
        return true;
    } catch (error) {
        console.error('Error writing analytics:', error);
        return false;
    }
}

// Admin credentials management
async function getAdminCredentials() {
    try {
        return await kv.get(KEYS.ADMIN);
    } catch (error) {
        console.error('Error reading admin credentials:', error);
        return null;
    }
}

async function setAdminCredentials(credentials) {
    try {
        await kv.set(KEYS.ADMIN, credentials);
        return true;
    } catch (error) {
        console.error('Error saving admin credentials:', error);
        return false;
    }
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
