const Blog = require('../models/blogModel');

// GET /api/blog
exports.getAll = async (req, res, next) => {
    try {
        const posts = await Blog.getAll();
        res.status(200).json(posts);
    } catch (error) {
        next(error);
    }
};

// GET /api/blog/:id
exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const post = await Blog.getById(id);
        if (!post) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.status(200).json(post);
    } catch (error) {
        next(error);
    }
};

// POST /api/blog (Admin only)
exports.create = async (req, res, next) => {
    try {
        const { title, content, image_url } = req.body;
        // author_id comes from the logged-in user (req.user.id)
        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }
        const author_id = req.user.id; // from auth middleware
        const newId = await Blog.create({ title, content, author_id, image_url });
        const created = await Blog.getById(newId);
        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
};

// PUT /api/blog/:id (Admin only)
exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, content, image_url } = req.body;
        const success = await Blog.update(id, { title, content, image_url });
        if (!success) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        const updated = await Blog.getById(id);
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/blog/:id (Admin only)
exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await Blog.delete(id);
        if (!success) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.status(200).json({ message: 'Blog post deleted successfully' });
    } catch (error) {
        next(error);
    }
};