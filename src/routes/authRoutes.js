const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/\d/)
      .withMessage('Password must be at least 8 characters and contain a number'),
  ],
  validateRequest,
  authController.signup
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validateRequest,
  authController.login
);

router.post('/logout', authController.logout);
router.get('/verify-email/:token', authController.verifyEmail);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  validateRequest,
  authController.forgotPassword
);

router.post(
  '/reset-password/:token',
  [body('newPassword').isLength({ min: 8 }).matches(/\d/).withMessage('Password must be at least 8 chars with a number')],
  validateRequest,
  authController.resetPassword
);

router.get('/me', protect, authController.getMe);

module.exports = router;
