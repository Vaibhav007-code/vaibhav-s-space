// GET /api/entries - Get all audio entries
const { readData, setCORSHeaders } = require('./_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const data = await readData();
        const entries = data.entries.filter(entry => !entry.hidden);
        res.status(200).json(entries);
    } catch (error) {
        console.error('Error fetching entries:', error);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
};
