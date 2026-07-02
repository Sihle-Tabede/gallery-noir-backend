const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Public
router.post('/', contactController.create);

// Admin-only
router.get('/', auth, admin, contactController.getAll);
router.get('/:id', auth, admin, contactController.getById);
router.delete('/:id', auth, admin, contactController.delete);

module.exports = router;