const Blog = require('../models/blogModel');
const { badRequest, notFound } = require('../utils/errors');
const toSlug = require('../utils/slug');
const validation = require('../utils/validation');

const statuses = ['draft', 'published'];

const parseBlogPost = (body, partial = false) => {
    const data = {};
    const has = (key) => Object.hasOwn(body, key);

    if (!partial || has('title')) {
        data.title = validation.requiredString(body.title, 'Title', { max: 220 });
    }
    if (!partial || has('slug')) {
        data.slug = validation.slug(body.slug || toSlug(data.title), 'Slug');
    }
    if (!partial || has('content')) {
        data.content = validation.requiredString(body.content, 'Content', { max: 100000 });
    }
    if (has('excerpt')) {
        data.excerpt = validation.optionalString(body.excerpt, 'Excerpt', { max: 600 });
    } else if (!partial) {
        data.excerpt = null;
    }
    if (has('category')) {
        data.category = validation.optionalString(body.category, 'Category', { max: 100 });
    } else if (!partial) {
        data.category = 'Studio update';
    }
    if (has('image_url') || has('image')) {
        data.image_url = validation.optionalString(body.image_url || body.image, 'Image URL', { max: 500 });
    } else if (!partial) {
        data.image_url = null;
    }
    if (has('read_time_minutes')) {
        data.read_time_minutes = validation.integer(body.read_time_minutes, 'Read time', {
            min: 1,
            max: 120
        });
    } else if (!partial) {
        data.read_time_minutes = 3;
    }
    if (has('status')) {
        data.status = validation.oneOf(body.status, 'Status', statuses);
    } else if (!partial) {
        data.status = 'published';
    }

    return data;
};

exports.getAll = async (_req, res) => {
    res.json(await Blog.getAll());
};

exports.getById = async (req, res) => {
    const post = await Blog.getById(validation.identifier(req.params.id));
    if (!post) throw notFound('Blog post not found');
    res.json(post);
};

exports.create = async (req, res) => {
    const id = await Blog.create({
        ...parseBlogPost(req.body),
        author_id: req.user.id
    });
    res.status(201).json(await Blog.getById(id, true));
};

exports.update = async (req, res) => {
    const id = validation.identifier(req.params.id);
    const data = parseBlogPost(req.body, true);
    if (Object.keys(data).length === 0) throw badRequest('Provide at least one blog field to update');
    if (!(await Blog.update(id, data))) throw notFound('Blog post not found');
    res.json(await Blog.getById(id, true));
};

exports.delete = async (req, res) => {
    if (!(await Blog.delete(validation.identifier(req.params.id)))) {
        throw notFound('Blog post not found');
    }
    res.status(204).end();
};
