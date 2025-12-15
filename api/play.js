// POST /api/play - Track audio play
const { readData, writeEntries, writeAnalytics, setCORSHeaders } = require('./_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { entryId } = req.body;
        const { entries, analytics } = await readData();

        const entry = entries.find(e => e.id === entryId);
        if (entry) {
            entry.plays = (entry.plays || 0) + 1;
            analytics.totalPlays = (analytics.totalPlays || 0) + 1;

            await writeEntries(entries);
            await writeAnalytics(analytics);

            res.status(200).json({ success: true, plays: entry.plays });
        } else {
            res.status(404).json({ error: 'Entry not found' });
        }
    } catch (error) {
        console.error('Play tracking error:', error);
        res.status(500).json({ error: 'Failed to track play' });
    }
};
