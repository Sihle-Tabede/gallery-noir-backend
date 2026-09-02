const Contact = require('../models/contactModel');
const { notFound } = require('../utils/errors');
const validation = require('../utils/validation');

const topics = ['purchase', 'commission', 'merch', 'press', 'other'];

exports.create = async (req, res) => {
    const id = await Contact.create({
        name: validation.requiredString(req.body.name, 'Name', { max: 120 }),
        email: validation.email(req.body.email),
        topic: validation.oneOf(req.body.topic, 'Topic', topics),
        message: validation.requiredString(req.body.message, 'Message', { min: 5, max: 5000 })
    });

    res.status(201).json({
        message: 'Message sent successfully',
        id
    });
};

exports.getAll = async (_req, res) => {
    res.json(await Contact.getAll());
};

exports.getById = async (req, res) => {
    const item = await Contact.getById(validation.identifier(req.params.id));
    if (!item) throw notFound('Message not found');
    res.json(item);
};

exports.delete = async (req, res) => {
    if (!(await Contact.delete(validation.identifier(req.params.id)))) {
        throw notFound('Message not found');
    }
    res.status(204).end();
};
