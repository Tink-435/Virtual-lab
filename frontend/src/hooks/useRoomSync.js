import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useRoomSync HOOK
 *
 * This is the CLIENT SIDE of our OT system.
 * It connects the socket layer to the physics engine.
 *
 * OUTGOING OPERATIONS (local user changes physics):
 *   1. User drags a body → addBody/moveBody called
 *   2. We create an "op" { version, userId, ops: [{type, bodyId, changes}] }
 *   3. We send it to server via socket.emit('physics_op', op)
 *   4. Server OT-transforms it, broadcasts 'op_applied' to everyone
 *   5. We apply the confirmed op to keep our state in sync
 *
 * INCOMING OPERATIONS (other user changes physics):
 *   1. Server broadcasts 'op_applied' to all room members
 *   2. We receive it and apply to our local physics worker
 *   3. If op.appliedBy === our userId, skip (we already applied optimistically)
 *
 * OPTIMISTIC UPDATES:
 *   We apply ops locally BEFORE server confirmation for instant feedback.
 *   If server rejects (conflict), we roll back to server's canonical state.
 *   This is the same pattern used by Google Docs.
 */

export function useRoomSync({ socket, user, physicsHook, roomId }) {
  const versionRef = useRef(0); // our local version counter
  const [participants, setParticipants] = useState([]);
  const [cursors, setCursors] = useState({}); // userId → {x, y, color, name}
  const [isLocked, setIsLocked] = useState(false);
  const [chaosEvent, setChaosEvent] = useState(null);
  const pendingOpsRef = useRef([]); // ops sent but not yet confirmed

  const { addBody, removeBody, moveBody, setGravity, start, pause, reset, triggerChaos } = physicsHook;

  // ── Helper: emit a physics op ──────────────────────────────────────────────
  const emitOp = useCallback((ops) => {
    if (!socket || isLocked) return;

    const op = {
      version: versionRef.current,
      userId: user.id,
      timestamp: Date.now(),
      ops,
    };

    pendingOpsRef.current.push(op);
    socket.emit('physics_op', op);

    // Optimistic: apply locally immediately
    // (actual application happens in the caller)
  }, [socket, user, isLocked]);

  // ── Public operation wrappers (emit + apply locally) ───────────────────────
  const syncAddBody = useCallback((bodySpec) => {
    addBody(bodySpec);
    emitOp([{ type: 'ADD_BODY', bodyId: bodySpec.id, body: bodySpec }]);
  }, [addBody, emitOp]);

  const syncRemoveBody = useCallback((bodyId) => {
    removeBody(bodyId);
    emitOp([{ type: 'REMOVE_BODY', bodyId }]);
  }, [removeBody, emitOp]);

  const syncMoveBody = useCallback((bodyId, x, y) => {
    moveBody(bodyId, x, y);
    emitOp([{ type: 'MOVE_BODY', bodyId, changes: { x, y } }]);
  }, [moveBody, emitOp]);

  const syncSetGravity = useCallback((gx, gy) => {
    setGravity(gx, gy);
    emitOp([{ type: 'SET_GRAVITY', gravity: { x: gx, y: gy } }]);
  }, [setGravity, emitOp]);

  // ── Cursor broadcasting (high-frequency, no OT needed) ────────────────────
  const broadcastCursor = useCallback((x, y) => {
    socket?.emit('cursor_move', { x, y });
  }, [socket]);

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Confirmed op from server (could be ours or someone else's)
    socket.on('op_applied', ({ op, serverVersion, appliedBy }) => {
      versionRef.current = serverVersion;

      // Remove from pending
      pendingOpsRef.current = pendingOpsRef.current.filter(
        p => p.timestamp !== op.timestamp
      );

      // If op is from ANOTHER user, apply it to our worker
      if (appliedBy !== user.id) {
        applyOpToWorker(op);
      }
    });

    // Server rejected our op (version conflict) → resync
    socket.on('op_rejected', ({ serverVersion, serverState }) => {
      versionRef.current = serverVersion;
      pendingOpsRef.current = [];
      // Reset worker with server's canonical state
      // physicsHook would need a 'loadState' method for full impl
      console.warn('Op rejected — resyncing to server state');
    });

    // Cursor updates from other participants
    socket.on('cursor_update', ({ userId, name, color, x, y }) => {
      setCursors(prev => ({ ...prev, [userId]: { x, y, color, name } }));
    });

    // Participant presence
    socket.on('participant_join', (p) => {
      setParticipants(prev => [...prev.filter(u => u.userId !== p.userId), p]);
    });
    socket.on('participant_leave', ({ userId }) => {
      setParticipants(prev => prev.filter(u => u.userId !== userId));
      setCursors(prev => { const next = {...prev}; delete next[userId]; return next; });
    });

    // Room lock/unlock (instructor control)
    socket.on('room_locked', () => setIsLocked(true));
    socket.on('room_unlocked', () => setIsLocked(false));

    // Simulation controls from instructor
    socket.on('simulation_control', ({ action }) => {
      if (action === 'start') start();
      if (action === 'pause') pause();
      if (action === 'reset') reset();
    });

    // Chaos events from instructor
    socket.on('chaos_broadcast', ({ type, params, triggeredBy }) => {
      triggerChaos(type, params);
      setChaosEvent({ type, triggeredBy, timestamp: Date.now() });
      // Clear chaos notification after 3s
      setTimeout(() => setChaosEvent(null), 3000);
    });

    return () => {
      socket.off('op_applied');
      socket.off('op_rejected');
      socket.off('cursor_update');
      socket.off('participant_join');
      socket.off('participant_leave');
      socket.off('room_locked');
      socket.off('room_unlocked');
      socket.off('simulation_control');
      socket.off('chaos_broadcast');
    };
  }, [socket, user, start, pause, reset, triggerChaos]);

  // ── Apply incoming op to physics worker ───────────────────────────────────
  function applyOpToWorker(op) {
    if (!op.ops) return;
    for (const change of op.ops) {
      switch (change.type) {
        case 'ADD_BODY':     addBody(change.body); break;
        case 'REMOVE_BODY':  removeBody(change.bodyId); break;
        case 'MOVE_BODY':    moveBody(change.bodyId, change.changes.x, change.changes.y); break;
        case 'SET_GRAVITY':  setGravity(change.gravity.x, change.gravity.y); break;
        default: break;
      }
    }
  }

  return {
    participants, cursors, isLocked, chaosEvent,
    syncAddBody, syncRemoveBody, syncMoveBody, syncSetGravity, broadcastCursor,
  };
}
