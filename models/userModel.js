const db = require('../config/db');

const publicFields = 'id, email, full_name, phone, role, created_at, updated_at';

const User = {
    findAuthByEmail: async (email) => {
        const result = await db.query(
            'SELECT ' + publicFields + ', password_hash FROM users WHERE email = $1 LIMIT 1',
            [email]
        );
        return result.rows[0];
    },

    findByEmail: async (email) => {
        const result = await db.query(
            'SELECT ' + publicFields + ' FROM users WHERE email = $1 LIMIT 1',
            [email]
        );
        return result.rows[0];
    },

    findById: async (id) => {
        const result = await db.query(
            'SELECT ' + publicFields + ' FROM users WHERE id = $1 LIMIT 1',
            [id]
        );
        return result.rows[0];
    },

    create: async ({ email, password_hash, full_name, phone, role = 'customer' }) => {
        const result = await db.query(
            'INSERT INTO users (email, password_hash, full_name, phone, role) '
            + 'VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [email, password_hash, full_name, phone, role]
        );
        return result.rows[0].id;
    },

    update: async (id, updates) => {
        const allowedFields = ['email', 'full_name', 'phone'];
        const fields = allowedFields.filter((field) => Object.hasOwn(updates, field));
        if (fields.length === 0) return false;

        const setClause = fields.map((field, index) => field + ' = $' + (index + 1)).join(', ');
        const values = fields.map((field) => updates[field]);
        const result = await db.query(
            'UPDATE users SET ' + setClause + ' WHERE id = $' + (fields.length + 1),
            [...values, id]
        );
        return result.rowCount > 0;
    }
};

module.exports = User;
