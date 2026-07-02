const db = require('../config/db');

const User = {
    // Find user by email (for login/registration check)
    findByEmail: async (email) => {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0]; // returns undefined if not found
    },

    // Find user by ID (excludes password hash for safety)
    findById: async (id) => {
        const [rows] = await db.query(
            'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    },

    // Create a new user
    create: async (userData) => {
        const { email, password_hash, full_name, role } = userData;
        const [result] = await db.query(
            'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [email, password_hash, full_name, role || 'customer']
        );
        return result.insertId; // returns the new user's ID
    },

    // Update user profile (admin or self)
    update: async (id, updates) => {
        const { full_name, email } = updates;
        const [result] = await db.query(
            'UPDATE users SET full_name = ?, email = ? WHERE id = ?',
            [full_name, email, id]
        );
        return result.affectedRows > 0;
    },

    // Delete user (admin only)
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = User;