const mongoose = require('mongoose');

/**
 * ROOM MODEL
 *
 * A Room is one live collaborative physics session.
 * Key design decisions:
 *
 * 1. physicsState — This is the "source of truth" snapshot of all bodies,
 *    constraints, and world settings. When a new user joins, they receive
 *    this snapshot to instantly sync to the current simulation state.
 *
 * 2. stateVersion — An integer that increments every time physicsState changes.
 *    This is the foundation of our OT (Operational Transformation) conflict
 *    resolution: if client sends an update for version 5 but server is at 7,
 *    we know there's a conflict and can reject/merge it.
 *
 * 3. participants — Tracks who is currently in the room with their cursor
 *    position (for live presence indicators).
 */

const bodySchema = new mongoose.Schema({
  id: String,           // Matter.js body ID
  type: String,   
  shape: String,       // 'circle', 'rectangle', 'polygon'
  x: Number,
  y: Number,
  angle: Number,
  velocity: { x: Number, y: Number },
  angularVelocity: Number,
  isStatic: Boolean,
  label: String,
  render: {
    fillStyle: String,
    strokeStyle: String,
    lineWidth: Number,
  },
  plugin: mongoose.Schema.Types.Mixed, // custom properties
}, { _id: false });

const constraintSchema = new mongoose.Schema({
  id: String,
  type: String,         // 'rope', 'spring', 'pivot', 'motor'
  bodyAId: String,
  bodyBId: String,
  stiffness: Number,
  damping: Number,
  length: Number,
  pointA: { x: Number, y: Number },
  pointB: { x: Number, y: Number },
}, { _id: false });

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      unique: true,
      uppercase: true,
      // 6-char join code like "XK9P2Q" — easy to share verbally
      default: () => Math.random().toString(36).substring(2, 8).toUpperCase(),
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Role of owner in the room context
    ownerRole: { type: String, enum: ['student', 'instructor', 'admin'], default: 'instructor' },

    isLocked: { type: Boolean, default: false }, // instructor can freeze the room

    // ── Physics World State ──────────────────────────────────────────────────
    physicsState: {
      bodies: [bodySchema],
      constraints: [constraintSchema],
      gravity: { x: { type: Number, default: 0 }, y: { type: Number, default: 1 } },
      worldWidth: { type: Number, default: 1600 },
      worldHeight: { type: Number, default: 900 },
      isRunning: { type: Boolean, default: false },
    },

    // Version counter for OT conflict resolution
    stateVersion: { type: Number, default: 0 },

    // ── Participants ──────────────────────────────────────────────────────────
    participants: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      role: String,
      cursor: { x: Number, y: Number },
      color: String,  // unique color per participant for cursor display
      joinedAt: { type: Date, default: Date.now },
      _id: false,
    }],

    // ── Analytics snapshots (timeseries) ─────────────────────────────────────
    // Each snapshot is recorded every N ticks when simulation runs
    analyticsLog: [{
      tick: Number,
      timestamp: Date,
      bodies: [{
        id: String,
        kineticEnergy: Number,
        potentialEnergy: Number,
        speed: Number,
        force: { x: Number, y: Number },
        _id: false,
      }],
      _id: false,
    }],

    // Template this room was cloned from (if any)
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Experiment' },

    maxParticipants: { type: Number, default: 20 },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

// Index for fast room-by-code lookups (join flow)
roomSchema.index({ code: 1 });
roomSchema.index({ owner: 1 });
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index — auto-delete expired rooms

module.exports = mongoose.model('Room', roomSchema);
