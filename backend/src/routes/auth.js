const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * Input validation using express-validator.
 * These run BEFORE the controller — if validation fails,
 * the controller reads validationResult(req) and returns 400.
 *
 * This prevents malformed data from ever hitting the DB.
 */

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain a number'),
    body('role').optional().isIn(['student', 'instructor']),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  login
);

router.get('/me', protect, getMe);

module.exports = router;
