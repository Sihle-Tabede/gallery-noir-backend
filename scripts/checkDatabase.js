const db = require('../config/db');

const requiredSchema = {
    users: ['id', 'email', 'password_hash', 'full_name', 'phone', 'role'],
    artworks: [
        'id',
        'slug',
        'title',
        'medium',
        'category',
        'year',
        'price',
        'status',
        'image_url'
    ],
    products: [
        'id',
        'slug',
        'name',
        'price',
        'stock',
        'image_url',
        'category',
        'colors',
        'sizes'
    ],
    blog_posts: [
        'id',
        'slug',
        'title',
        'content',
        'status',
        'author_id',
        'published_at'
    ],
    inquiries: ['id', 'name', 'email', 'subject', 'message', 'status'],
    contacts: ['id', 'name', 'email', 'topic', 'message'],
    orders: ['id', 'reference', 'user_id', 'total_amount', 'shipping_address', 'status'],
    order_items: ['id', 'order_id', 'product_id', 'artwork_id', 'quantity', 'price']
};

const check = async () => {
    const result = await db.query(
        'SELECT table_name, column_name FROM information_schema.columns '
        + 'WHERE table_schema = current_schema()'
    );
    const actual = new Map();

    for (const row of result.rows) {
        if (!actual.has(row.table_name)) actual.set(row.table_name, new Set());
        actual.get(row.table_name).add(row.column_name);
    }

    const missing = [];
    for (const [table, columns] of Object.entries(requiredSchema)) {
        if (!actual.has(table)) {
            missing.push('table: ' + table);
            continue;
        }
        for (const column of columns) {
            if (!actual.get(table).has(column)) {
                missing.push('column: ' + table + '.' + column);
            }
        }
    }

    if (missing.length > 0) {
        console.error('Database schema is missing required items:');
        missing.forEach((item) => console.error('- ' + item));
        process.exitCode = 1;
        return;
    }

    console.log('Database schema is compatible with Gallery Noir API v2.0.0 (PostgreSQL)');
};

check()
    .catch((error) => {
        console.error('Database check failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => db.end());
