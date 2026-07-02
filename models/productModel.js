const db = require('../config/db');

const Product = {
    // Get all products (with optional category filter)
    getAll: async (category = null) => {
        let sql = 'SELECT * FROM products ORDER BY created_at DESC';
        const params = [];
        if (category) {
            sql = 'SELECT * FROM products WHERE category = ? ORDER BY created_at DESC';
            params.push(category);
        }
        const [rows] = await db.query(sql, params);
        return rows;
    },

    // Get single product
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        return rows[0];
    },

    // Get products by category (specific helper)
    getByCategory: async (category) => {
        const [rows] = await db.query(
            'SELECT * FROM products WHERE category = ? AND stock > 0',
            [category]
        );
        return rows;
    },

    // Create product (admin)
    create: async (data) => {
        const { name, description, price, stock, image_url, category } = data;
        const [result] = await db.query(
            'INSERT INTO products (name, description, price, stock, image_url, category) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, stock || 0, image_url, category]
        );
        return result.insertId;
    },

    // Update product (admin)
    update: async (id, data) => {
        const { name, description, price, stock, image_url, category } = data;
        const [result] = await db.query(
            `UPDATE products SET 
                name = COALESCE(?, name), 
                description = COALESCE(?, description), 
                price = COALESCE(?, price), 
                stock = COALESCE(?, stock), 
                image_url = COALESCE(?, image_url), 
                category = COALESCE(?, category) 
            WHERE id = ?`,
            [name, description, price, stock, image_url, category, id]
        );
        return result.affectedRows > 0;
    },

    // Update stock specifically (used when an order is placed)
    updateStock: async (id, quantitySold) => {
        const [result] = await db.query(
            'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
            [quantitySold, id, quantitySold]
        );
        return result.affectedRows > 0;
    },

    // Delete product (admin)
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Product;