let _socketInstance = null;
import { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { api } from "../../context/AuthContext";
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const BODY_COLORS = [
  "#3B82F6","#96d8c2","#F59E0B","#EF4444",
  "#A78BFA","#34D399","#F472B6","#38BDF8",
];
let colorIndex = 0;
const nextColor = () => BODY_COLORS[colorIndex++ % BODY_COLORS.length];

const Panel = ({ style = {}, children }) => (
  <div style={{ background:"#1E293B", borderRadius:12, padding:"14px 16px",
    color:"white", boxShadow:"0 4px 16px rgba(0,0,0,0.4)", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:700,
    letterSpacing:1.2, textTransform:"uppercase", color:"#64748B" }}>
    {children}
  </p>
);

const Btn = ({ onClick, color="#334155", children, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? "#1E293B" : color,
    color: disabled ? "#475569" : "white",
    border:"none", borderRadius:8, padding:"7px 12px", fontSize:12,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight:500, transition:"opacity 0.15s", width:"100%",
  }}
    onMouseEnter={e => { if(!disabled) e.currentTarget.style.opacity=0.8; }}
    onMouseLeave={e => { e.currentTarget.style.opacity=1; }}
  >{children}</button>
);

const Slider = ({ label, value, min, max, step, onChange, format, disabled }) => (
  <div style={{ marginBottom:12 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
      <span style={{ fontSize:11, color:"#94A3B8" }}>{label}</span>
      <span style={{ fontSize:11, color:"#E2E8F0", fontFamily:"monospace" }}>
        {format ? format(value) : value}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      disabled={disabled}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width:"100%", accentColor:"#38BDF8" }} />
  </div>
);

