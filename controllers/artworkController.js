const Artwork = require('../models/artworkModel');

// GET /api/artworks
exports.getAll = async (req, res, next) => {
    try {
        const artworks = await Artwork.getAll();
        res.status(200).json(artworks);
    } catch (error) {
        next(error);
    }
};

// GET /api/artworks/featured (optional helper for your hero)
exports.getFeatured = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 4;
        const featured = await Artwork.getFeatured(limit);
        res.status(200).json(featured);
    } catch (error) {
        next(error);
    }
};

// GET /api/artworks/:id
exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const artwork = await Artwork.getById(id);
        if (!artwork) {
            return res.status(404).json({ message: 'Artwork not found' });
        }
        res.status(200).json(artwork);
    } catch (error) {
        next(error);
    }
};

// POST /api/artworks (Admin only)
exports.create = async (req, res, next) => {
    try {
        const { title, description, image_url, price, is_available } = req.body;
        // Basic validation
        if (!title || !image_url) {
            return res.status(400).json({ message: 'Title and image_url are required' });
        }
        const newId = await Artwork.create({
            title,
            description,
            image_url,
            price: price || 0.00,
            is_available
        });
        const created = await Artwork.getById(newId);
        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
};

// PUT /api/artworks/:id (Admin only)
exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, image_url, price, is_available } = req.body;
        const success = await Artwork.update(id, { title, description, image_url, price, is_available });
        if (!success) {
            return res.status(404).json({ message: 'Artwork not found or nothing to update' });
        }
        const updated = await Artwork.getById(id);
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/artworks/:id (Admin only)
exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await Artwork.delete(id);
        if (!success) {
            return res.status(404).json({ message: 'Artwork not found' });
        }
        res.status(200).json({ message: 'Artwork deleted successfully' });
    } catch (error) {
        next(error);
    }
};