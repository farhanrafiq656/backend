const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const listingController = require('../controllers/listingController');
const leadController = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole, requireActiveSubscription } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateRequest');

const optionalAuth = (req, res, next) => {
  const cookie = req.cookies?.token;
  if (!cookie) return next();
  const { protect: prot } = require('../middleware/authMiddleware');
  prot(req, res, (err) => {
    if (err) return next();
    next();
  });
};

router.get('/search', listingController.searchListings);
router.get('/agent/:agentId', listingController.getListingsByAgent);

router.post(
  '/',
  protect,
  requireRole('agent', 'admin'),
  requireActiveSubscription,
  [
    body('title').notEmpty().isLength({ max: 120 }),
    body('description').notEmpty().isLength({ max: 5000 }),
    body('listingType').isIn(['sale', 'rent']),
    body('propertyType').isIn(['house', 'condo', 'townhouse', 'multi-family', 'land', 'commercial', 'manufactured']),
    body('price').isInt({ min: 0 }),
    body('address.street').notEmpty(),
    body('address.city').notEmpty(),
    body('address.state').notEmpty(),
    body('address.zip').notEmpty(),
  ],
  validateRequest,
  listingController.createListing
);

router.get('/:id', listingController.getListing);

router.put('/:id', protect, requireRole('agent', 'admin'), listingController.updateListing);
router.delete('/:id', protect, requireRole('agent', 'admin'), listingController.deleteListing);

router.post('/:id/images', protect, requireRole('agent', 'admin'), listingController.addImage);
router.delete('/:id/images/:publicId', protect, requireRole('agent', 'admin'), listingController.deleteImage);

router.post('/:listingId/leads', optionalAuth, leadController.createLead);

module.exports = router;
