import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * usePhysics HOOK
 *
 * This hook is the bridge between:
 *   - The Physics Web Worker (simulation logic)
 *   - The React Canvas component (rendering)
 *   - The Socket layer (real-time sync)
 *
 * It provides:
 *   - workerRef: reference to the physics worker
 *   - canvasRef: reference to the HTML5 canvas element
 *   - bodies: current array of body positions (for rendering)
 *   - addBody, removeBody, moveBody: physics manipulation functions
 *   - start, pause, reset: simulation controls
 *   - analyticsData: live energy/force data for the dashboard
 *
 * RENDERING PIPELINE:
 *   Worker sends FRAME message → usePhysics updates bodies state
 *   → requestAnimationFrame → Canvas draws bodies
 *
 * This hook deliberately does NOT know about sockets — that's the
 * job of the useRoomSync hook which wraps this one.
 */

export function usePhysics({ canvasRef, initialState, onAnalyticsTick }) {
  const workerRef = useRef(null);
  const animFrameRef = useRef(null);
  const [bodies, setBodies] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  const bodiesRef = useRef([]); // ref version for RAF closure

  // ── Initialize Worker ──────────────────────────────────────────────────────
  useEffect(() => {
    // Create worker from file (CRA supports this via URL constructor)
    const worker = new Worker(new URL('../workers/physicsWorker.js', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, payload } = e.data;

      switch (type) {
        case 'READY':
          setIsWorkerReady(true);
          break;

        case 'FRAME':
          // Update ref immediately (no re-render) for smooth RAF rendering
          bodiesRef.current = payload.bodies;
          // Update state for React components that need body data
          setBodies(payload.bodies);
          break;

        case 'ANALYTICS':
          const dataPoint = {
            tick: payload.tick,
            timestamp: Date.now(),
            bodies: payload.bodies,
            // Aggregate totals
            totalKE: payload.bodies.reduce((s, b) => s + b.kineticEnergy, 0),
            totalPE: payload.bodies.reduce((s, b) => s + b.potentialEnergy, 0),
          };
          setAnalyticsData(prev => [...prev.slice(-200), dataPoint]); // keep last 200
          onAnalyticsTick?.(dataPoint);
          break;

        case 'RESET_DONE':
          setBodies([]);
          setConstraints([]);
          setAnalyticsData([]);
          setIsRunning(false);
          break;

        default:
          break;
      }
    };

    // Initialize worker with the starting physics state
    worker.postMessage({
      type: 'INIT',
      payload: {
        physicsState: initialState || { bodies: [], constraints: [] },
        gravity: initialState?.gravity || { x: 0, y: 1 },
      },
    });

    return () => {
      worker.terminate();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []); // only once on mount

  // ── Canvas Render Loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function renderFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw bodies from latest worker frame
      for (const body of bodiesRef.current) {
        drawBody(ctx, body);
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasRef]);

  // ── Body drawing ───────────────────────────────────────────────────────────
  function drawBody(ctx, body) {
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(body.angle);

    ctx.fillStyle = body.fillStyle || '#4ECDC4';
    ctx.strokeStyle = body.strokeStyle || '#ffffff';
    ctx.lineWidth = 2;

    // For simplicity, draw all bodies as circles with id label
    // In full impl, you'd branch on body.type
    ctx.beginPath();
    ctx.arc(0, 0, body.radius || 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw velocity vector arrow
    if (body.speed > 1) {
      ctx.strokeStyle = 'rgba(255,255,0,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(body.vx * 5, body.vy * 5);
      ctx.stroke();
      // Arrowhead
      const angle = Math.atan2(body.vy, body.vx);
      ctx.beginPath();
      ctx.moveTo(body.vx * 5, body.vy * 5);
      ctx.lineTo(
        body.vx * 5 - 8 * Math.cos(angle - 0.4),
        body.vy * 5 - 8 * Math.sin(angle - 0.4)
      );
      ctx.lineTo(
        body.vx * 5 - 8 * Math.cos(angle + 0.4),
        body.vy * 5 - 8 * Math.sin(angle + 0.4)
      );
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,0,0.8)';
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const sendToWorker = useCallback((type, payload) => {
    workerRef.current?.postMessage({ type, payload });
  }, []);

  const addBody = useCallback((bodySpec) => {
    sendToWorker('ADD_BODY', { body: bodySpec });
  }, [sendToWorker]);

  const removeBody = useCallback((bodyId) => {
    sendToWorker('REMOVE_BODY', { bodyId });
  }, [sendToWorker]);

  const moveBody = useCallback((bodyId, x, y) => {
    sendToWorker('MOVE_BODY', { bodyId, x, y });
  }, [sendToWorker]);

  const addConstraint = useCallback((constraintSpec) => {
    sendToWorker('ADD_CONSTRAINT', { constraint: constraintSpec });
  }, [sendToWorker]);

  const setGravity = useCallback((x, y) => {
    sendToWorker('SET_GRAVITY', { x, y });
  }, [sendToWorker]);

  const start = useCallback(() => {
    sendToWorker('START');
    setIsRunning(true);
  }, [sendToWorker]);

  const pause = useCallback(() => {
    sendToWorker('PAUSE');
    setIsRunning(false);
  }, [sendToWorker]);

  const reset = useCallback(() => {
    sendToWorker('RESET');
  }, [sendToWorker]);

  const stepOnce = useCallback(() => {
    sendToWorker('TICK_STEP');
  }, [sendToWorker]);

  const triggerChaos = useCallback((type, params) => {
    sendToWorker('CHAOS_EVENT', { type, params });
  }, [sendToWorker]);

  // Capture current canvas state as base64 (for thumbnails/submissions)
  const captureSnapshot = useCallback(() => {
    return canvasRef.current?.toDataURL('image/png');
  }, [canvasRef]);

  return {
    bodies, constraints, isRunning, isWorkerReady, analyticsData,
    addBody, removeBody, moveBody, addConstraint, setGravity,
    start, pause, reset, stepOnce, triggerChaos, captureSnapshot,
    workerRef,
  };
}
