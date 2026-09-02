const db = require('../config/db');

const Inquiry = {
    create: async ({ user_id, name, email, subject, message }) => {
        const result = await db.query(
            'INSERT INTO inquiries (user_id, name, email, subject, message) '
            + 'VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [user_id, name, email, subject, message]
        );
        return result.rows[0].id;
    },

    getAll: async () => {
        const result = await db.query(
            'SELECT id, user_id, name, email, subject, message, status, created_at, updated_at '
            + 'FROM inquiries ORDER BY created_at DESC'
        );
        return result.rows;
    },

    getById: async (id) => {
        const result = await db.query(
            'SELECT id, user_id, name, email, subject, message, status, created_at, updated_at '
            + 'FROM inquiries WHERE id = $1 LIMIT 1',
            [id]
        );
        return result.rows[0];
    },

    updateStatus: async (id, status) => {
        const result = await db.query(
            'UPDATE inquiries SET status = $1 WHERE id = $2',
            [status, id]
        );
        return result.rowCount > 0;
    },

    delete: async (id) => {
        const result = await db.query('DELETE FROM inquiries WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
};

module.exports = Inquiry;
