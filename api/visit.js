// POST /api/visit - Track daily visits
const { readData, writeAnalytics, setCORSHeaders } = require('./_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { analytics } = await readData();
        const today = new Date().toISOString().split('T')[0];

        if (!analytics.dailyVisits) analytics.dailyVisits = {};
        if (!analytics.dailyVisits[today]) analytics.dailyVisits[today] = 0;
        analytics.dailyVisits[today]++;

        await writeAnalytics(analytics);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Visit tracking error:', error);
        res.status(500).json({ error: 'Failed to track visit' });
    }
};
