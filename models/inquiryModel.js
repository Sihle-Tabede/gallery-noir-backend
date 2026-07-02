const db = require('../config/db');

const Inquiry = {
    // Create a new inquiry (public, from the dialog)
    create: async (data) => {
        const { user_id, email, subject, message } = data;
        const [result] = await db.query(
            'INSERT INTO inquiries (user_id, email, subject, message) VALUES (?, ?, ?, ?)',
            [user_id || null, email, subject, message]
        );
        return result.insertId;
    },

    // Get all inquiries (admin dashboard)
    getAll: async () => {
        const [rows] = await db.query(
            'SELECT * FROM inquiries ORDER BY created_at DESC'
        );
        return rows;
    },

    // Get a single inquiry by ID (admin)
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM inquiries WHERE id = ?', [id]);
        return rows[0];
    },

    // Update status (e.g., 'read', 'replied') - admin
    updateStatus: async (id, status) => {
        const [result] = await db.query(
            'UPDATE inquiries SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    },

    // Delete inquiry (admin)
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM inquiries WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Inquiry;