# VIRTUAL-LAB 🔬

> A collaborative real-time 2D physics sandbox for university-level STEM education.
> Multiple users build, run, and analyse mechanical simulations simultaneously in a shared workspace.

[![CI/CD](https://github.com/yourusername/virtual-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/virtual-lab/actions)
[![Coverage](https://img.shields.io/badge/coverage-80%25-green)]()
[![Docker](https://img.shields.io/badge/docker-ready-blue)]()

**[Live Demo →](https://virtual-lab.yourdomain.com)** | **[Technical Deep-dive →](./docs/TECHNICAL.md)**

---

## What It Does

| Role | Can Do |
|------|--------|
| **Student** | Join rooms via code, add/move physics bodies, run simulations, view live analytics, clone templates, submit assignments |
| **Instructor** | Create rooms, lock/unlock editing, trigger Chaos Events (gravity flip, shockwave), publish experiment templates, grade student submissions |
| **Admin** | Full access + user management |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│                                                                 │
│  AuthContext ──► REST API calls (axios)                        │
│  SocketContext ──► Socket.io (real-time deltas)                │
│                                                                 │
│  usePhysics hook                                               │
│    └── PhysicsWorker (Web Worker thread)                       │
│          └── Matter.js Engine.update() @ 60fps                 │
│          └── postMessage(FRAME) → Canvas RAF render loop       │
│          └── postMessage(ANALYTICS) every 10 ticks             │
│                                                                 │
│  useRoomSync hook                                              │
│    └── Builds OT ops from user interactions                    │
│    └── socket.emit('physics_op', op)                           │
│    └── Receives 'op_applied' → applies to Worker               │
└───────────────────────┬─────────────────────────────────────────┘
                        │  WebSocket (Socket.io)
                        │  HTTP (REST)
┌───────────────────────▼─────────────────────────────────────────┐
│                        SERVER (Node.js)                         │
│                                                                 │
│  Express REST API                                              │
│    /api/auth        ── JWT register/login                      │
│    /api/rooms       ── CRUD + state persistence                │
│    /api/experiments ── save/publish/clone/submit/grade         │
│    /api/analytics   ── timeseries log queries                  │
│                                                                 │
│  Socket.io Manager                                             │
│    join_room   → send physicsState snapshot                    │
│    physics_op  → OT Engine → broadcast delta                   │
│    chaos_event → broadcast to all (instructor only)            │
│    cursor_move → broadcast (no persistence)                    │
│                                                                 │
│  OT Engine (Operational Transformation)                        │
│    Per-room version counter                                    │
│    Conflict resolution: same-body → last timestamp wins        │
│    Different bodies → always independent                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │  Mongoose ODM
┌───────────────────────▼─────────────────────────────────────────┐
│                        MongoDB                                  │
│  Users      — bcrypt hashed passwords, RBAC roles              │
│  Rooms      — physicsState snapshots, stateVersion (OT)        │
│               analyticsLog (capped timeseries)                 │
│               TTL index — auto-expires after 24h               │
│  Experiments — versioned saves, submissions, grades            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Engineering Decisions

### 1. Operational Transformation for Physics Sync
**Problem:** Two users drag the same body simultaneously. Whose position wins?

**Solution:** Server-authoritative OT with vector clocks.
- Each op carries `{ version, userId, timestamp }`
- If `op.version === serverVersion` → apply directly (no conflict)
- If `op.version < serverVersion` → transform against concurrent ops (last timestamp wins for same body)
- Server broadcasts the *transformed* op to all clients
- Clients apply ops optimistically for instant feedback; roll back on rejection

**Trade-off discussed:** CRDTs (used by Figma) guarantee convergence without a central server but are more complex. Server-authoritative OT is simpler and correct for physics (which needs a single simulation ground truth anyway).

### 2. Web Worker for Physics Simulation
**Problem:** Matter.js `Engine.update()` at 60fps blocks the main thread → dropped React renders.

**Solution:** Physics runs in a dedicated Web Worker thread.
- Worker owns the Matter.js engine entirely
- Sends `FRAME` messages (body positions) to main thread via `postMessage`
- Main thread renders positions via `requestAnimationFrame` — never blocked
- Result: 60fps UI even with 100+ physics bodies

### 3. Delta Broadcasting (not full state)
Full physicsState for 50 bodies ≈ 5KB. At 60fps with 10 users that's 3MB/s.
We broadcast only *what changed* (a single body move ≈ 100B → 60KB/s).
Full state is only sent once on `join_room`.

### 4. MongoDB TTL Index on Rooms
Rooms auto-expire after 24h via `expiresAt` field + TTL index.
No cron job needed — MongoDB handles cleanup automatically.

### 5. Experiment Versioning
Every save appends to `versions[]` array (like Git commits).
Students can revert to any previous version.
Instructors see a submission's history, not just the final state.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Hooks | Component model, Context for global state |
| Physics | Matter.js (Web Worker) | Best 2D rigid body engine for browsers |
| Styling | Tailwind CSS | Utility-first, no CSS file bloat |
| Charts | Recharts | React-native, responsive, streaming-friendly |
| Realtime | Socket.io | WebSocket with fallback, rooms built-in |
| Backend | Node.js + Express | Non-blocking I/O ideal for socket-heavy servers |
| Database | MongoDB + Mongoose | Flexible schema for physics state JSON |
| Auth | JWT + bcrypt | Stateless, scales horizontally |
| Testing | Jest + Supertest | Unit (OT engine) + integration (auth routes) |
| DevOps | Docker + GitHub Actions | Reproducible builds, automated CI |

---

## Running Locally

### Option A: Docker (recommended)
```bash
git clone https://github.com/yourusername/virtual-lab
cd virtual-lab
cp backend/.env.example backend/.env   # edit JWT_SECRET
docker-compose up --build
# → Frontend: http://localhost:3000
# → Backend:  http://localhost:5000
# → MongoDB:  mongodb://localhost:27017
```

### Option B: Manual
```bash
# Terminal 1 — MongoDB
mongod

# Terminal 2 — Backend
cd backend && cp .env.example .env && npm install && npm run dev

# Terminal 3 — Frontend
cd frontend && npm install && npm start
```

---

## Running Tests
```bash
cd backend
npm test              # run all tests
npm test -- --coverage  # with coverage report
```

Current coverage: **OT Engine 100%**, **Auth routes 95%**

---

## Project Structure

```
virtual-lab/
├── .github/workflows/ci.yml   ← GitHub Actions CI/CD
├── docker-compose.yml          ← One-command full stack
├── backend/
│   ├── src/
│   │   ├── server.js           ← Express + Socket.io entry
│   │   ├── config/db.js        ← MongoDB connection
│   │   ├── middleware/auth.js  ← JWT protect + RBAC authorize
│   │   ├── models/             ← User, Room, Experiment (Mongoose)
│   │   ├── controllers/        ← Business logic
│   │   ├── routes/             ← Express routers
│   │   ├── socket/
│   │   │   ├── socketManager.js ← Socket.io event handlers
│   │   │   └── otEngine.js      ← OT conflict resolution ⭐
│   │   └── __tests__/          ← Jest tests
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── context/            ← AuthContext, SocketContext
    │   ├── hooks/
    │   │   ├── usePhysics.js   ← Worker bridge + RAF render ⭐
    │   │   └── useRoomSync.js  ← OT client + socket events ⭐
    │   ├── workers/
    │   │   └── physicsWorker.js ← Matter.js in Web Worker ⭐
    │   ├── components/
    │   │   ├── Canvas/         ← PhysicsCanvas, ToolPanel, ChaosPanel
    │   │   └── Dashboard/      ← AnalyticsDashboard (Recharts)
    │   └── pages/              ← Dashboard, RoomPage, MyExperiments
    └── Dockerfile
```

---

## What I Learned / Interview Talking Points

- **Distributed state synchronisation** — implementing OT from scratch taught me why Figma chose CRDTs and where the tradeoffs lie
- **Web Workers** — moving CPU-intensive work off the main thread; understanding the structured clone algorithm's limitations (can't transfer DOM references)
- **JWT security** — localStorage vs httpOnly cookies tradeoff; why `select: false` on passwordHash matters
- **MongoDB schema design** — embedding vs referencing; TTL indexes; capped arrays (`$slice`)
- **Socket.io architecture** — rooms, namespaces, auth middleware on handshake
- **CI/CD** — GitHub Actions with service containers (real MongoDB in CI, not mocks)

---

## Future Work

- [ ] CRDT-based sync (replace OT for true peer-to-peer)
- [ ] 3D physics mode (Three.js + Cannon.js)
- [ ] Replay system (record + playback full simulation)
- [ ] LTI integration (connect to Moodle/Canvas LMS)
- [ ] Mobile touch support
