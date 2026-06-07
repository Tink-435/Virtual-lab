/**
 * PHYSICS WEB WORKER
 *
 * WHY A WEB WORKER?
 * Matter.js physics simulation is CPU-intensive. Running it on the main thread
 * means every heavy simulation tick can block React rendering, causing:
 *   - Dropped frames (UI freezes)
 *   - Unresponsive drag interactions
 *   - Janky animations
 *
 * Web Workers run in a separate OS thread with NO access to the DOM.
 * They communicate with the main thread via postMessage (structured clone).
 *
 * Our architecture:
 *   Main Thread:
 *     - React UI rendering
 *     - Canvas drawing (requestAnimationFrame)
 *     - User input (mouse drag)
 *     - Socket.io communication
 *
 *   Worker Thread (this file):
 *     - Matter.js Engine.update() tick
 *     - Collision detection
 *     - Constraint solving
 *     - Energy/force calculations
 *     - Sends body positions back to main thread every frame
 *
 * Result: ~60fps UI even with 100+ physics bodies.
 *
 * MESSAGES FROM MAIN THREAD:
 *   { type: 'INIT', payload: { physicsState, gravity } }
 *   { type: 'START' }
 *   { type: 'PAUSE' }
 *   { type: 'RESET' }
 *   { type: 'ADD_BODY', payload: { body } }
 *   { type: 'REMOVE_BODY', payload: { bodyId } }
 *   { type: 'MOVE_BODY', payload: { bodyId, x, y } }
 *   { type: 'ADD_CONSTRAINT', payload: { constraint } }
 *   { type: 'SET_GRAVITY', payload: { x, y } }
 *   { type: 'CHAOS_EVENT', payload: { type, params } }
 *   { type: 'TICK_STEP' }  ← manual step (when paused)
 *
 * MESSAGES TO MAIN THREAD:
 *   { type: 'FRAME', payload: { bodies, tick } }
 *   { type: 'ANALYTICS', payload: { bodies: [{id, ke, pe, speed, fx, fy}], tick } }
 *   { type: 'COLLISION', payload: { pairs } }
 */

// Matter.js is loaded via importScripts in the worker context
// In a real setup: importScripts('https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js')
// For the build pipeline, it's bundled via worker-loader or Vite worker plugin

let engine, world;
let bodies = new Map();   // id → Matter.Body
let constraints = new Map(); // id → Matter.Constraint
let isRunning = false;
let tickCount = 0;
let rafId = null;

const ANALYTICS_INTERVAL = 10; // send analytics every 10 ticks

// ── Physics utility functions ────────────────────────────────────────────────

function calcKineticEnergy(body) {
  const m = body.mass;
  const v2 = body.speed * body.speed;
  return 0.5 * m * v2;
}

function calcPotentialEnergy(body, gravityY) {
  // PE = mgh, measured from bottom of canvas (900px)
  const m = body.mass;
  const g = Math.abs(gravityY) * 9.81; // scale to m/s²
  const h = Math.max(0, 900 - body.position.y) / 100; // pixels to "meters"
  return m * g * h;
}

function getBodyState(body) {
  return {
    id: body.label, // we store our ID in label
    x: body.position.x,
    y: body.position.y,
    angle: body.angle,
    vx: body.velocity.x,
    vy: body.velocity.y,
    angularVelocity: body.angularVelocity,
    speed: body.speed,
  };
}

// ── Main simulation loop ─────────────────────────────────────────────────────

