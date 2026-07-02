const db = require('../config/db');

const Blog = {
    // Get all posts with author name (joining users table)
    getAll: async () => {
        const [rows] = await db.query(
            `SELECT blog_posts.*, users.full_name as author_name 
             FROM blog_posts 
             LEFT JOIN users ON blog_posts.author_id = users.id 
             ORDER BY blog_posts.published_at DESC`
        );
        return rows;
    },

    // Get single post with author name
    getById: async (id) => {
        const [rows] = await db.query(
            `SELECT blog_posts.*, users.full_name as author_name 
             FROM blog_posts 
             LEFT JOIN users ON blog_posts.author_id = users.id 
             WHERE blog_posts.id = ?`,
            [id]
        );
        return rows[0];
    },

    // Create post (admin only)
    create: async (data) => {
        const { title, content, author_id, image_url } = data;
        const [result] = await db.query(
            'INSERT INTO blog_posts (title, content, author_id, image_url) VALUES (?, ?, ?, ?)',
            [title, content, author_id, image_url]
        );
        return result.insertId;
    },

    // Update post (admin)
    update: async (id, data) => {
        const { title, content, image_url } = data;
        const [result] = await db.query(
            'UPDATE blog_posts SET title = COALESCE(?, title), content = COALESCE(?, content), image_url = COALESCE(?, image_url) WHERE id = ?',
            [title, content, image_url, id]
        );
        return result.affectedRows > 0;
    },

    // Delete post (admin)
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM blog_posts WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Blog;