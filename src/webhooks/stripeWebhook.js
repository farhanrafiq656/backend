const express = require('express');
const router = express.Router();

// Stripe webhook stubbed for testing
router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(200).json({ received: true });
});

module.exports = router;