function tick() {
  if (!isRunning) return;

  // Update physics engine by one fixed timestep (1000ms/60 ≈ 16.67ms)
  Matter.Engine.update(engine, 1000 / 60);
  tickCount++;

  // Collect all body positions for rendering
  const bodyStates = [];
  for (const [id, body] of bodies) {
    bodyStates.push(getBodyState(body));
  }

  // Send frame update to main thread
  self.postMessage({
    type: 'FRAME',
    payload: { bodies: bodyStates, tick: tickCount },
  });

  // Every N ticks, send analytics data
  if (tickCount % ANALYTICS_INTERVAL === 0) {
    const gravityY = engine.gravity.y;
    const analyticsData = bodyStates.map(b => {
      const mBody = bodies.get(b.id);
      return {
        id: b.id,
        kineticEnergy: mBody ? calcKineticEnergy(mBody) : 0,
        potentialEnergy: mBody ? calcPotentialEnergy(mBody, gravityY) : 0,
        speed: b.speed,
        vx: b.vx,
        vy: b.vy,
      };
    });

    self.postMessage({
      type: 'ANALYTICS',
      payload: { bodies: analyticsData, tick: tickCount },
    });
  }

  // Schedule next frame
  rafId = setTimeout(tick, 1000 / 60);
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = function (event) {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT': {
      // Create Matter.js engine
      engine = Matter.Engine.create();
      world = engine.world;

      // Set gravity
      if (payload.gravity) {
        engine.gravity.x = payload.gravity.x;
        engine.gravity.y = payload.gravity.y;
      }

      // Add ground and walls (static borders)
      const ground = Matter.Bodies.rectangle(800, 910, 1600, 40, { isStatic: true, label: '__ground__' });
      const wallL = Matter.Bodies.rectangle(-10, 450, 40, 900, { isStatic: true, label: '__wallL__' });
      const wallR = Matter.Bodies.rectangle(1610, 450, 40, 900, { isStatic: true, label: '__wallR__' });
      Matter.World.add(world, [ground, wallL, wallR]);

      // Restore bodies from saved state
      if (payload.physicsState?.bodies) {
        for (const b of payload.physicsState.bodies) {
          const mBody = createMatterBody(b);
          if (mBody) {
            bodies.set(b.id, mBody);
            Matter.World.add(world, mBody);
          }
        }
      }

      // Restore constraints
      if (payload.physicsState?.constraints) {
        for (const c of payload.physicsState.constraints) {
          const mConstraint = createMatterConstraint(c);
          if (mConstraint) {
            constraints.set(c.id, mConstraint);
            Matter.World.add(world, mConstraint);
          }
        }
      }

      self.postMessage({ type: 'READY' });
      break;
    }

    case 'START': {
      isRunning = true;
      tick();
      break;
    }

    case 'PAUSE': {
      isRunning = false;
      if (rafId) clearTimeout(rafId);
      break;
    }

    case 'RESET': {
      isRunning = false;
      if (rafId) clearTimeout(rafId);
      tickCount = 0;
      Matter.World.clear(world);
      bodies.clear();
      constraints.clear();
      self.postMessage({ type: 'RESET_DONE' });
      break;
    }

    case 'ADD_BODY': {
      const mBody = createMatterBody(payload.body);
      if (mBody) {
        bodies.set(payload.body.id, mBody);
        Matter.World.add(world, mBody);
      }
      break;
    }

    case 'REMOVE_BODY': {
      const b = bodies.get(payload.bodyId);
      if (b) {
        Matter.World.remove(world, b);
        bodies.delete(payload.bodyId);
      }
      break;
    }

    case 'MOVE_BODY': {
      const b = bodies.get(payload.bodyId);
      if (b) {
        Matter.Body.setPosition(b, { x: payload.x, y: payload.y });
        Matter.Body.setVelocity(b, { x: 0, y: 0 }); // stop on drop
      }
      break;
    }

    case 'SET_STATIC': {
      const b = bodies.get(payload.bodyId);
      if (b) Matter.Body.setStatic(b, payload.isStatic);
      break;
    }

    case 'ADD_CONSTRAINT': {
      const mC = createMatterConstraint(payload.constraint);
      if (mC) {
        constraints.set(payload.constraint.id, mC);
        Matter.World.add(world, mC);
      }
      break;
    }

    case 'REMOVE_CONSTRAINT': {
      const c = constraints.get(payload.constraintId);
      if (c) {
        Matter.World.remove(world, c);
        constraints.delete(payload.constraintId);
      }
      break;
    }

    case 'SET_GRAVITY': {
      engine.gravity.x = payload.x;
      engine.gravity.y = payload.y;
      break;
    }

    case 'TICK_STEP': {
      // Manual single step when paused (for debugging/teaching)
      Matter.Engine.update(engine, 1000 / 60);
      const bodyStates = [];
      for (const [id, body] of bodies) {
        bodyStates.push(getBodyState(body));
      }
      self.postMessage({ type: 'FRAME', payload: { bodies: bodyStates, tick: tickCount } });
      break;
    }

    case 'CHAOS_EVENT': {
      applyChaosEvent(payload.type, payload.params);
      break;
    }

    default:
      break;
  }
};

