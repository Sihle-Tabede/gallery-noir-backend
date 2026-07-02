const db = require('../config/db');

const Contact = {
    // Submit a contact form (public)
    create: async (data) => {
        const { name, email, message } = data;
        const [result] = await db.query(
            'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
            [name, email, message]
        );
        return result.insertId;
    },

    // Get all submissions (admin dashboard)
    getAll: async () => {
        const [rows] = await db.query(
            'SELECT * FROM contacts ORDER BY created_at DESC'
        );
        return rows;
    },

    // Get single submission (admin)
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM contacts WHERE id = ?', [id]);
        return rows[0];
    },

    // Delete submission (admin)
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM contacts WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Contact;