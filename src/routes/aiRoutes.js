const express = require('express');
const router = express.Router();
const aiProxyController = require('../controllers/aiProxyController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const optionalAuth = (req, res, next) => {
  const cookie = req.cookies?.token;
  if (!cookie) return next();
  const { protect: prot } = require('../middleware/authMiddleware');
  prot(req, res, (err) => { next(); });
};

router.post('/generate-description', protect, requireRole('agent', 'admin'), aiProxyController.generateDescription);
router.post('/analyze-market', protect, requireRole('agent', 'admin'), aiProxyController.analyzeMarket);
router.post('/chat', optionalAuth, aiProxyController.chat);

module.exports = router;
