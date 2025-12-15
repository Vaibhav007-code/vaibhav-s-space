// GET /api/analytics - Get analytics (admin only)
const { readData, authenticateAdmin, setCORSHeaders } = require('./_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!(await authenticateAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { entries, analytics } = await readData();

        const totalPlays = entries.reduce((sum, entry) => sum + (entry.plays || 0), 0);

        res.status(200).json({
            totalEntries: entries.length,
            totalPlays,
            dailyVisits: analytics.dailyVisits,
            topEntries: entries
                .sort((a, b) => (b.plays || 0) - (a.plays || 0))
                .slice(0, 5)
                .map(e => ({ id: e.id, title: e.title, plays: e.plays || 0 }))
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};
