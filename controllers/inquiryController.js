const Inquiry = require('../models/inquiryModel');
const { notFound } = require('../utils/errors');
const validation = require('../utils/validation');

const statuses = ['new', 'read', 'replied', 'closed'];

exports.create = async (req, res) => {
    const id = await Inquiry.create({
        user_id: req.user?.id || null,
        name: validation.requiredString(req.body.name, 'Name', { max: 120 }),
        email: validation.email(req.body.email),
        subject: validation.requiredString(req.body.subject, 'Subject', { max: 220 }),
        message: validation.requiredString(req.body.message, 'Message', { min: 5, max: 5000 })
    });

    res.status(201).json({
        message: 'Inquiry sent successfully',
        id
    });
};

exports.getAll = async (_req, res) => {
    res.json(await Inquiry.getAll());
};

exports.getById = async (req, res) => {
    const item = await Inquiry.getById(validation.identifier(req.params.id));
    if (!item) throw notFound('Inquiry not found');
    res.json(item);
};

exports.updateStatus = async (req, res) => {
    const id = validation.identifier(req.params.id);
    const status = validation.oneOf(req.body.status, 'Status', statuses);
    if (!(await Inquiry.updateStatus(id, status))) throw notFound('Inquiry not found');
    res.json(await Inquiry.getById(id));
};

exports.delete = async (req, res) => {
    if (!(await Inquiry.delete(validation.identifier(req.params.id)))) {
        throw notFound('Inquiry not found');
    }
    res.status(204).end();
};
