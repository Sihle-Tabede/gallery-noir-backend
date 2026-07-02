const Inquiry = require('../models/inquiryModel');

// POST /api/inquiries (Public) – the dialog box
exports.create = async (req, res, next) => {
    try {
        const { email, subject, message } = req.body;
        if (!email || !message) {
            return res.status(400).json({ message: 'Email and message are required' });
        }
        // If user is logged in, attach their ID; otherwise null
        const user_id = req.user ? req.user.id : null;
        const newId = await Inquiry.create({ user_id, email, subject, message });
        res.status(201).json({ message: 'Inquiry sent successfully', id: newId });
    } catch (error) {
        next(error);
    }
};

// GET /api/inquiries (Admin only)
exports.getAll = async (req, res, next) => {
    try {
        // Check if admin (you can also use a separate middleware, but we check here too)
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const inquiries = await Inquiry.getAll();
        res.status(200).json(inquiries);
    } catch (error) {
        next(error);
    }
};

// GET /api/inquiries/:id (Admin only)
exports.getById = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id } = req.params;
        const inquiry = await Inquiry.getById(id);
        if (!inquiry) {
            return res.status(404).json({ message: 'Inquiry not found' });
        }
        res.status(200).json(inquiry);
    } catch (error) {
        next(error);
    }
};

// PATCH /api/inquiries/:id/status (Admin only)
exports.updateStatus = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id } = req.params;
        const { status } = req.body;
        if (!['new', 'read', 'replied'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        const success = await Inquiry.updateStatus(id, status);
        if (!success) {
            return res.status(404).json({ message: 'Inquiry not found' });
        }
        res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/inquiries/:id (Admin only)
exports.delete = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id } = req.params;
        const success = await Inquiry.delete(id);
        if (!success) {
            return res.status(404).json({ message: 'Inquiry not found' });
        }
        res.status(200).json({ message: 'Inquiry deleted successfully' });
    } catch (error) {
        next(error);
    }
};