// ── Factory functions ────────────────────────────────────────────────────────

function createMatterBody(spec) {
  let mBody;
  const opts = {
    label: spec.id,
    isStatic: spec.isStatic || false,
    restitution: spec.restitution ?? 0.5,
    friction: spec.friction ?? 0.1,
    density: spec.density ?? 0.001,
  };

  switch (spec.type) {
    case 'circle':
      mBody = Matter.Bodies.circle(spec.x, spec.y, spec.radius || 30, opts);
      break;
    case 'rectangle':
      mBody = Matter.Bodies.rectangle(spec.x, spec.y, spec.width || 80, spec.height || 40, opts);
      break;
    case 'polygon':
      mBody = Matter.Bodies.polygon(spec.x, spec.y, spec.sides || 6, spec.radius || 40, opts);
      break;
    default:
      mBody = Matter.Bodies.circle(spec.x, spec.y, 30, opts);
  }

  if (spec.velocity) {
    Matter.Body.setVelocity(mBody, spec.velocity);
  }
  if (spec.angle) {
    Matter.Body.setAngle(mBody, spec.angle);
  }

  return mBody;
}

function createMatterConstraint(spec) {
  const bodyA = bodies.get(spec.bodyAId);
  const bodyB = spec.bodyBId ? bodies.get(spec.bodyBId) : null;

  if (!bodyA) return null;

  return Matter.Constraint.create({
    label: spec.id,
    bodyA,
    bodyB: bodyB || undefined,
    pointA: spec.pointA || { x: 0, y: 0 },
    pointB: spec.pointB || { x: 0, y: 0 },
    stiffness: spec.stiffness ?? 0.9,
    damping: spec.damping ?? 0.1,
    length: spec.length,
  });
}

// ── Chaos event handlers ─────────────────────────────────────────────────────

function applyChaosEvent(type, params) {
  switch (type) {
    case 'gravity_flip': {
      engine.gravity.y *= -1;
      break;
    }
    case 'zero_gravity': {
      engine.gravity.x = 0;
      engine.gravity.y = 0;
      break;
    }
    case 'shockwave': {
      // Apply outward impulse from center to all bodies
      const cx = params?.cx || 800;
      const cy = params?.cy || 450;
      for (const body of bodies.values()) {
        const dx = body.position.x - cx;
        const dy = body.position.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (params?.strength || 0.05) / dist;
        Matter.Body.applyForce(body, body.position, {
          x: (dx / dist) * force,
          y: (dy / dist) * force,
        });
      }
      break;
    }
    case 'random_impulse': {
      for (const body of bodies.values()) {
        if (!body.isStatic) {
          Matter.Body.applyForce(body, body.position, {
            x: (Math.random() - 0.5) * 0.1,
            y: (Math.random() - 0.5) * 0.1,
          });
        }
      }
      break;
    }
    case 'freeze_all': {
      for (const body of bodies.values()) {
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
      }
      break;
    }
    default:
      break;
  }
}
