/**
 * OPERATIONAL TRANSFORMATION (OT) ENGINE
 *
 * This is the core of real-time collaboration. When two users
 * modify the physics world simultaneously, conflicts arise.
 *
 * PROBLEM EXAMPLE:
 *   - Server state version = 5, body "ball" is at x:100
 *   - User A (at version 5): moves ball to x:200  → sends op at version 5
 *   - User B (at version 5): moves ball to x:300  → sends op at version 5
 *   - Both arrive at server. Who wins? What does the other user see?
 *
 * OUR SOLUTION — "Last Write Wins" with Vector Clocks:
 *   Simple but production-grade for physics simulations:
 *   - Each operation carries { version, userId, timestamp, bodyId, changes }
 *   - If op.version === serverVersion → apply directly, increment server version
 *   - If op.version < serverVersion  → CONFLICT: transform op against all
 *     ops that happened since op.version, then apply
 *   - Transform = for the same bodyId, the op with higher timestamp wins
 *
 * WHY THIS WORKS FOR PHYSICS:
 *   Unlike text editors (where char positions shift), physics objects are
 *   identified by ID. Two ops on different bodies never conflict.
 *   Two ops on the SAME body: latest timestamp wins (user who moved last
 *   is the "intended" state). This feels natural to users.
 *
 * MORE ADVANCED ALTERNATIVE (mention in interviews):
 *   CRDTs (Conflict-free Replicated Data Types) — used by Figma, Notion.
 *   They mathematically guarantee convergence without a central server.
 *   We use server-authoritative OT because physics needs a single
 *   "ground truth" simulation tick anyway.
 */

class OTEngine {
  constructor() {
    // roomId → { version: number, opLog: Operation[] }
    this.rooms = new Map();
  }

  /**
   * Initialize tracking for a room
   */
  initRoom(roomId, initialVersion = 0) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { version: initialVersion, opLog: [] });
    }
  }

  /**
   * Apply an operation from a client.
   *
   * @param {string} roomId
   * @param {object} op - { version, userId, timestamp, ops: [{type, bodyId, changes}] }
   * @returns {{ accepted: boolean, transformedOp: object, serverVersion: number }}
   */
  applyOperation(roomId, op) {
    this.initRoom(roomId);
    const state = this.rooms.get(roomId);

    // Fast path: no conflict
    if (op.version === state.version) {
      state.opLog.push(op);
      state.version += 1;
      // Trim log to last 100 ops to avoid memory growth
      if (state.opLog.length > 100) state.opLog.shift();

      return {
        accepted: true,
        transformedOp: op,
        serverVersion: state.version,
      };
    }

    // Conflict: client is behind
    if (op.version < state.version) {
      const concurrentOps = state.opLog.filter(o => o.version >= op.version);
      const transformedOp = this._transform(op, concurrentOps);

      state.opLog.push(transformedOp);
      state.version += 1;
      if (state.opLog.length > 100) state.opLog.shift();

      return {
        accepted: true,
        transformedOp,
        serverVersion: state.version,
      };
    }

    // Client is AHEAD of server — shouldn't happen, reject
    return {
      accepted: false,
      transformedOp: null,
      serverVersion: state.version,
    };
  }

  /**
   * Transform an incoming op against a list of concurrent ops.
   * For physics: same-body conflicts resolved by timestamp (last write wins).
   * Different-body ops are always independent (no transformation needed).
   */
  _transform(incomingOp, concurrentOps) {
    const transformed = { ...incomingOp, ops: [...incomingOp.ops] };

    for (const concurrentOp of concurrentOps) {
      for (const concurrentChange of concurrentOp.ops) {
        transformed.ops = transformed.ops.map(change => {
          // Different bodies — no conflict, pass through
          if (change.bodyId !== concurrentChange.bodyId) return change;

          // Same body — last timestamp wins
          if (concurrentOp.timestamp > incomingOp.timestamp) {
            // Concurrent op happened "after" — discard incoming change for this body
            // by marking it as a no-op
            return { ...change, _discarded: true };
          }
          // Incoming op happened after — keep it
          return change;
        });
      }
    }

    // Remove discarded ops
    transformed.ops = transformed.ops.filter(o => !o._discarded);
    return transformed;
  }

  /**
   * Apply an OT op's changes to a physicsState snapshot.
   * Returns the new physicsState.
   */
  applyToState(physicsState, op) {
    if (!op.ops || op.ops.length === 0) return physicsState;

    const state = JSON.parse(JSON.stringify(physicsState)); // deep clone

    for (const change of op.ops) {
      switch (change.type) {
        case 'MOVE_BODY': {
          const body = state.bodies.find(b => b.id === change.bodyId);
          if (body) {
            Object.assign(body, change.changes);
          }
          break;
        }
        case 'ADD_BODY': {
          // Only add if not already present (idempotent)
          if (!state.bodies.find(b => b.id === change.bodyId)) {
            state.bodies.push(change.body);
          }
          break;
        }
        case 'REMOVE_BODY': {
          state.bodies = state.bodies.filter(b => b.id !== change.bodyId);
          state.constraints = state.constraints.filter(
            c => c.bodyAId !== change.bodyId && c.bodyBId !== change.bodyId
          );
          break;
        }
        case 'ADD_CONSTRAINT': {
          if (!state.constraints.find(c => c.id === change.constraintId)) {
            state.constraints.push(change.constraint);
          }
          break;
        }
        case 'REMOVE_CONSTRAINT': {
          state.constraints = state.constraints.filter(c => c.id !== change.constraintId);
          break;
        }
        case 'SET_GRAVITY': {
          state.gravity = change.gravity;
          break;
        }
        case 'SET_RUNNING': {
          state.isRunning = change.isRunning;
          break;
        }
        default:
          break;
      }
    }

    return state;
  }

  getVersion(roomId) {
    return this.rooms.get(roomId)?.version ?? 0;
  }

  cleanupRoom(roomId) {
    this.rooms.delete(roomId);
  }
}

// Singleton — one OT engine for the whole server process
module.exports = new OTEngine();
