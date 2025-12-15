// POST /api/admin/login - Admin login
const { getAdminCredentials, bcrypt, setCORSHeaders } = require('../_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password required' });
        }

        const credentials = await getAdminCredentials();
        if (!credentials) {
            return res.status(404).json({ error: 'Admin not setup' });
        }

        const isValid = await bcrypt.compare(password, credentials.passwordHash);

        if (isValid) {
            res.status(200).json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};
