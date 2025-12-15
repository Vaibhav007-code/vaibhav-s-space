// POST /api/upload - Upload audio to Cloudinary
const { cloudinary, readData, writeEntries, authenticateAdmin, setCORSHeaders } = require('./_utils');
const formidable = require('formidable');

module.exports = async (req, res) => {
    setCORSHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check admin authentication
    if (!(await authenticateAdmin(req))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Parse the multipart form data
        const form = new formidable.IncomingForm();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                return res.status(400).json({ error: 'Failed to parse form data' });
            }

            const audioFile = files.audio;
            if (!audioFile) {
                return res.status(400).json({ error: 'No audio file provided' });
            }

            try {
                // Upload to Cloudinary
                const result = await cloudinary.uploader.upload(audioFile.filepath, {
                    resource_type: 'video', // Audio files use 'video' resource type
                    folder: 'vaibhav-space',
                    format: 'mp3'
                });

                // Create entry
                const { entries } = await readData();
                const entry = {
                    id: Date.now().toString(),
                    title: fields.title,
                    description: fields.description || '',
                    audioUrl: result.secure_url,
                    duration: parseInt(fields.duration) || 0,
                    timestamp: new Date().toISOString(),
                    plays: 0,
                    comments: [],
                    hidden: false
                };

                entries.unshift(entry);
                await writeEntries(entries);

                res.status(200).json(entry);
            } catch (uploadError) {
                console.error('Upload error:', uploadError);
                res.status(500).json({ error: 'Failed to upload audio' });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
