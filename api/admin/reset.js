// POST /api/admin/reset - Reset password with security answer
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
        const { securityAnswer, newPassword } = req.body;

        if (!securityAnswer || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const credentials = await getAdminCredentials();
        if (!credentials) {
            return res.status(404).json({ error: 'Admin not setup' });
        }

        // Verify security answer
        const isValid = await bcrypt.compare(
            securityAnswer.toLowerCase().trim(),
            credentials.securityAnswerHash
        );

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid security answer' });
        }

        // Update password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        credentials.passwordHash = newPasswordHash;
        credentials.updatedAt = new Date().toISOString();

        await setAdminCredentials(credentials);

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
};
