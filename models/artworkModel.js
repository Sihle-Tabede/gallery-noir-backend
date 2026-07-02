const db = require('../config/db');

const Artwork = {
    // Get all available artworks (for the gallery page)
    getAll: async () => {
        const [rows] = await db.query(
            'SELECT * FROM artworks ORDER BY created_at DESC'
        );
        return rows;
    },

    // Get a single artwork by ID
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM artworks WHERE id = ?', [id]);
        return rows[0];
    },

    // Get featured works (for your hero or featured section - e.g., limit 4)
    getFeatured: async (limit = 4) => {
        const [rows] = await db.query(
            'SELECT * FROM artworks WHERE is_available = true ORDER BY RAND() LIMIT ?',
            [limit]
        );
        return rows;
    },

    // Create new artwork (admin)
    create: async (data) => {
        const { title, description, image_url, price, is_available } = data;
        const [result] = await db.query(
            'INSERT INTO artworks (title, description, image_url, price, is_available) VALUES (?, ?, ?, ?, ?)',
            [title, description, image_url, price, is_available !== undefined ? is_available : true]
        );
        return result.insertId;
    },

    // Update artwork (admin)
    update: async (id, data) => {
        const { title, description, image_url, price, is_available } = data;
        const [result] = await db.query(
            `UPDATE artworks SET 
                title = COALESCE(?, title), 
                description = COALESCE(?, description), 
                image_url = COALESCE(?, image_url), 
                price = COALESCE(?, price), 
                is_available = COALESCE(?, is_available) 
            WHERE id = ?`,
            [title, description, image_url, price, is_available, id]
        );
        return result.affectedRows > 0;
    },

    // Delete artwork (admin)
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM artworks WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Artwork;