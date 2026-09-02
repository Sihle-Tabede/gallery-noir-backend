const Artwork = require('../models/artworkModel');
const { badRequest, notFound } = require('../utils/errors');
const toSlug = require('../utils/slug');
const validation = require('../utils/validation');

const statuses = ['available', 'sold', 'private'];
const categories = ['painting', 'drawing', 'mixed-media', 'photography', 'sculpture', 'other'];

const parseArtwork = (body, partial = false) => {
    const data = {};
    const has = (key) => Object.hasOwn(body, key);

    if (!partial || has('title')) {
        data.title = validation.requiredString(body.title, 'Title', { max: 180 });
    }
    if (!partial || has('slug')) {
        data.slug = validation.slug(body.slug || toSlug(data.title), 'Slug');
    }
    if (!partial || has('image_url')) {
        data.image_url = validation.requiredString(body.image_url, 'Image URL', { max: 500 });
    }
    if (has('description')) {
        data.description = validation.optionalString(body.description, 'Description', { max: 5000 });
    } else if (!partial) {
        data.description = null;
    }
    if (has('medium')) {
        data.medium = validation.optionalString(body.medium, 'Medium', { max: 180 });
    } else if (!partial) {
        data.medium = null;
    }
    if (has('category')) {
        data.category = validation.oneOf(body.category, 'Category', categories);
    } else if (!partial) {
        data.category = 'painting';
    }
    if (has('year')) {
        data.year = validation.integer(body.year, 'Year', {
            min: 1900,
            max: new Date().getFullYear() + 1
        });
    } else if (!partial) {
        data.year = new Date().getFullYear();
    }
    if (has('dimensions')) {
        data.dimensions = validation.optionalString(body.dimensions, 'Dimensions', { max: 180 });
    } else if (!partial) {
        data.dimensions = null;
    }
    if (has('price')) {
        data.price = validation.money(body.price, 'Price', { allowNull: true });
    } else if (!partial) {
        data.price = null;
    }
    if (has('status')) {
        data.status = validation.oneOf(body.status, 'Status', statuses);
    } else if (has('is_available')) {
        data.status = validation.boolean(body.is_available, true) ? 'available' : 'sold';
    } else if (!partial) {
        data.status = 'available';
    }
    if (has('featured')) {
        data.featured = validation.boolean(body.featured, false);
    } else if (!partial) {
        data.featured = false;
    }
    if (has('display_order')) {
        data.display_order = validation.integer(body.display_order, 'Display order', {
            min: 0,
            max: 100000
        });
    } else if (!partial) {
        data.display_order = 0;
    }

    return data;
};

exports.getAll = async (req, res) => {
    const category = req.query.category
        ? validation.oneOf(req.query.category, 'Category', categories)
        : null;
    res.json(await Artwork.getAll(category));
};

exports.getFeatured = async (req, res) => {
    const limit = validation.integer(req.query.limit || 4, 'Limit', { min: 1, max: 12 });
    res.json(await Artwork.getFeatured(limit));
};

exports.getById = async (req, res) => {
    const artwork = await Artwork.getById(validation.identifier(req.params.id));
    if (!artwork) throw notFound('Artwork not found');
    res.json(artwork);
};

exports.create = async (req, res) => {
    const id = await Artwork.create(parseArtwork(req.body));
    res.status(201).json(await Artwork.getById(id));
};

exports.update = async (req, res) => {
    const id = validation.identifier(req.params.id);
    const data = parseArtwork(req.body, true);
    if (Object.keys(data).length === 0) throw badRequest('Provide at least one artwork field to update');
    if (!(await Artwork.update(id, data))) throw notFound('Artwork not found');
    res.json(await Artwork.getById(id));
};

exports.delete = async (req, res) => {
    if (!(await Artwork.delete(validation.identifier(req.params.id)))) {
        throw notFound('Artwork not found');
    }
    res.status(204).end();
};
