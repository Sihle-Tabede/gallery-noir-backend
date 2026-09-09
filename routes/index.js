const express = require('express');

const db = require('../config/db');
const authRoutes = require('./authRoutes');
const artworkRoutes = require('./artworkRoutes');
const productRoutes = require('./productRoutes');
const blogRoutes = require('./blogRoutes');
const inquiryRoutes = require('./inquiryRoutes');
const contactRoutes = require('./contactRoutes');
const orderRoutes = require('./orderRoutes');
const mediaRoutes = require('./mediaRoutes');

const router = express.Router();

router.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'gallery-noir-api',
        timestamp: new Date().toISOString()
    });
});

router.get('/health/ready', async (_req, res) => {
    try {
        await db.ping();
        res.json({ status: 'ready' });
    } catch (_error) {
        res.status(503).json({ status: 'unavailable' });
    }
});

router.use('/auth', authRoutes);
router.use('/artworks', artworkRoutes);
router.use('/products', productRoutes);
router.use('/blog', blogRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/contacts', contactRoutes);
router.use('/orders', orderRoutes);
router.use('/media', mediaRoutes);

router.use('/wishlist', require('./wishlistRoutes'));

module.exports = router;
