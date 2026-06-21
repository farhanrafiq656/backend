const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/image', protect, requireRole('agent', 'admin'), uploadController.uploadImage);

module.exports = router;
