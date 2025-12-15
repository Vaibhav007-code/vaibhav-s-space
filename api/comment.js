// POST /api/comment - Add comment to an entry
const { readData, writeEntries, setCORSHeaders } = require('./_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { entryId, text } = req.body;

        if (!entryId || !text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { entries } = await readData();
        const entry = entries.find(e => e.id === entryId);

        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        const comment = {
            id: Date.now().toString(),
            text,
            timestamp: new Date().toISOString()
        };

        if (!entry.comments) entry.comments = [];
        entry.comments.push(comment);

        await writeEntries(entries);

        res.status(200).json(comment);
    } catch (error) {
        console.error('Comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
};
