const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');

router.use((_req,res,next) => { res.set('Cache-Control','no-store'); next(); });

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/verify', authLimiter, authController.verify);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/change-email', auth, authLimiter, authController.changeEmail);
router.post('/change-password', auth, authLimiter, authController.changePassword);
router.post('/logout', auth, authController.logout);

router.get('/me', auth, authController.getProfile);
router.put('/update', auth, authController.updateProfile);
router.patch('/me', auth, authController.updateProfile);

module.exports = router;
