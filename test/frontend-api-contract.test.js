const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const withServer = async (app, callback) => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();

    try {
        await callback('http://127.0.0.1:' + address.port);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
};

const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            'content-type': 'application/json',
            ...(options.headers || {})
        }
    });
    const body = response.status === 204 ? null : await response.json();
    return { response, body };
};

test('frontend request and response contracts work through the complete API', async (context) => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-only-gallery-noir-jwt-secret-1234567890';
    process.env.BCRYPT_ROUNDS = '10';

    const { PGlite } = await import('@electric-sql/pglite');
    const database = new PGlite();
    context.after(() => database.close());

    const schema = await fs.readFile(
        path.join(__dirname, '..', 'database', 'schema.sql'),
        'utf8'
    );
    await database.exec(schema);

    const databaseModulePath = require.resolve('../config/db');
    require.cache[databaseModulePath] = {
        id: databaseModulePath,
        filename: databaseModulePath,
        loaded: true,
        exports: {
            query: (...args) => database.query(...args),
            ping: () => database.query('SELECT 1'),
            end: () => Promise.resolve(),
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
        }
    };

    const app = require('../app');

    await withServer(app, async (baseUrl) => {
        const corsResponse = await fetch(baseUrl + '/api/health', {
            headers: { origin: 'http://localhost:5173' }
        });
        assert.equal(corsResponse.status, 200);
        assert.equal(
            corsResponse.headers.get('access-control-allow-origin'),
            'http://localhost:5173'
        );

        const registration = await requestJson(baseUrl + '/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: 'collector@example.com',
                password: 'Gallery123!',
                full_name: 'Gallery Collector',
                phone: '0821234567'
            })
        });

        assert.equal(registration.response.status, 201);
        assert.equal(registration.body.user.full_name, 'Gallery Collector');
        assert.equal(registration.body.user.phone, '0821234567');
        assert.ok(registration.body.token);

        const token = registration.body.token;
        const authorization = { authorization: 'Bearer ' + token };

        const login = await requestJson(baseUrl + '/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'collector@example.com',
                password: 'Gallery123!'
            })
        });
        assert.equal(login.response.status, 200);
        assert.equal(login.body.user.email, 'collector@example.com');

        const profile = await requestJson(baseUrl + '/api/auth/me', {
            headers: authorization
        });
        assert.equal(profile.response.status, 200);
        assert.equal(profile.body.id, registration.body.user.id);

        const contact = await requestJson(baseUrl + '/api/contacts', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Gallery Collector',
                email: 'collector@example.com',
                topic: 'purchase',
                message: 'Please share delivery details for Johannesburg.'
            })
        });
        assert.equal(contact.response.status, 201);
        assert.equal(contact.body.message, 'Message sent successfully');

        const inquiry = await requestJson(baseUrl + '/api/inquiries', {
            method: 'POST',
            headers: authorization,
            body: JSON.stringify({
                name: 'Gallery Collector',
                email: 'collector@example.com',
                subject: 'Inquiry about Fragmented Gaze',
                message: 'I am interested in this artwork and its availability.'
            })
        });
        assert.equal(inquiry.response.status, 201);
        assert.equal(inquiry.body.message, 'Inquiry sent successfully');

        const artwork = await database.query(
            'INSERT INTO artworks '
            + '(slug, title, description, medium, category, year, dimensions, price, status, image_url, featured) '
            + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id',
            [
                'fragmented-gaze',
                'Fragmented Gaze',
                'Original portrait',
                'Ink and charcoal on paper',
                'drawing',
                2026,
                '80 x 60 cm',
                4200,
                'available',
                '/media/artworks/portraits/fragmented-gaze.webp',
                true
            ]
        );

        const product = await database.query(
            'INSERT INTO products '
            + '(slug, name, description, price, stock, image_url, category, colors, sizes, featured) '
            + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
            [
                'portrait-canvas-tote',
                'Portrait Canvas Tote',
                'Limited studio edition',
                280,
                5,
                '/media/merch/lifestyle/portrait-tote-seated-look.webp',
                'Accessories',
                JSON.stringify(['Natural canvas']),
                JSON.stringify(['One size']),
                true
            ]
        );

        await database.query(
            'INSERT INTO blog_posts '
            + '(slug, title, excerpt, content, category, image_url, read_time_minutes, status, author_id, published_at) '
            + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)',
            [
                'inside-the-studio',
                'Inside the Studio',
                'A new journal entry.',
                '<p>A complete studio journal entry.</p>',
                'Studio update',
                '/media/studio/artist/artist-at-work-portrait-series.webp',
                3,
                'published',
                registration.body.user.id
            ]
        );

        const featured = await requestJson(baseUrl + '/api/artworks/featured?limit=4');
        assert.equal(featured.response.status, 200);
        assert.equal(featured.body[0].slug, 'fragmented-gaze');
        assert.equal(featured.body[0].image, featured.body[0].image_url);
        assert.equal(featured.body[0].is_available, true);

        const productDetail = await requestJson(
            baseUrl + '/api/products/portrait-canvas-tote'
        );
        assert.equal(productDetail.response.status, 200);
        assert.equal(productDetail.body.type, 'Accessories');
        assert.deepEqual(productDetail.body.colors, ['Natural canvas']);

        const journal = await requestJson(baseUrl + '/api/blog');
        assert.equal(journal.response.status, 200);
        assert.equal(journal.body[0].slug, 'inside-the-studio');
        assert.equal(journal.body[0].readTime, '3 min read');

        const order = await requestJson(baseUrl + '/api/orders', {
            method: 'POST',
            headers: authorization,
            body: JSON.stringify({
                items: [
                    { product_id: product.rows[0].id, quantity: 1 },
                    { artwork_id: artwork.rows[0].id, quantity: 1 }
                ],
                shipping_address: {
                    address: '1 Gallery Lane',
                    city: 'Johannesburg',
                    country: 'South Africa'
                }
            })
        });
        assert.equal(order.response.status, 201);
        assert.equal(order.body.total_amount, 4480);
        assert.equal(order.body.items.length, 2);
        assert.equal(order.body.shipping_address.city, 'Johannesburg');

        const myOrders = await requestJson(baseUrl + '/api/orders/me', {
            headers: authorization
        });
        assert.equal(myOrders.response.status, 200);
        assert.equal(myOrders.body.length, 1);
        assert.equal(myOrders.body[0].reference, order.body.reference);
    });
});
