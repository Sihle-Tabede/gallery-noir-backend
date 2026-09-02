const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.post('/', auth, orderController.createOrder);
router.get('/me', auth, orderController.getMyOrders); // user's own orders
router.get('/all', auth, admin, orderController.getAll);
router.patch('/:id/status', auth, admin, orderController.updateStatus);
router.get('/:id', auth, orderController.getById);   // own order (or admin)

module.exports = router;
