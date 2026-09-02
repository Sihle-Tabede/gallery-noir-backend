const Order = require('../models/orderModel');
const { badRequest, notFound } = require('../utils/errors');
const validation = require('../utils/validation');

const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

const parseItems = (items) => {
    if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
        throw badRequest('Order must contain between 1 and 20 items');
    }

    return items.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw badRequest('Order item ' + (index + 1) + ' is invalid');
        }

        const hasProduct = item.product_id !== undefined && item.product_id !== null;
        const hasArtwork = item.artwork_id !== undefined && item.artwork_id !== null;

        if (hasProduct === hasArtwork) {
            throw badRequest('Each order item must reference either one product or one artwork');
        }

        return {
            product_id: hasProduct
                ? validation.integer(item.product_id, 'Product ID', { min: 1 })
                : null,
            artwork_id: hasArtwork
                ? validation.integer(item.artwork_id, 'Artwork ID', { min: 1 })
                : null,
            quantity: validation.integer(item.quantity || 1, 'Quantity', { min: 1, max: 99 })
        };
    });
};

const parseShippingAddress = (value) => {
    if (typeof value === 'string') {
        return {
            address: validation.requiredString(value, 'Shipping address', { min: 5, max: 1000 })
        };
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw badRequest('Shipping address is required');
    }

    const serialized = JSON.stringify(value);
    if (serialized.length > 3000) throw badRequest('Shipping address is too long');
    return value;
};

exports.createOrder = async (req, res) => {
    const orderId = await Order.createOrder({
        user_id: req.user.id,
        shipping_address: parseShippingAddress(req.body.shipping_address),
        items: parseItems(req.body.items)
    });

    res.status(201).json(await Order.getById(orderId));
};

exports.getMyOrders = async (req, res) => {
    res.json(await Order.getByUser(req.user.id));
};

exports.getById = async (req, res) => {
    const order = await Order.getById(validation.integer(req.params.id, 'Order ID', { min: 1 }));
    if (!order) throw notFound('Order not found');

    if (req.user.role !== 'admin' && Number(order.user_id) !== Number(req.user.id)) {
        return res.status(403).json({ message: 'Access denied to this order' });
    }

    res.json(order);
};

exports.getAll = async (_req, res) => {
    res.json(await Order.getAll());
};

exports.updateStatus = async (req, res) => {
    const id = validation.integer(req.params.id, 'Order ID', { min: 1 });
    const status = validation.oneOf(req.body.status, 'Status', statuses);
    if (!(await Order.updateStatus(id, status))) throw notFound('Order not found');
    res.json(await Order.getById(id));
};
