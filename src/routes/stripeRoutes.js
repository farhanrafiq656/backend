const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-checkout-session', protect, stripeController.createCheckoutSession);
router.post('/create-portal-session', protect, stripeController.createPortalSession);

module.exports = router;
