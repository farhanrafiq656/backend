const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole, requireActiveSubscription } = require('../middleware/roleMiddleware');

router.get('/me/analytics', protect, requireRole('agent', 'admin'), requireActiveSubscription, agentController.getAnalytics);
router.get('/me/leads', protect, requireRole('agent', 'admin'), requireActiveSubscription, agentController.getLeads);
router.patch('/me/leads/:id', protect, requireRole('agent', 'admin'), agentController.updateLeadStatus);
router.get('/me/listings/:id/report', protect, requireRole('agent', 'admin'), agentController.generatePropertyReport);

router.get('/:agentId', agentController.getAgentProfile);
router.get('/:agentId/reviews', agentController.getReviews);
router.post('/:agentId/reviews', protect, agentController.createReview);

module.exports = router;
