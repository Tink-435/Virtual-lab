const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Room = require('../models/Room');
const otEngine = require('./otEngine');
const logger = require('../utils/logger');

const PARTICIPANT_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4',
  '#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F',
  '#BB8FCE','#85C1E9','#82E0AA','#F8C471',
];

const activeRooms = new Map();

module.exports = function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Auth middleware on handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user ${socket.user.userId})`);

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on('join_room', async ({ roomCode, userName }) => {
      try {
        const room = await Room.findOne({ code: roomCode.toUpperCase() });
        if (!room) return socket.emit('error', { message: 'Room not found' });

        if (room.isLocked && socket.user.role === 'student') {
          return socket.emit('error', { message: 'Room is locked' });
        }

        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.roomId = room._id.toString();
        socket.userName = userName;

        const usedCount = (activeRooms.get(roomCode) || new Set()).size;
        const color = PARTICIPANT_COLORS[usedCount % PARTICIPANT_COLORS.length];
        socket.participantColor = color;

        if (!activeRooms.has(roomCode)) activeRooms.set(roomCode, new Set());
        activeRooms.get(roomCode).add(socket.id);

        otEngine.initRoom(roomCode, room.stateVersion);

        await Room.findByIdAndUpdate(room._id, {
          $push: {
            participants: {
              userId: socket.user.userId,
              name: userName,
              role: socket.user.role,
              color,
            },
          },
        });

        socket.emit('room_joined', {
          room: {
            id: room._id,
            name: room.name,
            code: room.code,
            isLocked: room.isLocked,
            physicsState: room.physicsState,
            stateVersion: room.stateVersion,
          },
          yourColor: color,
          participants: room.participants,
        });

        socket.to(roomCode).emit('participant_join', {
          userId: socket.user.userId,
          name: userName,
          color,
          role: socket.user.role,
        });

        logger.info(`User ${userName} joined room ${roomCode}`);
      } catch (err) {
        logger.error(`join_room error: ${err.message}`);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ── CANVAS ACTION SYNC ────────────────────────────────────────────────────
    /**
     * Fired when any user adds a body, loads a preset, or resets.
     * Server rebroadcasts to everyone ELSE in the room.
     *
     * Sender already applied locally for instant feedback.
     * Others receive this and apply the same action to their canvas.
     *
     * action: 'add_body' | 'load_preset' | 'reset_scene' | 'add_constraint'
     * data:   varies by action (see PhysicsCanvas.jsx emitCanvasAction)
     */
    socket.on('canvas_action', async ({ action, data }) => {
      if (!socket.roomCode) return;

      try {
        const room = await Room.findOne({ code: socket.roomCode });
        if (!room) return;
         
        if (action === 'move_body') {
      socket.to(socket.roomCode).emit('canvas_action', {
        action,
        data,
        triggeredBy: socket.user.userId,
        triggeredByName: socket.userName,
      });
      return;
      }

        // Students blocked when room is locked
        if (room.isLocked && socket.user.role === 'student') return;

        // Broadcast to everyone else
        socket.to(socket.roomCode).emit('canvas_action', {
          action,
          data,
          triggeredBy: socket.user.userId,
          triggeredByName: socket.userName,
        });
      } catch (err) {
        logger.error(`canvas_action error: ${err.message}`);
      }
    });

    // ── PHYSICS OP (OT) ──────────────────────────────────────────────────────
    socket.on('physics_op', async (op) => {
      if (!socket.roomCode) return;
      const room = await Room.findOne({ code: socket.roomCode });
      if (!room) return;
      if (room.isLocked && socket.user.role === 'student') {
        return socket.emit('op_rejected', {
          reason: 'Room is locked',
          serverVersion: otEngine.getVersion(socket.roomCode),
        });
      }
      const result = otEngine.applyOperation(socket.roomCode, {
        ...op,
        userId: socket.user.userId,
        timestamp: Date.now(),
      });
      if (!result.accepted) {
        return socket.emit('op_rejected', {
          reason: 'Version conflict',
          serverVersion: result.serverVersion,
          serverState: room.physicsState,
        });
      }
      const newPhysicsState = otEngine.applyToState(room.physicsState, result.transformedOp);
      await Room.findByIdAndUpdate(room._id, {
        physicsState: newPhysicsState,
        stateVersion: result.serverVersion,
      });
      io.to(socket.roomCode).emit('op_applied', {
        op: result.transformedOp,
        serverVersion: result.serverVersion,
        appliedBy: socket.user.userId,
      });
    });

    // ── CURSOR ───────────────────────────────────────────────────────────────
    socket.on('cursor_move', ({ x, y }) => {
      if (!socket.roomCode) return;
      socket.to(socket.roomCode).emit('cursor_update', {
        userId: socket.user.userId,
        name: socket.userName,
        color: socket.participantColor,
        x, y,
      });
    });

    // ── ANALYTICS TICK ───────────────────────────────────────────────────────
    socket.on('analytics_tick', ({ snapshot }) => {
      if (!socket.roomCode) return;
      io.to(socket.roomCode).emit('analytics_tick', { snapshot });
    });

    // ── CHAOS EVENT ──────────────────────────────────────────────────────────
    socket.on('chaos_event', async ({ type, params }) => {
      if (socket.user.role !== 'instructor' && socket.user.role !== 'admin') {
        return socket.emit('error', { message: 'Only instructors can trigger chaos events' });
      }
      if (!socket.roomCode) return;
      logger.info(`Chaos event: ${type} in room ${socket.roomCode}`);
      io.to(socket.roomCode).emit('chaos_broadcast', {
        type,
        params,
        triggeredBy: socket.userName,
        timestamp: Date.now(),
      });
    });

    // ── LOCK / UNLOCK ────────────────────────────────────────────────────────
    socket.on('toggle_lock', async () => {
      if (socket.user.role !== 'instructor' && socket.user.role !== 'admin') return;
      if (!socket.roomCode) return;
      const room = await Room.findOne({ code: socket.roomCode });
      if (!room) return;
      room.isLocked = !room.isLocked;
      await room.save();
      io.to(socket.roomCode).emit(room.isLocked ? 'room_locked' : 'room_unlocked', {
        lockedBy: socket.userName,
      });
    });

    // ── SIMULATION CONTROL ───────────────────────────────────────────────────
    socket.on('simulation_control', ({ action }) => {
      if (!socket.roomCode) return;
      io.to(socket.roomCode).emit('simulation_control', {
        action,
        triggeredBy: socket.user.userId,
        timestamp: Date.now(),
      });
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      if (socket.roomCode) {
        const roomSet = activeRooms.get(socket.roomCode);
        if (roomSet) {
          roomSet.delete(socket.id);
          if (roomSet.size === 0) {
            activeRooms.delete(socket.roomCode);
            otEngine.cleanupRoom(socket.roomCode);
          }
        }
        await Room.findOneAndUpdate(
          { code: socket.roomCode },
          { $pull: { participants: { userId: socket.user.userId } } }
        );
        socket.to(socket.roomCode).emit('participant_leave', {
          userId: socket.user.userId,
          name: socket.userName,
        });
      }
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};
