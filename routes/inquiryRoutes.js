const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Public (no auth required – anyone can send an inquiry)
router.post('/', inquiryController.create);

// Admin-only (view and manage)
router.get('/', auth, admin, inquiryController.getAll);
router.get('/:id', auth, admin, inquiryController.getById);
router.patch('/:id/status', auth, admin, inquiryController.updateStatus);
router.delete('/:id', auth, admin, inquiryController.delete);

module.exports = router;