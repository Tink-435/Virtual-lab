const Room = require('../models/Room');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * ROOM CONTROLLER
 *
 * Rooms are the live collaborative sessions.
 * Key flows:
 *
 * CREATE → Instructor creates a room, gets a 6-char code
 * JOIN   → Student enters code, gets current physicsState snapshot
 * LOCK   → Instructor freezes room (students can't add/move bodies)
 * STATE  → Save current physicsState to DB (called by socket layer too)
 */

// Assign a unique color to each participant for cursor tracking
const PARTICIPANT_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4',
  '#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F',
];

// ─── POST /api/rooms ──────────────────────────────────────────────────────
exports.createRoom = async (req, res) => {
  try {
    const { name, templateId, maxParticipants } = req.body;

    let initialPhysicsState = {
      bodies: [],
      constraints: [],
      gravity: { x: 0, y: 1 },
      worldWidth: 1600,
      worldHeight: 900,
      isRunning: false,
    };

    // If cloning from a template, copy its physicsState
    if (templateId) {
  const Experiment = require('../models/Experiment');
  const template = await Experiment.findById(templateId);
  console.log(
  "TEMPLATE PHYSICS STATE:",
  JSON.stringify(template.physicsState, null, 2)
);
  if (template && template.physicsState) {
    initialPhysicsState = {
      bodies: template.physicsState.bodies || [],
      constraints: template.physicsState.constraints || [],
      gravity: template.physicsState.gravity || { x: 0, y: 1 },
      worldWidth: template.physicsState.worldWidth || 1600,
      worldHeight: template.physicsState.worldHeight || 900,
      isRunning: false,
    };
  }
}

    const room = await Room.create({
      name,
      owner: req.user.userId,
      ownerRole: req.user.role,
      physicsState: initialPhysicsState,
      templateId,
      maxParticipants: maxParticipants || 20,
    });

    await User.findByIdAndUpdate(req.user.userId, {
      $push: { roomHistory: room._id },
    });

    logger.info(`Room created: ${room.code} by user ${req.user.userId}`);
    res.status(201).json({ room });
  } catch (err) {
    logger.error(`createRoom error: ${err.message}`);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

// ─── GET /api/rooms/:code ─────────────────────────────────────────────────
exports.getRoomByCode = async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() })
      .populate('owner', 'name email role');

    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.isLocked && req.user.role === 'student') {
      return res.status(403).json({ error: 'Room is locked by instructor' });
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
};

// ─── GET /api/rooms (my rooms) ────────────────────────────────────────────
exports.getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ owner: req.user.userId })
      .select('name code isLocked participants createdAt stateVersion')
      .sort('-createdAt');
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

// ─── PATCH /api/rooms/:id/lock ────────────────────────────────────────────
exports.toggleLock = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Only the room owner or admin can lock
    if (room.owner.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to lock this room' });
    }

    room.isLocked = !room.isLocked;
    await room.save();

    res.json({ isLocked: room.isLocked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle lock' });
  }
};

// ─── PATCH /api/rooms/:id/state ───────────────────────────────────────────
// Called to persist physics state to DB (snapshot save)
exports.saveRoomState = async (req, res) => {
  try {
    const { physicsState, stateVersion } = req.body;

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // OT conflict check: only accept if client version matches server version
    // This prevents stale clients from overwriting newer state
    if (stateVersion !== undefined && stateVersion < room.stateVersion) {
      return res.status(409).json({
        error: 'State conflict',
        serverVersion: room.stateVersion,
        serverState: room.physicsState,
      });
    }

    room.physicsState = physicsState;
    room.stateVersion += 1;
    await room.save();

    res.json({ stateVersion: room.stateVersion });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save room state' });
  }
};

// ─── POST /api/rooms/:id/analytics ───────────────────────────────────────
// Append an analytics snapshot to the room's timeseries log
exports.appendAnalytics = async (req, res) => {
  try {
    const { snapshot } = req.body; // { tick, bodies: [{id, kineticEnergy, ...}] }
    await Room.findByIdAndUpdate(req.params.id, {
      $push: {
        analyticsLog: {
          $each: [{ ...snapshot, timestamp: new Date() }],
          $slice: -500, // Keep only last 500 snapshots to control doc size
        },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to append analytics' });
  }
};

// ─── DELETE /api/rooms/:id ────────────────────────────────────────────────
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.owner.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await room.deleteOne();
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
};
