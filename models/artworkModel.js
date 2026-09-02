const db = require('../config/db');
const {
    deleteRecord,
    identifierWhere,
    updateRecord
} = require('./queryHelpers');

const fields = [
    'id',
    'slug',
    'title',
    'description',
    'medium',
    'category',
    'year',
    'dimensions',
    'price',
    'status',
    'image_url',
    'featured',
    'display_order',
    'created_at',
    'updated_at'
].join(', ');

const mapArtwork = (row) => row && ({
    ...row,
    price: row.price === null ? null : Number(row.price),
    image: row.image_url,
    is_available: row.status === 'available',
    featured: Boolean(row.featured)
});

const getById = async (identifier) => {
    const where = identifierWhere(identifier);
    const result = await db.query(
        'SELECT ' + fields + ' FROM artworks WHERE ' + where.sql + ' LIMIT 1',
        where.params
    );
    return mapArtwork(result.rows[0]);
};

const Artwork = {
    getAll: async (category = null) => {
        const where = category ? ' WHERE category = $1' : '';
        const result = await db.query(
            'SELECT ' + fields + ' FROM artworks' + where
            + ' ORDER BY display_order ASC, created_at DESC',
            category ? [category] : []
        );
        return result.rows.map(mapArtwork);
    },

    getById,

    getFeatured: async (limit = 4) => {
        const result = await db.query(
            'SELECT ' + fields
            + " FROM artworks WHERE status = 'available'"
            + ' ORDER BY featured DESC, display_order ASC, created_at DESC LIMIT $1',
            [limit]
        );
        return result.rows.map(mapArtwork);
    },

    create: async (data) => {
        const result = await db.query(
            'INSERT INTO artworks '
            + '(slug, title, description, medium, category, year, dimensions, price, status, image_url, featured, display_order) '
            + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id',
            [
                data.slug,
                data.title,
                data.description,
                data.medium,
                data.category,
                data.year,
                data.dimensions,
                data.price,
                data.status,
                data.image_url,
                data.featured,
                data.display_order
            ]
        );
        return result.rows[0].id;
    },

    update: (identifier, data) => updateRecord(
        'artworks',
        identifier,
        data,
        [
            'slug',
            'title',
            'description',
            'medium',
            'category',
            'year',
            'dimensions',
            'price',
            'status',
            'image_url',
            'featured',
            'display_order'
        ]
    ),

    delete: (identifier) => deleteRecord('artworks', identifier)
};

module.exports = Artwork;
