const Product = require('../models/productModel');

// GET /api/products
exports.getAll = async (req, res, next) => {
    try {
        const { category } = req.query;
        const products = await Product.getAll(category);
        res.status(200).json(products);
    } catch (error) {
        next(error);
    }
};

// GET /api/products/:id
exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await Product.getById(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

// GET /api/products/category/:category (specific helper)
exports.getByCategory = async (req, res, next) => {
    try {
        const { category } = req.params;
        const products = await Product.getByCategory(category);
        res.status(200).json(products);
    } catch (error) {
        next(error);
    }
};

// POST /api/products (Admin only)
exports.create = async (req, res, next) => {
    try {
        const { name, description, price, stock, image_url, category } = req.body;
        if (!name || !price) {
            return res.status(400).json({ message: 'Name and price are required' });
        }
        const newId = await Product.create({ name, description, price, stock, image_url, category });
        const created = await Product.getById(newId);
        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
};

// PUT /api/products/:id (Admin only)
exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, image_url, category } = req.body;
        const success = await Product.update(id, { name, description, price, stock, image_url, category });
        if (!success) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const updated = await Product.getById(id);
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/products/:id (Admin only)
exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await Product.delete(id);
        if (!success) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
};