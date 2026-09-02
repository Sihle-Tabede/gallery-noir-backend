const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('PostgreSQL models preserve the GalleryNoir API data contract', async (context) => {
    const { PGlite } = await import('@electric-sql/pglite');
    const database = new PGlite();
    context.after(() => database.close());

    const schema = await fs.readFile(
        path.join(__dirname, '..', 'database', 'schema.sql'),
        'utf8'
    );
    await database.exec(schema);

    const databaseModulePath = require.resolve('../config/db');
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

    require.cache[databaseModulePath] = {
        id: databaseModulePath,
        filename: databaseModulePath,
        loaded: true,
        exports: adapter
    };

    const User = require('../models/userModel');
    const Artwork = require('../models/artworkModel');
    const Blog = require('../models/blogModel');
    const Contact = require('../models/contactModel');
    const Inquiry = require('../models/inquiryModel');
    const Order = require('../models/orderModel');
    const Product = require('../models/productModel');

    const userId = await User.create({
        email: 'collector@example.com',
        password_hash: 'hashed-password',
        full_name: 'Gallery Collector',
        phone: '0821234567'
    });
    assert.equal(userId, 1);
    assert.equal((await User.findByEmail('collector@example.com')).role, 'customer');

    await User.update(userId, { full_name: 'Noir Collector' });
    assert.equal((await User.findById(userId)).full_name, 'Noir Collector');

    const productId = await Product.create({
        slug: 'portrait-studio-print',
        name: 'Portrait Studio Print',
        description: 'Archival studio print',
        price: 250,
        stock: 5,
        image_url: '/media/merch/products/portrait-studio-print.webp',
        category: 'Prints',
        colors: ['Charcoal', 'Ivory'],
        sizes: ['A3'],
        featured: true,
        display_order: 1
    });
    const product = await Product.getById('portrait-studio-print');
    assert.equal(product.id, productId);
    assert.equal(product.type, 'Prints');
    assert.deepEqual(product.colors, ['Charcoal', 'Ivory']);

    const artworkId = await Artwork.create({
        slug: 'fragmented-gaze',
        title: 'Fragmented Gaze',
        description: 'Original portrait',
        medium: 'Mixed media on canvas',
        category: 'mixed-media',
        year: 2026,
        dimensions: '80 × 60 cm',
        price: 1000,
        status: 'available',
        image_url: '/media/artworks/portraits/fragmented-gaze.webp',
        featured: true,
        display_order: 1
    });
    assert.equal((await Artwork.getById('fragmented-gaze')).image.includes('fragmented-gaze'), true);

    await Artwork.update(artworkId, { dimensions: '90 × 70 cm' });
    assert.equal((await Artwork.getById(artworkId)).dimensions, '90 × 70 cm');

    const blogId = await Blog.create({
        slug: 'inside-the-studio',
        title: 'Inside the Studio',
        excerpt: 'A studio note',
        content: 'A longer studio note.',
        category: 'Studio update',
        image_url: '/media/studio/editorial/inside-the-studio.webp',
        read_time_minutes: 3,
        status: 'published',
        author_id: userId
    });
    assert.equal((await Blog.getById(blogId)).readTime, '3 min read');

    const inquiryId = await Inquiry.create({
        user_id: userId,
        name: 'Noir Collector',
        email: 'collector@example.com',
        subject: 'Artwork availability',
        message: 'I would like to ask about this work.'
    });
    await Inquiry.updateStatus(inquiryId, 'read');
    assert.equal((await Inquiry.getById(inquiryId)).status, 'read');

    const contactId = await Contact.create({
        name: 'Press Contact',
        email: 'press@example.com',
        topic: 'press',
        message: 'Please send the current press material.'
    });
    assert.equal((await Contact.getById(contactId)).topic, 'press');

    const orderId = await Order.createOrder({
        user_id: userId,
        shipping_address: {
            address: '1 Gallery Lane',
            city: 'Johannesburg',
            country: 'South Africa'
        },
        items: [
            { product_id: productId, artwork_id: null, quantity: 2 },
            { product_id: null, artwork_id: artworkId, quantity: 1 }
        ]
    });

    const order = await Order.getById(orderId);
    assert.equal(order.total_amount, 1500);
    assert.equal(order.items.length, 2);
    assert.equal(order.shipping_address.city, 'Johannesburg');
    assert.equal((await Product.getById(productId)).stock, 3);
    assert.equal((await Artwork.getById(artworkId)).status, 'sold');

    assert.equal(await Order.updateStatus(orderId, 'cancelled'), true);
    assert.equal((await Product.getById(productId)).stock, 5);
    assert.equal((await Artwork.getById(artworkId)).status, 'available');
});