export default function PhysicsCanvas({ room }) {
  const { user }   = useAuth();
  const { socket } = useSocket();
  const navigate   = useNavigate();

  const isStudent    = user?.role === "student";
  const isInstructor = user?.role === "instructor" || user?.role === "admin";

  const [gravity,         setGravity]         = useState(0.7);
  const [springStiffness, setSpringStiffness] = useState(0.005);
  const [density,         setDensity]         = useState(0.02);
  const [restitution,     setRestitution]     = useState(0.6);
  const [friction,        setFriction]        = useState(0.1);
  const [activeTab,       setActiveTab]       = useState("controls");
  const [collisions,      setCollisions]      = useState(0);
  const [isPinMode,       setIsPinMode]       = useState(false);
  const [isLocked,        setIsLocked]        = useState(room?.isLocked || false);
  const [participants,    setParticipants]    = useState([]);
  const [chaosMsg,        setChaosMsg]        = useState("");
  const [syncMsg,         setSyncMsg]         = useState("");
  const [saveStatus,      setSaveStatus]      = useState("");
  const [graphData,       setGraphData]       = useState([]);
  const [metrics,         setMetrics]         = useState({
    velocity:0, acceleration:0, x:0, y:0,
    objectCount:0, kineticEnergy:0, potentialEnergy:0,
  });

  const sceneRef              = useRef(null);
  const engineRef             = useRef(null);
  const mouseConstraintRef    = useRef(null);
  const trackedBodyRef        = useRef(null);
  const previousVelocitiesRef = useRef(new Map());
  const collisionCountRef     = useRef(0);
  const isPinModeRef          = useRef(false);
  const densityRef            = useRef(density);
  const restitutionRef        = useRef(restitution);
  const frictionRef           = useRef(friction);
  const springStiffnessRef    = useRef(springStiffness);
  const isDraggingRef = useRef(false);
  const socketRef     = useRef(socket);

  // keep refs in sync with state
  useEffect(() => {
  socketRef.current = socket;
  _socketInstance = socket;
}, [socket]);
  useEffect(() => { isPinModeRef.current     = isPinMode; },       [isPinMode]);
  useEffect(() => { densityRef.current       = density; },         [density]);
  useEffect(() => { restitutionRef.current   = restitution; },     [restitution]);
  useEffect(() => { frictionRef.current      = friction; },        [friction]);
  useEffect(() => { springStiffnessRef.current = springStiffness;}, [springStiffness]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.gravity.y = gravity;
  }, [gravity]);

  // ── Setup Matter.js ────────────────────────────────────────────────────────
  useEffect(() => {
    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Events, Body, Bounds } = Matter;

    const engine = Engine.create();
    engine.gravity.y = 0.7;
    engineRef.current = engine;

    const render = Render.create({
      element: sceneRef.current,
      engine,
      options: { width:960, height:560, wireframes:false, background:"#0F172A" },
    });

    const ground = Bodies.rectangle(480,580,960,40,{ isStatic:true, label:"__ground__", render:{ fillStyle:"#334155" } });
    const wallL  = Bodies.rectangle(-10,280,20,560, { isStatic:true, label:"__wallL__",  render:{ fillStyle:"#334155" } });
    const wallR  = Bodies.rectangle(970,280,20,560, { isStatic:true, label:"__wallR__",  render:{ fillStyle:"#334155" } });
    Composite.add(engine.world, [ground, wallL, wallR]);

console.log("ROOM:", room);
console.log("PHYSICS STATE:", room?.physicsState);
console.log("BODIES:", room?.physicsState?.bodies);

    // Restore saved bodies from room physicsState
if (room?.physicsState?.bodies?.length > 0) {
  console.log("RESTORE BLOCK RUNNING");
  room.physicsState.bodies.forEach(b => {
    if (!b.shape || b.shape.startsWith('__')) return;
    const opts = {
      density: 0.02, restitution: 0.6, friction: 0.1,
      label: b.shape,
      render: { fillStyle: nextColor() },
    };
    let body;
    if (b.shape === 'box' || b.shape === 'anchoredSpring' || b.shape === 'coupledA' || b.shape === 'coupledB') {
      body = Bodies.rectangle(b.x, b.y, 80, 80, opts);
    } else if (b.shape === 'circle' || b.shape === 'pendulum') {
      body = Bodies.circle(b.x, b.y, 40, opts);
    } else if (b.shape === 'triangle') {
      body = Bodies.polygon(b.x, b.y, 3, 50, opts);
    } else if (b.shape === 'hexagon') {
      body = Bodies.polygon(b.x, b.y, 6, 45, opts);
    }
    if (body) Composite.add(engine.world, body);
  });
}

    const mouse = Mouse.create(render.canvas);
    const mc = MouseConstraint.create(engine, {
      mouse, constraint:{ stiffness:0.15, render:{ visible:false } },
    });
    mouseConstraintRef.current = mc;
    Composite.add(engine.world, mc);
    render.mouse = mouse;

    Events.on(mc, "startdrag", e => {
  trackedBodyRef.current = e.body;
  isDraggingRef.current = true;
});

Events.on(mc, "enddrag", e => {
  isDraggingRef.current = false;
});

Events.on(mc, "mousemove", e => {
  if (!isDraggingRef.current || !trackedBodyRef.current) return;
  const b = trackedBodyRef.current;
  _socketInstance?.emit("canvas_action", {
    action: "move_body",
    data: {
      label: b.label,
      x: b.position.x,
      y: b.position.y,
      vx: b.velocity.x,
      vy: b.velocity.y,
      angle: b.angle,
    },
  });
});

    Events.on(mc, "mousedown", e => {
      if (!isPinModeRef.current) return;
      for (const b of Composite.allBodies(engine.world)) {
        if (b.label.startsWith("__")) continue;
        if (Bounds.contains(b.bounds, e.mouse.position)) {
          Body.setStatic(b, !b.isStatic);
          b.render.opacity = b.isStatic ? 0.45 : 1;
          break;
        }
      }
    });

    Events.on(engine, "collisionStart", e => {
      const valid = e.pairs.filter(p => !p.bodyA.label.startsWith("__") && !p.bodyB.label.startsWith("__"));
      if (valid.length) {
        collisionCountRef.current += valid.length;
        setCollisions(collisionCountRef.current);
      }
    });

    Events.on(render, "afterRender", () => {
      const ctx = render.context;
      Composite.allBodies(engine.world).forEach(body => {
        if (body.isStatic) return;
        const { x:bx, y:by } = body.position;
        const vel = body.velocity;

        // velocity vector (green)
        const evx = bx + vel.x*25, evy = by + vel.y*25;
        ctx.beginPath(); ctx.moveTo(bx-10,by); ctx.lineTo(evx-10,evy);
        ctx.strokeStyle="#22C55E"; ctx.lineWidth=2; ctx.stroke();
        ctx.beginPath(); ctx.arc(evx-10,evy,4,0,2*Math.PI);
        ctx.fillStyle="#22C55E"; ctx.fill();

        // acceleration vector (red)
        const prev = previousVelocitiesRef.current.get(body.id);
        let ax=0, ay=0;
        if (prev) {
          ax = prev.ax*0.8 + (vel.x-prev.vx)*80*0.2;
          ay = prev.ay*0.8 + (vel.y-prev.vy)*80*0.2;
        }
        ctx.beginPath(); ctx.moveTo(bx+10,by); ctx.lineTo(bx+10+ax,by+ay);
        ctx.strokeStyle="#EF4444"; ctx.lineWidth=2; ctx.stroke();
        ctx.beginPath(); ctx.arc(bx+10+ax,by+ay,4,0,2*Math.PI);
        ctx.fillStyle="#EF4444"; ctx.fill();

        // label
        ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font="10px monospace"; ctx.textAlign="center";
        ctx.fillText(body.label.replace("__","").slice(0,7), bx, by-(body.circleRadius||22)-4);

        // metrics
        const vMag = Math.sqrt(vel.x**2 + vel.y**2);
        const aMag = Math.sqrt(ax**2 + ay**2);
        const ke   = 0.5*body.mass*vMag*vMag;
        const pe   = body.mass*Math.abs(engine.gravity.y)*9.81*Math.max(0,560-by)*0.001;

        if (trackedBodyRef.current === body) {
          setMetrics({
            velocity:       vMag.toFixed(2),
            acceleration:   aMag.toFixed(2),
            x:              bx.toFixed(1),
            y:              by.toFixed(1),
            objectCount:    Composite.allBodies(engine.world).filter(b=>!b.isStatic).length,
            kineticEnergy:  ke.toFixed(3),
            potentialEnergy:pe.toFixed(3),
          });
          setGraphData(prev => {
            const next = [...prev, { t:prev.length, vel:+vMag.toFixed(2), ke:+ke.toFixed(3), pe:+pe.toFixed(3), tot:+(ke+pe).toFixed(3) }];
            return next.length>40 ? next.slice(-40) : next;
          });
        }
        previousVelocitiesRef.current.set(body.id, { vx:vel.x, vy:vel.y, ax, ay });
      });
    });

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      Matter.World.clear(engine.world);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const makeOpts = (label) => ({
    density: densityRef.current,
    restitution: restitutionRef.current,
    friction: frictionRef.current,
    label,
    render: { fillStyle: nextColor() },
  });

  const createWalls = () => [
    Matter.Bodies.rectangle(480,580,960,40,{ isStatic:true, label:"__ground__", render:{ fillStyle:"#334155" } }),
    Matter.Bodies.rectangle(-10,280,20,560, { isStatic:true, label:"__wallL__",  render:{ fillStyle:"#334155" } }),
    Matter.Bodies.rectangle(970,280,20,560, { isStatic:true, label:"__wallR__",  render:{ fillStyle:"#334155" } }),
  ];

  // ── Core body adders (also called when receiving canvas_action from others) ─
  const _addBox = useCallback((x, y) => {
  const px = x ?? Math.random()*600+180;
  const b = Matter.Bodies.rectangle(px, y ?? 80, 80, 80, makeOpts("box"));
  Matter.Composite.add(engineRef.current.world, b);
  trackedBodyRef.current = b;
}, []);

  const _addCircle = useCallback((x, y) => {
  const px = x ?? Math.random()*600+180;
  const b = Matter.Bodies.circle(px, y ?? 80, 40, makeOpts("circle"));
  Matter.Composite.add(engineRef.current.world, b);
  trackedBodyRef.current = b;
}, []);

  const _addTriangle = useCallback((x, y) => {
  const px = x ?? Math.random()*600+180;
  const b = Matter.Bodies.polygon(px, y ?? 80, 3, 50, makeOpts("triangle"));
  Matter.Composite.add(engineRef.current.world, b);
  trackedBodyRef.current = b;
}, []);

  const _addHexagon = useCallback((x, y) => {
  const px = x ?? Math.random()*600+180;
  const b = Matter.Bodies.polygon(px, y ?? 80, 6, 45, makeOpts("hexagon"));
  Matter.Composite.add(engineRef.current.world, b);
  trackedBodyRef.current = b;
}, []);

  const _addSpringPair = useCallback(() => {
    const box = Matter.Bodies.rectangle(480, 200, 80, 80, makeOpts("anchoredSpring"));
    const spring = Matter.Constraint.create({
      pointA:{ x:380, y:100 }, bodyB:box,
      stiffness: springStiffnessRef.current, damping:0.05, length:200,
      render:{ strokeStyle:"#FFFFFF", lineWidth:3 },
    });
    Matter.Composite.add(engineRef.current.world, [box, spring]);
    trackedBodyRef.current = box;
  }, []);

  const _addCoupledSpring = useCallback(() => {
    const boxA = Matter.Bodies.rectangle(300, 200, 80, 80, makeOpts("coupledA"));
    const boxB = Matter.Bodies.rectangle(650, 200, 80, 80, makeOpts("coupledB"));
    const spring = Matter.Constraint.create({
      bodyA:boxA, bodyB:boxB,
      stiffness: springStiffnessRef.current, damping:0.05, length:300,
      render:{ strokeStyle:"#FFFFFF", lineWidth:3 },
    });
    Matter.Composite.add(engineRef.current.world, [boxA, boxB, spring]);
    trackedBodyRef.current = boxA;
  }, []);

  const _addPendulum = useCallback(() => {
    const pivot = Matter.Bodies.circle(480, 60, 10, {
      isStatic:true, label:"__pivot__", render:{ fillStyle:"#94A3B8" },
    });
    const bob = Matter.Bodies.circle(480, 260, 30, makeOpts("pendulum"));
    const rod = Matter.Constraint.create({
      bodyA:pivot, bodyB:bob, stiffness:1, length:200,
      render:{ strokeStyle:"#94A3B8", lineWidth:2 },
    });
    Matter.Body.setVelocity(bob, { x:5, y:0 });
    Matter.Composite.add(engineRef.current.world, [pivot, bob, rod]);
    trackedBodyRef.current = bob;
  }, []);

  const _resetScene = useCallback(() => {
    if (!engineRef.current) return;
    Matter.Composite.clear(engineRef.current.world, false);
    setGraphData([]); setCollisions(0);
    collisionCountRef.current = 0;
    trackedBodyRef.current = null;
    Matter.Composite.add(engineRef.current.world, [...createWalls(), mouseConstraintRef.current]);
  }, []);

  const _loadPreset = useCallback((type) => {
    _resetScene();
    if (type === "freefall")  { _addBox(); _addCircle(); _addTriangle(); }
    if (type === "shm")       _addSpringPair();
    if (type === "coupled")   _addCoupledSpring();
    if (type === "pendulum")  _addPendulum();
    if (type === "collision") { _addBox(); _addCircle(); _addHexagon(); _addTriangle(); }
  }, [_resetScene, _addBox, _addCircle, _addTriangle, _addHexagon, _addSpringPair, _addCoupledSpring, _addPendulum]);

  // ── EMIT helper: send action to server then apply locally ──────────────────
  const canEdit = !isLocked || isInstructor;

  const emitCanvasAction = useCallback((action, data = {}) => {
    socket?.emit("canvas_action", { action, data });
  }, [socket]);

  // Public versions: apply locally + emit to others
  const addBox = () => {
  if (!canEdit) return;
  const x = Math.random()*600+180;
  _addBox(x, 80);
  emitCanvasAction("add_body", { type:"box", x, y:80 });
};
  const addCircle = () => {
  if (!canEdit) return;
  const x = Math.random()*600+180;
  _addCircle(x, 80);
  emitCanvasAction("add_body", { type:"circle", x, y:80 });
};
  const addTriangle = () => {
  if (!canEdit) return;
  const x = Math.random()*600+180;
  _addTriangle(x, 80);
  emitCanvasAction("add_body", { type:"triangle", x, y:80 });
};
  const addHexagon = () => {
  if (!canEdit) return;
  const x = Math.random()*600+180;
  _addHexagon(x, 80);
  emitCanvasAction("add_body", { type:"hexagon", x, y:80 });
};
  const addSpringPair = () => {
  if (!canEdit) return;
  _addSpringPair();
  console.log("📤 emitting canvas_action add_body spring_pair, socket:", socket?.id, "connected:", socket?.connected);
  emitCanvasAction("add_body", { type:"spring_pair" });
};
  const addCoupledSpring = () => { if (!canEdit) return; _addCoupledSpring();emitCanvasAction("add_body", { type:"coupled_spring" }); };
  const addPendulum      = () => { if (!canEdit) return; _addPendulum();     emitCanvasAction("add_body", { type:"pendulum" }); };

  const loadPreset = (type) => {
    if (!canEdit) return;
    _loadPreset(type);
    emitCanvasAction("load_preset", { preset: type });
  };

  const resetScene = () => {
    if (!canEdit) return;
    _resetScene();
    emitCanvasAction("reset_scene");
  };

  // ── RECEIVE canvas_action from other users ─────────────────────────────────
  useEffect(() => {
    if (!socket){
      console.log("❌ NO SOCKET");
       return;
    }
    console.log("✅ Socket exists, id:", socket.id);
  console.log("✅ Socket connected:", socket.connected);

    socket.on("canvas_action", ({ action, data, triggeredByName }) => {
       console.log("📨 canvas_action received:", action, data, triggeredByName);
      // Show a brief "who did what" toast
      const label = triggeredByName || "Someone";
       if (action === "move_body") {
    // Find the body by label and update its position
       const allBodies = Matter.Composite.allBodies(engineRef.current.world);
       const body = allBodies.find(b => b.label === data.label);
       if (body) {
        Matter.Body.setPosition(body, { x: data.x, y: data.y });
        Matter.Body.setVelocity(body, { x: data.vx, y: data.vy });
        Matter.Body.setAngle(body, data.angle);
       }
      return; // no toast for move_body — too frequent
     }


      if (action === "reset_scene") {
        setSyncMsg(`${label} reset the scene`);
        _resetScene();
      } else if (action === "load_preset") {
        setSyncMsg(`${label} loaded preset: ${data.preset}`);
        _loadPreset(data.preset);
      } else if (action === "add_body") {
        setSyncMsg(`${label} added a ${data.type}`);
        if (data.type === "box")            _addBox(data.x, data.y);
        else if (data.type === "circle")    _addCircle(data.x, data.y);
        else if (data.type === "triangle")  _addTriangle(data.x, data.y);
        else if (data.type === "hexagon")   _addHexagon(data.x, data.y);    
        else if (data.type === "spring_pair")    _addSpringPair();
        else if (data.type === "coupled_spring") _addCoupledSpring();
        else if (data.type === "pendulum")       _addPendulum();
      }
      setTimeout(() => setSyncMsg(""), 2500);
    });

    socket.on("room_joined",      ({ participants:p }) => setParticipants(p || []));
    socket.on("participant_join",  p  => setParticipants(prev => [...prev.filter(u=>u.userId!==p.userId), p]));
    socket.on("participant_leave", ({ userId }) => setParticipants(prev => prev.filter(u=>u.userId!==userId)));
    socket.on("room_locked",   () => setIsLocked(true));
    socket.on("room_unlocked", () => setIsLocked(false));

    socket.on("chaos_broadcast", ({ type, params, triggeredBy }) => {
      applyChaosLocally(type, params);
      setChaosMsg(`${triggeredBy} triggered: ${type.replace(/_/g," ")}`);
      setTimeout(() => setChaosMsg(""), 3000);
    });

    socket.on("simulation_control", ({ action }) => {
      if (action === "reset") _resetScene();
    });

    return () => {
      socket.off("canvas_action");
      socket.off("room_joined");
      socket.off("participant_join");
      socket.off("participant_leave");
      socket.off("room_locked");
      socket.off("room_unlocked");
      socket.off("chaos_broadcast");
      socket.off("simulation_control");
    };
  }, [socket, _resetScene, _loadPreset, _addBox, _addCircle, _addTriangle, _addHexagon, _addSpringPair, _addCoupledSpring, _addPendulum]);

  // ── Chaos (instructor only, emitted via socket) ────────────────────────────
  const applyChaosLocally = (type, params) => {
    if (!engineRef.current) return;
    const bodies = Matter.Composite.allBodies(engineRef.current.world).filter(b => !b.isStatic);
    if (type === "gravity_flip")  { engineRef.current.gravity.y *= -1; setGravity(g => parseFloat((-g).toFixed(1))); }
    if (type === "zero_gravity")  { engineRef.current.gravity.x=0; engineRef.current.gravity.y=0; setGravity(0); }
    if (type === "shockwave") {
      const cx = params?.cx||480, cy = params?.cy||280;
      bodies.forEach(b => {
        const dx=b.position.x-cx, dy=b.position.y-cy, dist=Math.sqrt(dx*dx+dy*dy)||1;
        Matter.Body.applyForce(b, b.position, { x:(dx/dist)*0.08, y:(dy/dist)*0.08 });
      });
    }
    if (type === "freeze_all") {
      bodies.forEach(b => { Matter.Body.setVelocity(b,{x:0,y:0}); Matter.Body.setAngularVelocity(b,0); });
    }
  };

  const emitChaos = (type, params={}) => {
    if (!isInstructor) return;
    socket?.emit("chaos_event", { type, params:{ ...params, cx:480, cy:280 } });
  };

  const emitToggleLock = () => {
    if (!isInstructor) return;
    socket?.emit("toggle_lock");
  };

  // ── Save to backend ────────────────────────────────────────────────────────
  const saveExperiment = async () => {
    console.log(
    "All body labels:",
    Matter.Composite.allBodies(engineRef.current.world)
      .map(b => b.label)
  );
  const bodies = Matter.Composite.allBodies(engineRef.current.world)
    .filter(b => !b.isStatic)
    .map(b => ({ shape:b.label, x:b.position.x, y:b.position.y }));

  console.log("Saving:", bodies);

  // Check if this room was loaded from a template
  const templateId = room?.templateId;

  try {
    setSaveStatus("Saving...");

    if (templateId && isStudent) {
      // Student submitting against a template
      await api.post(`/experiments/${templateId}/submit`, {
        physicsState: { bodies },
        studentName: user?.name,
        analyticsSnapshot: metrics,
      });
      setSaveStatus("✓ Submitted!");
    } else {
      // Regular save to personal library
      await api.post("/experiments", {
        title: `${room?.name||"Lab"} — ${new Date().toLocaleTimeString()}`,
        description: `Saved from room ${room?.code}`,
        physicsState: { bodies },
        authorName: user?.name,
      });
      setSaveStatus("✓ Saved to library!");
    }
  } catch {
    localStorage.setItem("virtualLabExperiment", JSON.stringify(bodies));
    setSaveStatus("Saved locally");
  }
  setTimeout(() => setSaveStatus(""), 2500);
};

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:"#0F172A", minHeight:"100vh", padding:"12px 16px", fontFamily:"system-ui, sans-serif" }}>

      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => navigate("/dashboard")}
            style={{ background:"none", border:"none", color:"#64748B", cursor:"pointer", fontSize:20 }}>
            ←
          </button>
          <h1 style={{ color:"#38BDF8", margin:0, fontSize:18, fontWeight:700, letterSpacing:1 }}>
            ⚛ {room?.name || "Lab"}
          </h1>
          <span style={{ fontFamily:"monospace", fontSize:12, background:"#0F2744",
            color:"#38BDF8", padding:"3px 10px", borderRadius:20 }}>
            {room?.code}
          </span>
          {isLocked && <span style={{ color:"#EF4444", fontSize:12, fontWeight:600 }}>🔒 LOCKED</span>}
        </div>

        <div style={{ display:"flex", gap:14, alignItems:"center" }}>
          {/* participant avatars */}
          <div style={{ display:"flex", gap:3 }}>
            {participants.slice(0,6).map(p => (
              <div key={p.userId} title={`${p.name} (${p.role})`} style={{
                width:26, height:26, borderRadius:"50%",
                background: p.color||"#334155",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:700, color:"white", border:"2px solid #0F172A",
              }}>{p.name?.[0]?.toUpperCase()}</div>
            ))}
            {participants.length > 0 && (
              <span style={{ color:"#64748B", fontSize:11, alignSelf:"center", marginLeft:3 }}>
                {participants.length} online
              </span>
            )}
          </div>
          <span style={{ color:"#64748B", fontSize:11 }}>
            Collisions: <span style={{ color:"#F472B6", fontWeight:700, fontFamily:"monospace" }}>{collisions}</span>
          </span>
          <span style={{ color:"#64748B", fontSize:11 }}>
            Objects: <span style={{ color:"#34D399", fontWeight:700, fontFamily:"monospace" }}>{metrics.objectCount}</span>
          </span>
          <span style={{ color:"#64748B", fontSize:11 }}>
            {user?.name} <span style={{ color:"#A78BFA" }}>({user?.role})</span>
          </span>
        </div>
      </div>

      {/* Sync toast — who did what */}
      {syncMsg && (
        <div style={{ background:"#1E3A5F", color:"#38BDF8", textAlign:"center",
          padding:"6px", borderRadius:8, marginBottom:8, fontSize:12, fontWeight:500 }}>
          🔄 {syncMsg}
        </div>
      )}

      {/* Chaos banner */}
      {chaosMsg && (
        <div style={{ background:"#7F1D1D", color:"white", textAlign:"center",
          padding:"7px", borderRadius:8, marginBottom:8, fontSize:13, fontWeight:600 }}>
          💥 {chaosMsg}
        </div>
      )}

      <div style={{ display:"flex", gap:12 }}>

        {/* Sidebar */}
        <div style={{ width:218, flexShrink:0, display:"flex", flexDirection:"column", gap:9 }}>

          <div style={{ display:"flex", background:"#0F172A", borderRadius:8, padding:3, border:"1px solid #1E293B" }}>
            {["controls","analytics"].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                flex:1, padding:"5px 0", borderRadius:6, border:"none",
                background: activeTab===t ? "#1E293B" : "transparent",
                color: activeTab===t ? "white" : "#64748B",
                cursor:"pointer", fontSize:11, fontWeight:600, textTransform:"capitalize",
              }}>{t}</button>
            ))}
          </div>

          {activeTab === "controls" && (<>
            <Panel>
              <SectionTitle>Physics Parameters</SectionTitle>
              <Slider label="Gravity"    value={gravity}         min={-2}     max={2}   step={0.1}    onChange={setGravity}         format={v=>v.toFixed(1)}  disabled={isLocked&&isStudent} />
              <Slider label="Stiffness"  value={springStiffness} min={0.0001} max={0.5} step={0.0005} onChange={setSpringStiffness} format={v=>v.toFixed(4)}  disabled={isLocked&&isStudent} />
              <Slider label="Density"    value={density}         min={0.001}  max={0.2} step={0.001}  onChange={setDensity}         format={v=>v.toFixed(3)}  disabled={isLocked&&isStudent} />
              <Slider label="Bounciness" value={restitution}     min={0}      max={1}   step={0.05}   onChange={setRestitution}     format={v=>v.toFixed(2)}  disabled={isLocked&&isStudent} />
              <Slider label="Friction"   value={friction}        min={0}      max={1}   step={0.05}   onChange={setFriction}        format={v=>v.toFixed(2)}  disabled={isLocked&&isStudent} />
            </Panel>

            <Panel>
              <SectionTitle>Add Bodies</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                <Btn onClick={addBox}      disabled={!canEdit}>📦 Box</Btn>
                <Btn onClick={addCircle}   disabled={!canEdit}>⚪ Circle</Btn>
                <Btn onClick={addTriangle} disabled={!canEdit}>🔺 Triangle</Btn>
                <Btn onClick={addHexagon}  disabled={!canEdit}>⬡ Hexagon</Btn>
              </div>
            </Panel>

            <Panel>
              <SectionTitle>Constraints</SectionTitle>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <Btn onClick={addSpringPair}    disabled={!canEdit}>🔗 Anchored Spring</Btn>
                <Btn onClick={addCoupledSpring} disabled={!canEdit}>🔗 Coupled Spring</Btn>
                <Btn onClick={addPendulum}      disabled={!canEdit}>🕰 Pendulum</Btn>
              </div>
            </Panel>

            {isInstructor && (
              <Panel>
                <SectionTitle>Instructor Controls</SectionTitle>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <Btn onClick={emitToggleLock}               color={isLocked?"#065F46":"#7F1D1D"}>
                    {isLocked ? "🔓 Unlock Room" : "🔒 Lock Room"}
                  </Btn>
                  <Btn onClick={()=>emitChaos("gravity_flip")} color="#7C3AED">🔄 Flip Gravity</Btn>
                  <Btn onClick={()=>emitChaos("shockwave")}    color="#B45309">💥 Shockwave</Btn>
                  <Btn onClick={()=>emitChaos("freeze_all")}   color="#0369A1">❄ Freeze All</Btn>
                  <Btn onClick={()=>emitChaos("zero_gravity")} color="#4C1D95">🚀 Zero Gravity</Btn>
                  <Btn onClick={()=>setIsPinMode(p=>!p)}       color={isPinMode?"#065F46":"#334155"}>
                    📌 Pin Mode {isPinMode?"ON":"OFF"}
                  </Btn>
                </div>
              </Panel>
            )}
          </>)}

          {activeTab === "analytics" && (<>
            <Panel>
              <SectionTitle>Live Metrics</SectionTitle>
              <div style={{ fontSize:11, color:"#94A3B8", lineHeight:2.1 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span>Tracking</span>
                  <span style={{ color:"#38BDF8", fontFamily:"monospace" }}>
                    {trackedBodyRef.current?.label||"none"}
                  </span>
                </div>
                {[
                  ["Velocity",    `${metrics.velocity} px/s`],
                  ["Acceleration",`${metrics.acceleration} px/s²`],
                  ["X",           `${metrics.x} px`],
                  ["Y",           `${metrics.y} px`],
                  ["Kinetic E",   `${metrics.kineticEnergy} J`],
                  ["Potential E", `${metrics.potentialEnergy} J`],
                  ["Total E",     `${(+metrics.kineticEnergy + +metrics.potentialEnergy).toFixed(3)} J`],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                    <span>{k}</span>
                    <span style={{ color:"white", fontFamily:"monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <SectionTitle>Vector Legend</SectionTitle>
              <div style={{ fontSize:12, lineHeight:2.2 }}>
                <div style={{ color:"#22C55E" }}>● Velocity</div>
                <div style={{ color:"#EF4444" }}>● Acceleration</div>
              </div>
            </Panel>
          </>)}

          <Panel>
            <SectionTitle>Scene</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <Btn onClick={saveExperiment} color={room?.templateId && isStudent ? "#7C3AED" : "#065F46"}>
  {saveStatus || (room?.templateId && isStudent ? "📤 Submit Assignment" : "💾 Save to Library")}
</Btn>
              <Btn onClick={resetScene} color="#7F1D1D" disabled={!canEdit}>↺ Reset</Btn>
            </div>
          </Panel>
        </div>

        {/* Canvas area */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:9 }}>

          {/* Preset bar */}
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
            {[
              { key:"freefall",  label:"🍎 Free Fall" },
              { key:"shm",       label:"🌀 SHM" },
              { key:"coupled",   label:"🔗 Coupled" },
              { key:"pendulum",  label:"🕰 Pendulum" },
              { key:"collision", label:"💥 Collision" },
            ].map(p => (
              <button key={p.key} onClick={() => loadPreset(p.key)} disabled={!canEdit} style={{
                background: canEdit ? "#1E3A8A" : "#1E293B",
                color: canEdit ? "white" : "#475569",
                border:"none", borderRadius:8, padding:"6px 12px",
                fontSize:12, cursor: canEdit ? "pointer" : "not-allowed", fontWeight:500,
              }}>{p.label}</button>
            ))}
            {isLocked && isStudent && (
              <span style={{ color:"#EF4444", fontSize:11, marginLeft:4 }}>
                Room locked — view only
              </span>
            )}
          </div>

          {/* Canvas */}
          <div ref={sceneRef} style={{ borderRadius:12, overflow:"hidden", border:"1px solid #1E293B" }} />

          {/* Energy chart */}
          <Panel>
            <SectionTitle>Energy Conservation — Tracked Body</SectionTitle>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={graphData} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="t"  tick={{ fill:"#475569", fontSize:10 }} />
                <YAxis             tick={{ fill:"#475569", fontSize:10 }} />
                <Tooltip contentStyle={{ background:"#0F172A", border:"1px solid #1E293B", fontSize:11 }} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                <Line type="monotone" dataKey="vel" stroke="#22C55E" dot={false} strokeWidth={1.5} name="Velocity" />
                <Line type="monotone" dataKey="ke"  stroke="#F59E0B" dot={false} strokeWidth={1.5} name="KE" />
                <Line type="monotone" dataKey="pe"  stroke="#38BDF8" dot={false} strokeWidth={1.5} name="PE" />
                <Line type="monotone" dataKey="tot" stroke="#A78BFA" dot={false} strokeWidth={2} strokeDasharray="5 3" name="Total E" />
              </LineChart>
            </ResponsiveContainer>
            <p style={{ color:"#475569", fontSize:11, margin:"4px 0 0", fontStyle:"italic" }}>
              Total E (purple dashed) stays roughly constant → conservation of energy
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
