const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const db = require('../config/db');

const mediaRoot = path.join(__dirname, '..', 'seed', 'media');
const mimeTypes = new Map([
    ['.gif', 'image/gif'],
    ['.jpeg', 'image/jpeg'],
    ['.jpg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.svg', 'image/svg+xml'],
    ['.webp', 'image/webp']
]);

const collectFiles = async (directory) => {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectFiles(entryPath));
        } else if (entry.isFile() && mimeTypes.has(path.extname(entry.name).toLowerCase())) {
            files.push(entryPath);
        }
    }

    return files;
};

const seedMedia = async ({ database = db, root = mediaRoot } = {}) => {
    const files = await collectFiles(root);
    if (files.length === 0) throw new Error('No seed images were found');

    let changed = 0;

    await database.withTransaction(async (client) => {
        for (const filePath of files) {
            const content = await fs.readFile(filePath);
            const extension = path.extname(filePath).toLowerCase();
            const relativePath = path.relative(root, filePath).split(path.sep).join('/');
            const assetPath = '/media/' + relativePath;
            const sha256 = crypto.createHash('sha256').update(content).digest('hex');

            const result = await client.query(
                'INSERT INTO media_assets (path, mime_type, content, sha256, size_bytes) '
                + 'VALUES ($1, $2, $3, $4, $5) '
                + 'ON CONFLICT (path) DO UPDATE SET '
                + 'mime_type = EXCLUDED.mime_type, content = EXCLUDED.content, '
                + 'sha256 = EXCLUDED.sha256, size_bytes = EXCLUDED.size_bytes '
                + 'WHERE media_assets.sha256 IS DISTINCT FROM EXCLUDED.sha256 '
                + 'RETURNING path',
                [assetPath, mimeTypes.get(extension), content, sha256, content.length]
            );
            changed += result.rowCount;
        }
    });

    const totals = await database.query(
        'SELECT COUNT(*) AS image_count, COALESCE(SUM(size_bytes), 0) AS total_bytes '
        + 'FROM media_assets'
    );

    console.log(
        'Gallery Noir media synchronized: '
        + files.length
        + ' source image(s), '
        + changed
        + ' inserted or updated, '
        + totals.rows[0].image_count
        + ' stored in PostgreSQL'
    );
};

if (require.main === module) {
    seedMedia()
        .catch((error) => {
            console.error('Media synchronization failed:', error.message);
            process.exitCode = 1;
        })
        .finally(() => db.end());
}

module.exports = { collectFiles, seedMedia };
