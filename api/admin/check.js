// GET /api/admin/check - Check if admin is setup
const { getAdminCredentials, setCORSHeaders } = require('../_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const credentials = await getAdminCredentials();
        res.status(200).json({
            isSetup: !!credentials,
            securityQuestion: credentials?.securityQuestion || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check admin status' });
    }
};
