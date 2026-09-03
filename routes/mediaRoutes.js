const express = require('express');

const mediaController = require('../controllers/mediaController');

const router = express.Router();

// A regular-expression route safely captures nested paths such as
// /artworks/portraits/fragmented-gaze.webp under the /api/media mount.
router.get(/^\/(.+)$/, mediaController.getByPath);

module.exports = router;
