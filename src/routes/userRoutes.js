const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

router.use(protect);

router.put('/profile', userController.updateProfile);
router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/\d/),
  ],
  validateRequest,
  userController.changePassword
);

router.get('/saved-listings', userController.getSavedListings);
router.post('/saved-listings/:listingId', userController.saveListing);
router.delete('/saved-listings/:listingId', userController.saveListing);

router.get('/saved-searches', userController.getSavedSearches);
router.post(
  '/saved-searches',
  [body('name').notEmpty().withMessage('Name is required'), body('filters').isObject()],
  validateRequest,
  userController.createSavedSearch
);
router.delete('/saved-searches/:id', userController.deleteSavedSearch);

router.post('/become-agent', userController.becomeAgent);

module.exports = router;
