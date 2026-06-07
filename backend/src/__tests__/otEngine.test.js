/**
 * OT ENGINE TESTS
 *
 * These tests verify that our conflict resolution logic is correct.
 * This is the most critical unit in the backend — bugs here cause
 * users to see diverging physics states.
 *
 * Testing strategy:
 * - No-conflict path (fast path)
 * - Same-body conflict (timestamp wins)
 * - Different-body ops (always independent)
 * - applyToState correctness for each op type
 */

// OT engine is a singleton — reset between tests
let otEngine;
beforeEach(() => {
  jest.resetModules();
  otEngine = require('../socket/otEngine');
});

describe('OTEngine.applyOperation', () => {
  test('accepts op when versions match (fast path)', () => {
    otEngine.initRoom('room1', 5);
    const op = {
      version: 5,
      userId: 'userA',
      timestamp: 1000,
      ops: [{ type: 'MOVE_BODY', bodyId: 'b1', changes: { x: 200 } }],
    };
    const result = otEngine.applyOperation('room1', op);

    expect(result.accepted).toBe(true);
    expect(result.serverVersion).toBe(6);
    expect(result.transformedOp).toEqual(expect.objectContaining({ userId: 'userA' }));
  });

  test('accepts and transforms op when client is behind', () => {
    otEngine.initRoom('room2', 5);

    // First op at version 5
    otEngine.applyOperation('room2', {
      version: 5, userId: 'userA', timestamp: 1000,
      ops: [{ type: 'MOVE_BODY', bodyId: 'b1', changes: { x: 200 } }],
    });
    // Now server is at version 6

    // Second op also at version 5 (concurrent, same body, later timestamp)
    const result = otEngine.applyOperation('room2', {
      version: 5, userId: 'userB', timestamp: 2000,
      ops: [{ type: 'MOVE_BODY', bodyId: 'b1', changes: { x: 300 } }],
    });

    // userB's op had later timestamp — it should win (not discarded)
    expect(result.accepted).toBe(true);
    expect(result.serverVersion).toBe(7);
    const keptOps = result.transformedOp.ops.filter(o => !o._discarded);
    expect(keptOps.length).toBe(1);
  });

  test('discards op on same body when concurrent op has later timestamp', () => {
    otEngine.initRoom('room3', 0);

    // Earlier op
    otEngine.applyOperation('room3', {
      version: 0, userId: 'userA', timestamp: 2000,
      ops: [{ type: 'MOVE_BODY', bodyId: 'b1', changes: { x: 200 } }],
    });

    // Later concurrent op on same body but EARLIER timestamp — should lose
    const result = otEngine.applyOperation('room3', {
      version: 0, userId: 'userB', timestamp: 1000,
      ops: [{ type: 'MOVE_BODY', bodyId: 'b1', changes: { x: 300 } }],
    });

    expect(result.accepted).toBe(true);
    // userB's op should be discarded (userA's timestamp 2000 > userB's 1000)
    expect(result.transformedOp.ops.length).toBe(0);
  });

  test('different-body ops never conflict', () => {
    otEngine.initRoom('room4', 0);

    otEngine.applyOperation('room4', {
      version: 0, userId: 'userA', timestamp: 1000,
      ops: [{ type: 'MOVE_BODY', bodyId: 'b1', changes: { x: 200 } }],
    });

    const result = otEngine.applyOperation('room4', {
      version: 0, userId: 'userB', timestamp: 900,
      ops: [{ type: 'MOVE_BODY', bodyId: 'b2', changes: { x: 300 } }],
    });

    // Different bodies — both ops survive
    expect(result.transformedOp.ops.length).toBe(1);
    expect(result.transformedOp.ops[0].bodyId).toBe('b2');
  });

  test('rejects op when client version is ahead of server', () => {
    otEngine.initRoom('room5', 3);
    const result = otEngine.applyOperation('room5', {
      version: 10, userId: 'userA', timestamp: 1000,
      ops: [],
    });
    expect(result.accepted).toBe(false);
  });
});

describe('OTEngine.applyToState', () => {
  const baseState = {
    bodies: [
      { id: 'b1', x: 100, y: 100, type: 'circle' },
      { id: 'b2', x: 200, y: 200, type: 'rectangle' },
    ],
    constraints: [],
    gravity: { x: 0, y: 1 },
    isRunning: false,
  };

  test('MOVE_BODY updates x, y', () => {
    const op = {
      ops: [{ type: 'MOVE_BODY', bodyId: 'b1', changes: { x: 999, y: 888 } }],
    };
    const result = otEngine.applyToState(baseState, op);
    expect(result.bodies.find(b => b.id === 'b1').x).toBe(999);
    expect(result.bodies.find(b => b.id === 'b1').y).toBe(888);
  });

  test('ADD_BODY appends body', () => {
    const op = {
      ops: [{ type: 'ADD_BODY', bodyId: 'b3', body: { id: 'b3', x: 50, y: 50, type: 'circle' } }],
    };
    const result = otEngine.applyToState(baseState, op);
    expect(result.bodies.length).toBe(3);
  });

  test('ADD_BODY is idempotent (duplicate ignored)', () => {
    const op = {
      ops: [{ type: 'ADD_BODY', bodyId: 'b1', body: { id: 'b1', x: 50, y: 50 } }],
    };
    const result = otEngine.applyToState(baseState, op);
    expect(result.bodies.length).toBe(2); // not added again
  });

  test('REMOVE_BODY removes body and its constraints', () => {
    const stateWithConstraint = {
      ...baseState,
      constraints: [{ id: 'c1', bodyAId: 'b1', bodyBId: 'b2' }],
    };
    const op = {
      ops: [{ type: 'REMOVE_BODY', bodyId: 'b1' }],
    };
    const result = otEngine.applyToState(stateWithConstraint, op);
    expect(result.bodies.find(b => b.id === 'b1')).toBeUndefined();
    expect(result.constraints.length).toBe(0); // constraint removed too
  });

  test('SET_GRAVITY updates gravity vector', () => {
    const op = {
      ops: [{ type: 'SET_GRAVITY', gravity: { x: 0, y: -1 } }],
    };
    const result = otEngine.applyToState(baseState, op);
    expect(result.gravity.y).toBe(-1);
  });

  test('does not mutate original state', () => {
    const op = {
      ops: [{ type: 'MOVE_BODY', bodyId: 'b1', changes: { x: 999 } }],
    };
    otEngine.applyToState(baseState, op);
    expect(baseState.bodies[0].x).toBe(100); // original unchanged
  });
});
