const Product = require('../models/productModel');
const { badRequest, notFound } = require('../utils/errors');
const toSlug = require('../utils/slug');
const validation = require('../utils/validation');

const categories = ['Apparel', 'Accessories', 'Prints', 'Homeware', 'Studio edition', 'Other'];

const parseProduct = (body, partial = false) => {
    const data = {};
    const has = (key) => Object.hasOwn(body, key);

    if (!partial || has('name')) {
        data.name = validation.requiredString(body.name, 'Name', { max: 180 });
    }
    if (!partial || has('slug')) {
        data.slug = validation.slug(body.slug || toSlug(data.name), 'Slug');
    }
    if (!partial || has('image_url') || has('image')) {
        data.image_url = validation.requiredString(body.image_url || body.image, 'Image URL', { max: 500 });
    }
    if (!partial || has('price')) {
        data.price = validation.money(body.price, 'Price');
    }
    if (has('description')) {
        data.description = validation.optionalString(body.description, 'Description', { max: 5000 });
    } else if (!partial) {
        data.description = null;
    }
    if (!partial || has('category') || has('type')) {
        data.category = validation.oneOf(body.category || body.type || 'Studio edition', 'Category', categories);
    }
    if (has('stock')) {
        data.stock = validation.integer(body.stock, 'Stock', { min: 0, max: 100000 });
    } else if (!partial) {
        data.stock = 0;
    }
    if (has('colors')) {
        data.colors = validation.stringArray(body.colors, 'Colours');
    } else if (!partial) {
        data.colors = [];
    }
    if (has('sizes')) {
        data.sizes = validation.stringArray(body.sizes, 'Sizes');
    } else if (!partial) {
        data.sizes = [];
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
    res.json(await Product.getAll(category));
};

exports.getById = async (req, res) => {
    const product = await Product.getById(validation.identifier(req.params.id));
    if (!product) throw notFound('Product not found');
    res.json(product);
};

exports.getByCategory = async (req, res) => {
    const category = validation.oneOf(req.params.category, 'Category', categories);
    res.json(await Product.getAll(category));
};

exports.create = async (req, res) => {
    const id = await Product.create(parseProduct(req.body));
    res.status(201).json(await Product.getById(id));
};

exports.update = async (req, res) => {
    const id = validation.identifier(req.params.id);
    const data = parseProduct(req.body, true);
    if (Object.keys(data).length === 0) throw badRequest('Provide at least one product field to update');
    if (!(await Product.update(id, data))) throw notFound('Product not found');
    res.json(await Product.getById(id));
};

exports.delete = async (req, res) => {
    if (!(await Product.delete(validation.identifier(req.params.id)))) {
        throw notFound('Product not found');
    }
    res.status(204).end();
};
