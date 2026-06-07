require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const initSocket = require('./socket/socketManager');

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Database ────────────────────────────────────────────────────────────────
connectDB();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting — prevents brute-force attacks on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/experiments', require('./routes/experiments'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check endpoint — used by CI/CD to verify deployment
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, server }; // exported for testing
