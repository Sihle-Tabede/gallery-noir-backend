const db = require('../config/db');
const {
    deleteRecord,
    identifierWhere,
    parseJson,
    updateRecord
} = require('./queryHelpers');

const fields = [
    'id',
    'slug',
    'name',
    'description',
    'price',
    'stock',
    'image_url',
    'category',
    'colors',
    'sizes',
    'featured',
    'display_order',
    'created_at',
    'updated_at'
].join(', ');

const mapProduct = (row) => row && ({
    ...row,
    price: Number(row.price),
    image: row.image_url,
    type: row.category,
    colors: parseJson(row.colors, []),
    sizes: parseJson(row.sizes, []),
    featured: Boolean(row.featured)
});

const getById = async (identifier) => {
    const where = identifierWhere(identifier);
    const result = await db.query(
        'SELECT ' + fields + ' FROM products WHERE ' + where.sql + ' LIMIT 1',
        where.params
    );
    return mapProduct(result.rows[0]);
};

const Product = {
    getAll: async (category = null) => {
        const where = category ? ' WHERE category = $1' : '';
        const result = await db.query(
            'SELECT ' + fields + ' FROM products' + where
            + ' ORDER BY featured DESC, display_order ASC, created_at DESC',
            category ? [category] : []
        );
        return result.rows.map(mapProduct);
    },

    getById,

    create: async (data) => {
        const result = await db.query(
            'INSERT INTO products '
            + '(slug, name, description, price, stock, image_url, category, colors, sizes, featured, display_order) '
            + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id',
            [
                data.slug,
                data.name,
                data.description,
                data.price,
                data.stock,
                data.image_url,
                data.category,
                JSON.stringify(data.colors),
                JSON.stringify(data.sizes),
                data.featured,
                data.display_order
            ]
        );
        return result.rows[0].id;
    },

    update: (identifier, data) => {
        const serialized = { ...data };
        if (Object.hasOwn(serialized, 'colors')) serialized.colors = JSON.stringify(serialized.colors);
        if (Object.hasOwn(serialized, 'sizes')) serialized.sizes = JSON.stringify(serialized.sizes);
        return updateRecord(
            'products',
            identifier,
            serialized,
            [
                'slug',
                'name',
                'description',
                'price',
                'stock',
                'image_url',
                'category',
                'colors',
                'sizes',
                'featured',
                'display_order'
            ]
        );
    },

    delete: (identifier) => deleteRecord('products', identifier)
};

module.exports = Product;
