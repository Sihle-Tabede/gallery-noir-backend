const db = require('../config/db');
const {
    deleteRecord,
    identifierWhere,
    updateRecord
} = require('./queryHelpers');

const fields = [
    'blog_posts.id',
    'blog_posts.slug',
    'blog_posts.title',
    'blog_posts.excerpt',
    'blog_posts.content',
    'blog_posts.category',
    'blog_posts.image_url',
    'blog_posts.read_time_minutes',
    'blog_posts.status',
    'blog_posts.published_at',
    'blog_posts.created_at',
    'blog_posts.updated_at',
    'users.full_name AS author_name'
].join(', ');

const mapPost = (row) => row && ({
    ...row,
    image: row.image_url,
    date: row.published_at,
    readTime: row.read_time_minutes + ' min read'
});

const Blog = {
    getAll: async () => {
        const result = await db.query(
            'SELECT ' + fields
            + ' FROM blog_posts LEFT JOIN users ON blog_posts.author_id = users.id'
            + " WHERE blog_posts.status = 'published'"
            + ' ORDER BY blog_posts.published_at DESC, blog_posts.created_at DESC'
        );
        return result.rows.map(mapPost);
    },

    getById: async (identifier, includeDraft = false) => {
        const where = identifierWhere(identifier);
        const qualifiedWhere = where.sql.replace(/^id/, 'blog_posts.id').replace(/^slug/, 'blog_posts.slug');
        const result = await db.query(
            'SELECT ' + fields
            + ' FROM blog_posts LEFT JOIN users ON blog_posts.author_id = users.id'
            + ' WHERE ' + qualifiedWhere
            + (includeDraft ? '' : " AND blog_posts.status = 'published'")
            + ' LIMIT 1',
            where.params
        );
        return mapPost(result.rows[0]);
    },

    create: async (data) => {
        const result = await db.query(
            'INSERT INTO blog_posts '
            + '(slug, title, excerpt, content, category, image_url, read_time_minutes, status, author_id, published_at) '
            + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
            [
                data.slug,
                data.title,
                data.excerpt,
                data.content,
                data.category,
                data.image_url,
                data.read_time_minutes,
                data.status,
                data.author_id,
                data.status === 'published' ? new Date() : null
            ]
        );
        return result.rows[0].id;
    },

    update: async (identifier, data) => {
        const current = await Blog.getById(identifier, true);
        if (!current) return false;

        const updateData = { ...data };
        if (data.status === 'published' && current.status !== 'published') {
            updateData.published_at = new Date();
        }

        return updateRecord(
            'blog_posts',
            identifier,
            updateData,
            [
                'slug',
                'title',
                'excerpt',
                'content',
                'category',
                'image_url',
                'read_time_minutes',
                'status',
                'published_at'
            ]
        );
    },

    delete: (identifier) => deleteRecord('blog_posts', identifier)
};

module.exports = Blog;
