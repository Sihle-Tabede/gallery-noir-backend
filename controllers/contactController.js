const Contact = require('../models/contactModel');

// POST /api/contacts (Public)
exports.create = async (req, res, next) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Name, email, and message are required' });
        }
        const newId = await Contact.create({ name, email, message });
        res.status(201).json({ message: 'Message sent successfully', id: newId });
    } catch (error) {
        next(error);
    }
};

// GET /api/contacts (Admin only)
exports.getAll = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const messages = await Contact.getAll();
        res.status(200).json(messages);
    } catch (error) {
        next(error);
    }
};

// GET /api/contacts/:id (Admin only)
exports.getById = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id } = req.params;
        const message = await Contact.getById(id);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        res.status(200).json(message);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/contacts/:id (Admin only)
exports.delete = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id } = req.params;
        const success = await Contact.delete(id);
        if (!success) {
            return res.status(404).json({ message: 'Message not found' });
        }
        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        next(error);
    }
};