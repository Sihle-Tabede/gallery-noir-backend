const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { seedMedia } = require('../scripts/seedMedia');

test('media seed inserts images and skips unchanged content', async (context) => {
    const { PGlite } = await import('@electric-sql/pglite');
    const database = new PGlite();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-noir-media-'));
    const nested = path.join(root, 'artworks', 'tests');

    context.after(async () => {
        await database.close();
        await fs.rm(root, { recursive: true, force: true });
    });

    await fs.mkdir(nested, { recursive: true });
    await fs.writeFile(path.join(nested, 'sample.webp'), new Uint8Array([82, 73, 70, 70]));

    const schema = await fs.readFile(
        path.join(__dirname, '..', 'database', 'schema.sql'),
        'utf8'
    );
    await database.exec(schema);

    const adapter = {
        query: (...args) => database.query(...args),
        withTransaction: async (callback) => {
            await database.exec('BEGIN');
            try {
                const result = await callback(database);
                await database.exec('COMMIT');
                return result;
            } catch (error) {
                await database.exec('ROLLBACK');
                throw error;
            }
        }
    };

    await seedMedia({ database: adapter, root });
    await seedMedia({ database: adapter, root });

    const result = await database.query(
        'SELECT path, mime_type, size_bytes FROM media_assets'
    );
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].path, '/media/artworks/tests/sample.webp');
    assert.equal(result.rows[0].mime_type, 'image/webp');
    assert.equal(Number(result.rows[0].size_bytes), 4);
});
