const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

router.get('/me', auth, authController.getProfile);
router.put('/update', auth, authController.updateProfile);
router.patch('/me', auth, authController.updateProfile);

module.exports = router;
