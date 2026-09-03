const db = require('../config/db');

const Media = {
    findByPath: async (assetPath) => {
        const result = await db.query(
            'SELECT path, mime_type, content, sha256, size_bytes, updated_at '
            + 'FROM media_assets WHERE path = $1 LIMIT 1',
            [assetPath]
        );
        return result.rows[0];
    }
};

module.exports = Media;
