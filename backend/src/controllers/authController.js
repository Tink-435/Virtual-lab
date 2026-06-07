const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * AUTH CONTROLLER
 *
 * How JWT auth works:
 * 1. User sends email + password
 * 2. We verify password against bcrypt hash in DB
 * 3. We sign a JWT containing { userId, role } with our secret
 * 4. Client stores this token (localStorage or httpOnly cookie)
 * 5. On every protected request, client sends token in Authorization header
 * 6. Our 'protect' middleware verifies the token and attaches user to req
 *
 * Why JWT over sessions?
 * - Stateless: no server-side session store needed
 * - Scales horizontally: any server instance can verify any token
 * - Works well with WebSockets (we pass token on socket handshake too)
 */

const signToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── POST /api/auth/register ──────────────────────────────────────────────
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Only allow 'student' or 'instructor' on self-registration
    // 'admin' role can only be assigned manually in DB
    const safeRole = role === 'instructor' ? 'instructor' : 'student';

    const user = await User.create({
      name,
      email,
      passwordHash: password, // pre-save hook will bcrypt this
      role: safeRole,
    });

    const token = signToken(user._id, user.role);
    logger.info(`New user registered: ${email} (${safeRole})`);

    res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (err) {
    logger.error(`Register error: ${err.message}`);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Must explicitly select passwordHash since it's select:false in schema
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !(await user.comparePassword(password))) {
      // Deliberate vague message — don't tell attacker which field is wrong
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id, user.role);
    res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  // req.user is set by the protect middleware
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: user.toPublicJSON() });
};
