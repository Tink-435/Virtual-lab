const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * AUTHENTICATION & AUTHORIZATION MIDDLEWARE
 *
 * Two middleware functions work together:
 *
 * 1. protect(req, res, next)
 *    - Reads JWT from Authorization header: "Bearer <token>"
 *    - Verifies signature using JWT_SECRET
 *    - Attaches decoded { userId, role } to req.user
 *    - If token missing/invalid → 401 Unauthorized
 *
 * 2. authorize(...roles)
 *    - Called AFTER protect
 *    - Checks if req.user.role is in the allowed roles list
 *    - If not → 403 Forbidden (authenticated but not permitted)
 *
 * Usage in routes:
 *   router.post('/rooms', protect, authorize('instructor','admin'), createRoom)
 *   router.get('/rooms', protect, getRooms)  // any logged-in user
 */

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];

    // jwt.verify throws if token is expired or tampered
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lightweight check — make sure user still exists in DB
    // (handles case where admin deletes a user mid-session)
    const userExists = await User.exists({ _id: decoded.userId });
    if (!userExists) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    req.user = decoded; // { userId, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

/**
 * authorize('instructor', 'admin')
 * Returns a middleware that checks req.user.role
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};
