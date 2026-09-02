const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', blogController.getAll);
router.get('/:id', blogController.getById);

router.post('/', auth, admin, blogController.create);
router.put('/:id', auth, admin, blogController.update);
router.patch('/:id', auth, admin, blogController.update);
router.delete('/:id', auth, admin, blogController.delete);

module.exports = router;
