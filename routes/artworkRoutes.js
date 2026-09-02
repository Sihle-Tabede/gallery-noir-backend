const express = require('express');
const router = express.Router();
const artworkController = require('../controllers/artworkController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', artworkController.getAll);
router.get('/featured', artworkController.getFeatured);
router.get('/:id', artworkController.getById);

router.post('/', auth, admin, artworkController.create);
router.put('/:id', auth, admin, artworkController.update);
router.patch('/:id', auth, admin, artworkController.update);
router.delete('/:id', auth, admin, artworkController.delete);

module.exports = router;
