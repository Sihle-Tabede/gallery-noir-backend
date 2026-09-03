const Media = require('../models/mediaModel');
const { badRequest, notFound } = require('../utils/errors');

exports.getByPath = async (req, res) => {
    const relativePath = String(req.params[0] || '').replace(/^\/+/, '');

    if (!relativePath || relativePath.includes('..') || relativePath.includes('\\')) {
        throw badRequest('Invalid media path');
    }

    const asset = await Media.findByPath('/media/' + relativePath);
    if (!asset) throw notFound('Image not found');

    const etag = '"' + asset.sha256 + '"';
    if (req.get('if-none-match') === etag) {
        return res.status(304).end();
    }

    const content = Buffer.isBuffer(asset.content)
        ? asset.content
        : Buffer.from(asset.content);

    res.set({
        'Content-Type': asset.mime_type,
        'Content-Length': String(content.length),
        'Cache-Control': 'public, max-age=300, must-revalidate',
        ETag: etag,
        'X-Content-Type-Options': 'nosniff'
    });
    return res.send(content);
};
