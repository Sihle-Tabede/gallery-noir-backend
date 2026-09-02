const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', productController.getAll);
router.get('/category/:category', productController.getByCategory);
router.get('/:id', productController.getById);

router.post('/', auth, admin, productController.create);
router.put('/:id', auth, admin, productController.update);
router.patch('/:id', auth, admin, productController.update);
router.delete('/:id', auth, admin, productController.delete);

module.exports = router;
