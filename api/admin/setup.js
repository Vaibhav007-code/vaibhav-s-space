// POST /api/admin/setup - Initial admin setup
const { getAdminCredentials, setAdminCredentials, bcrypt, setCORSHeaders } = require('../_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check if admin already exists
        const existing = await getAdminCredentials();
        if (existing) {
            return res.status(400).json({ error: 'Admin already setup' });
        }

        const { password, securityQuestion, securityAnswer } = req.body;

        if (!password || !securityQuestion || !securityAnswer) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Hash password and security answer
        const passwordHash = await bcrypt.hash(password, 10);
        const answerHash = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);

        const credentials = {
            passwordHash,
            securityQuestion,
            securityAnswerHash: answerHash,
            createdAt: new Date().toISOString()
        };

        await setAdminCredentials(credentials);

        res.status(200).json({ success: true, message: 'Admin setup complete' });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: 'Setup failed' });
    }
};
