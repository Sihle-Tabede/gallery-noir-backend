const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Artwork = require('../models/artworkModel');

// POST /api/orders (Authenticated user)
exports.createOrder = async (req, res, next) => {
    try {
        const { items, shipping_address } = req.body;
        const userId = req.user.id;

        // Basic validation
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Order must contain at least one item' });
        }
        if (!shipping_address) {
            return res.status(400).json({ message: 'Shipping address is required' });
        }

        // 1. Validate each item and calculate the real total
        let calculatedTotal = 0;
        for (const item of items) {
            let price = 0;
            let exists = false;

            if (item.product_id) {
                const product = await Product.getById(item.product_id);
                if (!product) {
                    return res.status(400).json({ message: `Product ID ${item.product_id} not found` });
                }
                price = parseFloat(product.price);
                exists = true;
            } else if (item.artwork_id) {
                const artwork = await Artwork.getById(item.artwork_id);
                if (!artwork) {
                    return res.status(400).json({ message: `Artwork ID ${item.artwork_id} not found` });
                }
                price = parseFloat(artwork.price);
                exists = true;
            } else {
                return res.status(400).json({ message: 'Each item must have either product_id or artwork_id' });
            }

            if (!exists) continue;
            if (!item.quantity || item.quantity <= 0) {
                return res.status(400).json({ message: 'Invalid quantity for an item' });
            }

            // Use the price from the database, NOT from the request body
            item.price = price;
            calculatedTotal += price * item.quantity;
        }

        // Optional: Check if front-end sent a total, and if it matches
        // if (req.body.total_amount && Math.abs(req.body.total_amount - calculatedTotal) > 0.01) {
        //     return res.status(400).json({ message: 'Total amount mismatch' });
        // }

        // 2. Create the order (Model handles the transaction)
        const orderId = await Order.createOrder({
            user_id: userId,
            total_amount: calculatedTotal,
            shipping_address,
            items
        });

        // 3. Fetch the complete order details to return
        const newOrder = await Order.getById(orderId);
        res.status(201).json(newOrder);

    } catch (error) {
        next(error);
    }
};

// GET /api/orders (Get current user's orders)
exports.getMyOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const orders = await Order.getByUser(userId);
        res.status(200).json(orders);
    } catch (error) {
        next(error);
    }
};

// GET /api/orders/:id (Get specific order – user can see own, admin can see any)
exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.getById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Authorization: user can only see their own order unless admin
        if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Access denied to this order' });
        }

        res.status(200).json(order);
    } catch (error) {
        next(error);
    }
};

// GET /api/orders/all (Admin only – get all orders)
exports.getAll = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const orders = await Order.getAll();
        res.status(200).json(orders);
    } catch (error) {
        next(error);
    }
};

// PATCH /api/orders/:id/status (Admin only)
exports.updateStatus = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const success = await Order.updateStatus(id, status);
        if (!success) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const updated = await Order.getById(id);
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};