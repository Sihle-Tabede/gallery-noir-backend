const crypto = require('crypto');

const db = require('../config/db');
const { badRequest } = require('../utils/errors');
const { parseJson } = require('./queryHelpers');

const transitions = {
    pending: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
};

const mapOrder = (row) => row && ({
    ...row,
    total_amount: Number(row.total_amount),
    shipping_address: parseJson(row.shipping_address, {})
});

const mapOrderItem = (row) => ({
    ...row,
    price: Number(row.price)
});

const getByUser = async (userId) => {
    const result = await db.query(
        'SELECT id, reference, user_id, total_amount, shipping_address, status, created_at, updated_at '
        + 'FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    );
    return result.rows.map(mapOrder);
};

const getById = async (orderId) => {
    const orderResult = await db.query(
        'SELECT id, reference, user_id, total_amount, shipping_address, status, created_at, updated_at '
        + 'FROM orders WHERE id = $1 LIMIT 1',
        [orderId]
    );
    if (orderResult.rows.length === 0) return null;

    const itemResult = await db.query(
        'SELECT order_items.id, order_items.product_id, order_items.artwork_id, '
        + 'order_items.quantity, order_items.price, '
        + 'COALESCE(products.name, artworks.title) AS item_name, '
        + 'COALESCE(products.image_url, artworks.image_url) AS item_image '
        + 'FROM order_items '
        + 'LEFT JOIN products ON order_items.product_id = products.id '
        + 'LEFT JOIN artworks ON order_items.artwork_id = artworks.id '
        + 'WHERE order_items.order_id = $1 ORDER BY order_items.id ASC',
        [orderId]
    );

    return {
        ...mapOrder(orderResult.rows[0]),
        items: itemResult.rows.map(mapOrderItem)
    };
};

const resolveItems = async (client, items) => {
    const resolved = [];
    let totalCents = 0;

    for (const item of items) {
        if (item.product_id) {
            const result = await client.query(
                'SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE',
                [item.product_id]
            );
            const product = result.rows[0];
            if (!product) throw badRequest('Product ID ' + item.product_id + ' was not found');
            if (product.stock < item.quantity) {
                throw badRequest('Only ' + product.stock + ' units of ' + product.name + ' are available');
            }

            const unitCents = Math.round(Number(product.price) * 100);
            totalCents += unitCents * item.quantity;
            resolved.push({ ...item, price: unitCents / 100 });
            continue;
        }

        const result = await client.query(
            'SELECT id, title, price, status FROM artworks WHERE id = $1 FOR UPDATE',
            [item.artwork_id]
        );
        const artwork = result.rows[0];
        if (!artwork) throw badRequest('Artwork ID ' + item.artwork_id + ' was not found');
        if (item.quantity !== 1) throw badRequest('Original artworks can only be ordered once');
        if (artwork.status !== 'available') {
            throw badRequest(artwork.title + ' is no longer available');
        }
        if (artwork.price === null) {
            throw badRequest(artwork.title + ' is available by private inquiry only');
        }

        const unitCents = Math.round(Number(artwork.price) * 100);
        totalCents += unitCents;
        resolved.push({ ...item, price: unitCents / 100 });
    }

    return { items: resolved, total: totalCents / 100 };
};

const createOrder = ({ user_id, shipping_address, items }) => (
    db.withTransaction(async (client) => {
        const resolved = await resolveItems(client, items);
        const reference = 'GN-' + new Date().getFullYear() + '-'
            + crypto.randomBytes(4).toString('hex').toUpperCase();

        const orderResult = await client.query(
            'INSERT INTO orders (reference, user_id, total_amount, shipping_address, status) '
            + 'VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [reference, user_id, resolved.total, JSON.stringify(shipping_address), 'pending']
        );
        const orderId = orderResult.rows[0].id;

        for (const item of resolved.items) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, artwork_id, quantity, price) '
                + 'VALUES ($1, $2, $3, $4, $5)',
                [
                    orderId,
                    item.product_id,
                    item.artwork_id,
                    item.quantity,
                    item.price
                ]
            );

            if (item.product_id) {
                await client.query(
                    'UPDATE products SET stock = stock - $1 WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            } else {
                await client.query(
                    "UPDATE artworks SET status = 'sold' WHERE id = $1",
                    [item.artwork_id]
                );
            }
        }

        return orderId;
    })
);

const updateStatus = (orderId, nextStatus) => (
    db.withTransaction(async (client) => {
        const orderResult = await client.query(
            'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
            [orderId]
        );
        const order = orderResult.rows[0];
        if (!order) return false;
        if (order.status === nextStatus) return true;

        if (!transitions[order.status]?.includes(nextStatus)) {
            throw badRequest('Order cannot move from ' + order.status + ' to ' + nextStatus);
        }

        if (nextStatus === 'cancelled') {
            const itemResult = await client.query(
                'SELECT product_id, artwork_id, quantity FROM order_items WHERE order_id = $1',
                [orderId]
            );

            for (const item of itemResult.rows) {
                if (item.product_id) {
                    await client.query(
                        'UPDATE products SET stock = stock + $1 WHERE id = $2',
                        [item.quantity, item.product_id]
                    );
                } else if (item.artwork_id) {
                    await client.query(
                        "UPDATE artworks SET status = 'available' WHERE id = $1",
                        [item.artwork_id]
                    );
                }
            }
        }

        await client.query(
            'UPDATE orders SET status = $1 WHERE id = $2',
            [nextStatus, orderId]
        );
        return true;
    })
);

const Order = {
    getByUser,
    getById,

    getAll: async () => {
        const result = await db.query(
            'SELECT orders.id, orders.reference, orders.user_id, orders.total_amount, '
            + 'orders.shipping_address, orders.status, orders.created_at, orders.updated_at, '
            + 'users.email AS user_email, users.full_name AS customer_name '
            + 'FROM orders LEFT JOIN users ON orders.user_id = users.id '
            + 'ORDER BY orders.created_at DESC'
        );
        return result.rows.map(mapOrder);
    },

    createOrder,
    updateStatus
};

module.exports = Order;
