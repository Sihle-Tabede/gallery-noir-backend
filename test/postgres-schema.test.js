const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const expectedTables = [
    'artworks',
    'auth_challenges',
    'auth_delivery_limits',
    'blog_posts',
    'contacts',
    'inquiries',
    'media_assets',
    'order_items',
    'orders',
    'products',
    'users',
    'wishlists'
];

test('PostgreSQL schema is valid, complete, and repeatable', async (context) => {
    const { PGlite } = await import('@electric-sql/pglite');
    const database = new PGlite();
    context.after(() => database.close());

    const schema = await fs.readFile(
        path.join(__dirname, '..', 'database', 'schema.sql'),
        'utf8'
    );

    await database.exec(schema);
    await database.exec(schema);

    const result = await database.query(
        "SELECT table_name FROM information_schema.tables "
        + "WHERE table_schema = 'public' ORDER BY table_name"
    );

    assert.deepEqual(
        result.rows.map((row) => row.table_name),
        expectedTables
    );
});

test('PostgreSQL schema enforces catalogue and account rules', async (context) => {
    const { PGlite } = await import('@electric-sql/pglite');
    const database = new PGlite();
    context.after(() => database.close());

    const schema = await fs.readFile(
        path.join(__dirname, '..', 'database', 'schema.sql'),
        'utf8'
    );
    await database.exec(schema);

    const user = await database.query(
        'INSERT INTO users (email, password_hash, full_name, phone) '
        + 'VALUES ($1, $2, $3, $4) RETURNING id, role',
        ['collector@example.com', 'hashed-password', 'Gallery Collector', '0821234567']
    );

    assert.equal(user.rows[0].id, 1);
    assert.equal(user.rows[0].role, 'customer');

    const product = await database.query(
        'INSERT INTO products (slug, name, price, image_url, colors, sizes) '
        + 'VALUES ($1, $2, $3, $4, $5, $6) RETURNING colors, sizes',
        [
            'studio-print',
            'Studio Print',
            450,
            '/media/studio-print.jpg',
            JSON.stringify(['Charcoal', 'Ivory']),
            JSON.stringify(['A3'])
        ]
    );

    assert.deepEqual(product.rows[0].colors, ['Charcoal', 'Ivory']);
    assert.deepEqual(product.rows[0].sizes, ['A3']);

    const media = await database.query(
        'INSERT INTO media_assets (path, mime_type, content, sha256, size_bytes) '
        + 'VALUES ($1, $2, $3, $4, $5) RETURNING path, size_bytes',
        [
            '/media/test/sample.webp',
            'image/webp',
            new Uint8Array([82, 73, 70, 70]),
            'a'.repeat(64),
            4
        ]
    );

    assert.equal(media.rows[0].path, '/media/test/sample.webp');
    assert.equal(Number(media.rows[0].size_bytes), 4);

    await assert.rejects(
        database.query(
            'INSERT INTO users (email, password_hash, full_name, phone, role) '
            + 'VALUES ($1, $2, $3, $4, $5)',
            ['invalid@example.com', 'hash', 'Invalid Role', '0821234567', 'owner']
        )
    );
});
