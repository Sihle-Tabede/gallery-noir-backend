const db = require('../config/db');

const Order = {
    // Get all orders for a specific user (for their order history)
    getByUser: async (userId) => {
        const [rows] = await db.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    },

    // Get a single order with its items (for order detail page)
    getById: async (orderId) => {
        // Get the order header
        const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (orderRows.length === 0) return null;

        // Get the line items, joining products/artworks to show names
        const [items] = await db.query(
            `SELECT 
                order_items.*,
                COALESCE(products.name, artworks.title) as item_name,
                COALESCE(products.image_url, artworks.image_url) as item_image
             FROM order_items
             LEFT JOIN products ON order_items.product_id = products.id
             LEFT JOIN artworks ON order_items.artwork_id = artworks.id
             WHERE order_items.order_id = ?`,
            [orderId]
        );

        return { ...orderRows[0], items };
    },

    // Get all orders (admin dashboard)
    getAll: async () => {
        const [rows] = await db.query(
            `SELECT orders.*, users.email as user_email 
             FROM orders 
             LEFT JOIN users ON orders.user_id = users.id 
             ORDER BY orders.created_at DESC`
        );
        return rows;
    },

    // Create an order (with items) using a TRANSACTION
    createOrder: async (orderData) => {
        const { user_id, total_amount, shipping_address, items } = orderData;
        // items = [{ product_id, artwork_id, quantity, price }, ...]

        // Start transaction
        await db.query('START TRANSACTION');

        try {
            // 1. Insert the order header
            const [orderResult] = await db.query(
                'INSERT INTO orders (user_id, total_amount, shipping_address) VALUES (?, ?, ?)',
                [user_id, total_amount, shipping_address]
            );
            const orderId = orderResult.insertId;

            // 2. Insert all order items and update stock (if products)
            for (const item of items) {
                // Insert item
                await db.query(
                    `INSERT INTO order_items (order_id, product_id, artwork_id, quantity, price) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [orderId, item.product_id || null, item.artwork_id || null, item.quantity, item.price]
                );

                // If it's a product (not an artwork), reduce stock
                if (item.product_id) {
                    const [updateResult] = await db.query(
                        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                        [item.quantity, item.product_id, item.quantity]
                    );
                    if (updateResult.affectedRows === 0) {
                        throw new Error(`Insufficient stock for product ID ${item.product_id}`);
                    }
                }
                // Note: For artworks, we don't usually track stock, but if we did, we'd do it here.
            }

            // Commit transaction
            await db.query('COMMIT');
            return orderId;

        } catch (error) {
            // Rollback on error
            await db.query('ROLLBACK');
            throw error; // re-throw so the controller can handle it
        }
    },

    // Update order status (admin)
    updateStatus: async (orderId, status) => {
        const [result] = await db.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, orderId]
        );
        return result.affectedRows > 0;
    }
};

module.exports = Order;