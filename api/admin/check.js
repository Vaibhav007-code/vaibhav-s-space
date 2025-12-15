// GET /api/admin/check - Check if admin is setup
const { getAdminCredentials, setCORSHeaders } = require('../_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const credentials = await getAdminCredentials();
        console.log('Admin check - credentials:', credentials ? 'EXISTS' : 'NULL');

        res.status(200).json({
            isSetup: !!credentials,
            securityQuestion: credentials?.securityQuestion || null
        });
    } catch (error) {
        console.error('Admin check error:', error);
        // Assume not setup on error
        res.status(200).json({
            isSetup: false,
            securityQuestion: null
        });
    }
};
