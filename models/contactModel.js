const db = require('../config/db');

const Contact = {
    create: async ({ name, email, topic, message }) => {
        const result = await db.query(
            'INSERT INTO contacts (name, email, topic, message) '
            + 'VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, topic, message]
        );
        return result.rows[0].id;
    },

    getAll: async () => {
        const result = await db.query(
            'SELECT id, name, email, topic, message, created_at FROM contacts ORDER BY created_at DESC'
        );
        return result.rows;
    },

    getById: async (id) => {
        const result = await db.query(
            'SELECT id, name, email, topic, message, created_at FROM contacts WHERE id = $1 LIMIT 1',
            [id]
        );
        return result.rows[0];
    },

    delete: async (id) => {
        const result = await db.query('DELETE FROM contacts WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
};

module.exports = Contact;
