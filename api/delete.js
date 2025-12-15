// DELETE /api/delete - Delete an entry (admin only)
const { readData, writeEntries, authenticateAdmin, cloudinary, setCORSHeaders } = require('./_utils');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!(await authenticateAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { entryId } = req.body;
        const { entries } = await readData();

        const entryIndex = entries.findIndex(e => e.id === entryId);
        if (entryIndex === -1) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        const entry = entries[entryIndex];

        // Delete from Cloudinary if it's a Cloudinary URL
        if (entry.audioUrl && entry.audioUrl.includes('cloudinary.com')) {
            try {
                const publicId = entry.audioUrl.split('/').slice(-2).join('/').replace('.mp3', '');
                await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
            } catch (cloudError) {
                console.error('Cloudinary delete error:', cloudError);
            }
        }

        entries.splice(entryIndex, 1);
        await writeEntries(entries);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
};
